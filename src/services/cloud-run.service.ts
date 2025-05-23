// src/services/cloudRunService.ts
import { CloudRunClient } from '@google-cloud/run';
import { GoogleAuth } from 'google-auth-library';

interface ContainerInstance {
  id: string;
  url: string;
  status: 'starting' | 'running' | 'stopped';
  createdAt: Date;
  lastActivity: Date;
}

export class CloudRunService {
  private client: CloudRunClient;
  private auth: GoogleAuth;
  private projectId: string;
  private region: string;
  private containers: Record<string, ContainerInstance> = {};

  constructor(projectId: string | undefined, region = 'us-central1') {
    if (!projectId) {
      throw new Error("No project ID found!!")
    }
    this.client = new CloudRunClient();
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    this.projectId = projectId;
    this.region = region;
  }

  async createContainer(testId: string): Promise<ContainerInstance> {
    // Unique name for each container based on session
    const containerName = `emubench-instance-${testId}`;
    
    // Cloud Run service creation request
    const [operation] = await this.client.createService({
      parent: `projects/${this.projectId}/locations/${this.region}`,
      service: {
        apiVersion: 'serving.knative.dev/v1',
        kind: 'Service',
        metadata: {
          name: containerName,
          namespace: this.projectId,
        },
        spec: {
          template: {
            metadata: {
              annotations: {
                'autoscaling.knative.dev/maxScale': '1',
              },
            },
            spec: {
              containers: [{
                image: `gcr.io/${this.projectId}/emubench-serv`,
                ports: [{ containerPort: 3000 }],
                env: [
                  { name: 'SESSION_ID', value: testId },
                  // Add other environment variables as needed
                ],
                resources: {
                  limits: {
                    cpu: '1',
                    memory: '512Mi',
                  },
                },
              }],
            },
          },
        },
      },
    });

    // Wait for the operation to complete
    const [service] = await operation.promise();
    const url = service.status.url;

    // Store container reference
    const container: ContainerInstance = {
      id: containerName,
      url: url,
      status: 'running',
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.containers[sessionId] = container;
    return container;
  }

  async deleteContainer(sessionId: string): Promise<void> {
    const container = this.containers[sessionId];
    if (!container) {
      throw new Error(`Container for session ${sessionId} not found`);
    }

    // Delete the Cloud Run service
    const [operation] = await this.client.deleteService({
      name: `projects/${this.projectId}/locations/${this.region}/services/${container.id}`,
    });

    // Wait for the operation to complete
    await operation.promise();

    // Remove from tracking
    delete this.containers[sessionId];
  }

  getContainer(sessionId: string): ContainerInstance | undefined {
    return this.containers[sessionId];
  }

  getAllContainers(): Record<string, ContainerInstance> {
    return this.containers;
  }

  // Utility to clean up idle containers
  async cleanupIdleContainers(maxIdleTimeMinutes = 15): Promise<void> {
    const now = new Date();
    for (const [sessionId, container] of Object.entries(this.containers)) {
      const idleTime = (now.getTime() - container.lastActivity.getTime()) / (1000 * 60);
      if (idleTime > maxIdleTimeMinutes) {
        await this.deleteContainer(sessionId);
      }
    }
  }
}

const cloudRunService = new CloudRunService(process.env.PROJECT_ID);

export { cloudRunService };
