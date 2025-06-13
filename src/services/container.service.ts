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
              { name: "SAVE_STATE_FILE", value: testConfig.startStateFilename },
              { name: "MEMWATCHES", value: testConfig.contextMemWatches ? JSON.stringify({ watches: testConfig.contextMemWatches }) : '{}' },
              { name: "SESSION_ID", value: testId },
            ],
            resources: {
              limits: {
                cpu: '2',
                memory: '4Gi'
              }
            }
          }],
          scaling: {
            minInstanceCount: 0,
            maxInstanceCount: 5
          }
        },
        ingress: 'INGRESS_TRAFFIC_INTERNAL_ONLY'
      }
    };

    const [operation] = await this.client.createService(request);
    const [service] = await operation.promise();

    console.log(`Service ${testId} deployed at ${service.uri}`);
    const healthCheckUrl = `${service.uri}:58111/`;
    try {
      const response = await axios.get(healthCheckUrl, {
        headers: {
          'Authorization': `Bearer ${gAuthToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`Health check successful for service ${testId}`);
    } catch (error) {
      console.error(`Health check failed for service ${testId}:`, error);
      throw new Error(`Failed to deploy service ${testId}: ${error}`);
    }

    return service;
  }
}

const containerService = new ContainerService();

export { containerService };
