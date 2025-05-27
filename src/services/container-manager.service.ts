import { ContainerInstance, TestConfig } from '@/types/session';
import * as k8s from '@kubernetes/client-node';

export class ContainerManagerService {
  private k8sApi: k8s.CoreV1Api;
  private namespace: string = 'default';

  constructor() {
    const kc = new k8s.KubeConfig();
    try {
      if (process.env.NODE_ENV === 'development') {
        kc.loadFromDefault();
      } else {
        kc.loadFromCluster();
      }
      
      // Verify the configuration is valid
      const currentContext = kc.getCurrentContext();
      if (!currentContext) {
        throw new Error('No current context found in kubeconfig');
      }
      
      console.log(`Using Kubernetes context: ${currentContext}`);
      console.log(`Server URL: ${kc.getCurrentCluster()?.server}`);
      
      this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    } catch (error) {
      console.error('Failed to initialize Kubernetes client:', error);
      throw error;
    }
  }

  async createContainer(
    testId: string,
    testConfig: TestConfig
  ): Promise<ContainerInstance> {
    const pod: k8s.V1Pod = {
      metadata: {
        name: testId,
        labels: {
          'created-by': 'emubench-serv',
          'app': testId
        }
      },
      spec: {
        tolerations: [{
          key: 'architecture',
          operator: 'Equal',
          value: 'arm64',
          effect: 'NoSchedule'
        }],
        nodeSelector: {
          architecture: 'arm64'
        },
        containers: [{
          name: 'container',
          image: `gcr.io/emubench-459802/emubench-${testConfig.platform}-${testConfig.gameId.toLowerCase()}:latest`,
          imagePullPolicy: process.env.NODE_ENV === 'development' ? 'IfNotPresent' : 'Always',
          env: [{ name: "SAVE_STATE_FILE", value: testConfig.startStateFilename }],
          ports: [{ containerPort: 58111 }]
        }]
      }
    };

    const response = await this.k8sApi.createNamespacedPod({ namespace: this.namespace, body: pod });
    const podIP = await this.waitForPodReady(testId);

    return {
      id: testId,
      url: `http://${podIP}:58111`,
      status: 'starting',
      createdAt: new Date(),
    };
  }

  async waitForPodReady(podName: string): Promise<string> {
    while (true) {
      const response = await this.k8sApi.readNamespacedPod({ name: podName, namespace: this.namespace });
      const pod = response;
      
      if (pod.status?.phase === 'Running' && pod.status.podIP) {
        return pod.status.podIP;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async deleteContainer(containerName: string): Promise<void> {
    await this.k8sApi.deleteNamespacedPod({ name: containerName, namespace: this.namespace });
  }

  async getContainerIP(containerName: string): Promise<string | null> {
    try {
      const response = await this.k8sApi.readNamespacedPod({ name: containerName, namespace: this.namespace });
      return response.status?.podIP || null;
    } catch (error) {
      return null;
    }
  }
}

const containerManagerService = new ContainerManagerService();

export { containerManagerService };
