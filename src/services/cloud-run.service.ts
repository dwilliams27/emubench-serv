import { ContainerInstance, TestConfig } from '@/types/session';
import { ServicesClient } from '@google-cloud/run';
import { google } from '@google-cloud/run/build/protos/protos';

type IService = google.cloud.run.v2.IService;

const serviceAccount = "emubench-cloudrun";
const region = "us-central1";

export interface ContainerConfig {
  image: string;
  name?: string;
  env?: Array<{ name: string; value: string }>;
  resources?: {
    limits?: {
      cpu?: string;
      memory?: string;
    };
  };
  ports?: Array<{ containerPort: number }>;
  command?: string[];
  args?: string[];
}

export interface ServiceConfig {
  name: string;
  region: string;
  containers: ContainerConfig[];
  maxInstances?: number;
  minInstances?: number;
  labels?: { [key: string]: string };
  timeout?: number;
  serviceAccount?: string;
}

export class CloudRunService {
  private servicesClient: ServicesClient;
  private projectId: string;

  constructor(projectId?: string) {
    if (!projectId) {
      throw new Error('Could not find project ID');
    }
    this.projectId = projectId;
    this.servicesClient = new ServicesClient();
  }

  async createService(config: ServiceConfig): Promise<IService> {
    const parent = `projects/${this.projectId}/locations/${config.region}`;
    
    const service: IService = {
      name: `${parent}/services/${config.name}`,
      template: {
        containers: config.containers,
        maxInstanceRequestConcurrency: 1000,
        scaling: {
          maxInstanceCount: config.maxInstances || 100,
          minInstanceCount: config.minInstances || 0,
        },
        serviceAccount: config.serviceAccount,
      },
      labels: config.labels,
    };

    const request = {
      parent,
      service,
      serviceId: config.name,
    };

    try {
      const [operation] = await this.servicesClient.createService(request);
      
      // Wait for the operation to complete
      const [response] = await operation.promise();
      
      console.log(`Service ${config.name} created successfully`);
      return response;
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  }

  async updateService(config: Partial<ServiceConfig> & { name: string; region: string }): Promise<IService> {
    const serviceName = `projects/${this.projectId}/locations/${config.region}/services/${config.name}`;
    const [currentService] = await this.servicesClient.getService({ name: serviceName });
    const updatedService: IService = {
      ...currentService,
      template: {
        ...currentService.template,
        containers: config.containers || currentService.template?.containers,
        scaling: {
          maxInstanceCount: config.maxInstances || currentService.template?.scaling?.maxInstanceCount,
          minInstanceCount: config.minInstances || currentService.template?.scaling?.minInstanceCount,
        },
        serviceAccount: config.serviceAccount || currentService.template?.serviceAccount,
      },
      labels: config.labels || currentService.labels,
    };

    const request = {
      service: updatedService,
    };

    try {
      const [operation] = await this.servicesClient.updateService(request);
      const [response] = await operation.promise();
      
      console.log(`Service ${config.name} updated successfully`);
      return response;
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  }

  async deleteService(name: string, region: string): Promise<void> {
    const serviceName = `projects/${this.projectId}/locations/${region}/services/${name}`;
    
    try {
      const [operation] = await this.servicesClient.deleteService({ name: serviceName });
      await operation.promise();
      
      console.log(`Service ${name} deleted successfully`);
    } catch (error) {
      console.error('Error deleting service:', error);
      throw error;
    }
  }

  async listServices(): Promise<IService[]> {
    const parent = `projects/${this.projectId}/locations/${region}`;
    const services: IService[] = [];
    
    try {
      const iterable = await this.servicesClient.listServicesAsync({ parent });
      
      for await (const service of iterable) {
        services.push(service);
      }
      
      return services;
    } catch (error) {
      console.error('Error listing services:', error);
      throw error;
    }
  }

  async deployGameContainer(
    testId: string,
    testConfig: TestConfig
  ): Promise<ContainerInstance> {
    const config: ServiceConfig = {
      name: testId,
      region,
      containers: [{
        image: `gcr.io/${this.projectId}/emubench-${testConfig.gameId}:latest`,
        // TODO: Memwatch
        // env: options?.env,
        ports: [{ containerPort: 58111 }],
      }],
      serviceAccount,
      maxInstances: 1,
      minInstances: 1,
    };

    const service = await this.createService(config);
    if (!service.uri) {
      throw new Error('Service URI is undefined');
    }

    const containerInstance: ContainerInstance = {
      id: testId,
      url: service.uri,
      status: 'starting',
      createdAt: new Date()
    }

    return containerInstance;
  }

  async getServiceUrl(name: string, region: string): Promise<string | null | undefined> {
    const serviceName = `projects/${this.projectId}/locations/${region}/services/${name}`;
    
    try {
      const [service] = await this.servicesClient.getService({ name: serviceName });
      return service.uri;
    } catch (error) {
      console.error('Error getting service URL:', error);
      throw error;
    }
  }
}

const cloudRunService = new CloudRunService(process.env.PROJECT_ID);

export { cloudRunService };
