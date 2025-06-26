import { gcpService } from '@/services/gcp.service';
import { EmuTestConfig, SESSION_FUSE_PATH } from '@/types/session';
import { protos } from '@google-cloud/run';
import axios from 'axios';
import { GoogleAuth } from "google-auth-library";

export class ContainerService {
  // TODO: Probably make async job
  async deployGame(testId: string, testConfig: EmuTestConfig) {
    const location = 'us-central1';
    
    const request: protos.google.cloud.run.v2.ICreateServiceRequest = {
      parent: `projects/${process.env.PROJECT_ID}/locations/${location}`,
      serviceId: `${testId}-game`,
      service: {
        template: {
          serviceAccount: `emubench-cloud-run-sa@${process.env.PROJECT_ID}.iam.gserviceaccount.com`,
          executionEnvironment: 'EXECUTION_ENVIRONMENT_GEN2',
          containers: [{
            image: `gcr.io/${process.env.PROJECT_ID}/emubench-${testConfig.platform}-${testConfig.gameId.toLowerCase()}:latest`,
            ports: [{ containerPort: 8080 }],
            env: [
              { name: "DOLPHIN_EMU_USERPATH", value: `${SESSION_FUSE_PATH}/${testId}` },
              { name: "SAVE_STATE_FILE", value: testConfig.startStateFilename },
              { name: "MEMWATCHES", value: JSON.stringify({ contextMemWatches: testConfig.contextMemWatches || {}, endStateMemWatches: testConfig.endStateMemWatches || {} }) },
              { name: "SESSION_ID", value: testId },
              { name: "MODE", value: testConfig.mode },
            ],
            resources: {
              limits: {
                cpu: '2',
                memory: '4Gi'
              }
            },
            volumeMounts: [{
              name: `session-mount`,
              mountPath: SESSION_FUSE_PATH,
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

  async destroyGame(serviceName: string) {
    try {
      await gcpService.deleteService(serviceName);
      console.log(`Service ${serviceName} deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete service ${serviceName}: ${(error as any).message}`);
    }
  }

  async runAgent(testId: string, mcpSessionId: string, authToken: string) {
    await gcpService.runJob(`${SESSION_FUSE_PATH}/${testId}`, authToken, mcpSessionId);
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
