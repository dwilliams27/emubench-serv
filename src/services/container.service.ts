import { TestConfig } from '@/types/session';
import { protos, ServicesClient } from '@google-cloud/run';
import axios from 'axios';

export class ContainerService {
  client = new ServicesClient();

  async deployCloudRunService(testId: string, testConfig: TestConfig, gAuthToken: string) {
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
            ports: [{ containerPort: 58111 }],
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
        ingress: 'INGRESS_TRAFFIC_INTERNAL_ONLY'
      }
    };

    const [operation] = await this.client.createService(request);
    const [service] = await operation.promise();

    console.log(`Service ${testId} deployed at ${service.uri}`);
    try {
      const response = await axios.get(`${service.uri}/`, {
        headers: {
          'Authorization': `Bearer ${gAuthToken}`,
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
          'Authorization': `Bearer ${gAuthToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`Memwatch get successful for service ${testId}: ${response.data}`);
    } catch (error) {
      console.error(`Memwatch get failed for service ${testId}: ${(error as any).message}`);
    }

    return service;
  }
}

const containerService = new ContainerService();

export { containerService };
