import { gcpService } from '@/services/gcp.service';
import { EmuTestConfig } from '@/types/session';
import { protos, ServicesClient } from '@google-cloud/run';
import axios from 'axios';
import { GoogleAuth } from "google-auth-library";

export class ContainerService {
  async deployCloudRunService(testId: string, testConfig: EmuTestConfig) {
    const location = 'us-central1';
    
    const request: protos.google.cloud.run.v2.ICreateServiceRequest = {
      parent: `projects/${process.env.PROJECT_ID}/locations/${location}`,
      serviceId: testId,
      service: {
        template: {
          serviceAccount: `emubench-cloud-run-sa@${process.env.PROJECT_ID}.iam.gserviceaccount.com`,
          executionEnvironment: 'EXECUTION_ENVIRONMENT_GEN2',
          containers: [{
            image: `gcr.io/${process.env.PROJECT_ID}/emubench-${testConfig.platform}-${testConfig.gameId.toLowerCase()}:latest`,
            ports: [{ containerPort: 8080 }],
            env: [
              { name: "DOLPHIN_EMU_USERPATH", value: `/tmp/gcs/emubench-sessions/${testId}` },
              { name: "SAVE_STATE_FILE", value: testConfig.startStateFilename },
              { name: "MEMWATCHES", value: testConfig.contextMemWatches ? JSON.stringify({ watches: testConfig.contextMemWatches }) : '{}' },
              { name: "SESSION_ID", value: testId },
            ],
            resources: {
              limits: {
                cpu: '2',
                memory: '4Gi'
              }
            },
            volumeMounts: [{
              name: `session-mount`,
              mountPath: `/tmp/gcs/emubench-sessions`,
            }]
          }],
          volumes: [{
            name: 'session-mount',
            gcs: {
              bucket: 'emubench-sessions',
              readOnly: false
            }
          }],
          scaling: {
            minInstanceCount: 1,
            maxInstanceCount: 1
          }
        },
        ingress: 'INGRESS_TRAFFIC_ALL',
      }
    };

    const service = await gcpService.createService(request);

    await this.grantInvokePermission(testId, location);
    const identityToken = await this.getIdentityToken(service.uri!);

    console.log(`Service ${testId} deployed at ${service.uri}`);
    try {
      const response = await axios.get(`${service.uri}/`, {
        headers: {
          'Authorization': `Bearer ${identityToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`Health check successful for service ${testId}: ${response.data}`);
    } catch (error) {
      console.error(`Health check failed for service ${testId}: ${(error as any).message}`);
    }

    try {
      const response = await axios.get(`${service.uri}/api/memwatch/values?names=test_game_id`, {
        headers: {
          'Authorization': `Bearer ${identityToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`Memwatch get successful for service ${testId}: ${response.data}`);
    } catch (error) {
      console.error(`Memwatch get failed for service ${testId}: ${(error as any).message}`);
    }

    return { identityToken, service };
  }

  private async grantInvokePermission(serviceId: string, location: string) {
    try {
      const policy = await gcpService.getIamPolicy(`projects/${process.env.PROJECT_ID}/locations/${location}/services/${serviceId}`);

      const binding = {
        role: 'roles/run.invoker',
        members: [`serviceAccount:emubench-cloud-run-sa@${process.env.PROJECT_ID}.iam.gserviceaccount.com`]
      };

      if (!policy[0].bindings) {
        policy[0].bindings = [];
      }
      policy[0].bindings.push(binding);

      await gcpService.setIamPolicy({
        resource: `projects/${process.env.PROJECT_ID}/locations/${location}/services/${serviceId}`,
        policy: policy[0]
      });

      console.log(`Granted invoke permission for service ${serviceId}`);
    } catch (error) {
      console.error(`Failed to grant invoke permission for service ${serviceId}:`, error);
    }
  }

  private async getIdentityToken(targetUrl: string): Promise<string> {
    const auth = new GoogleAuth();
    
    const client = await auth.getIdTokenClient(targetUrl);
    const idToken = await client.idTokenProvider.fetchIdToken(targetUrl);
    
    return idToken;
  }
}

const containerService = new ContainerService();

export { containerService };
