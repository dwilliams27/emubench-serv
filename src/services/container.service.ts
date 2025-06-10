import { TestConfig } from '@/types/session';
import { protos, ServicesClient } from '@google-cloud/run';

export class ContainerService {
  client = new ServicesClient();

  async deployCloudRunService(testId: string, testConfig: TestConfig) {
    const location = 'us-central1';
    
    const request: protos.google.cloud.run.v2.ICreateServiceRequest = {
      parent: `projects/${process.env.PROJECT_ID}/locations/${location}`,
      serviceId: testId,
      service: {
        template: {
          containers: [{
            image: `gcr.io/emubench-459802/emubench-${testConfig.platform}-${testConfig.gameId.toLowerCase()}:latest`,
            ports: [{ containerPort: 8080 }]
          }]
        }
      }
    };

    const [operation] = await this.client.createService(request);
    const [service] = await operation.promise();
    return service;
  }
}

const containerService = new ContainerService();

export { containerService };
