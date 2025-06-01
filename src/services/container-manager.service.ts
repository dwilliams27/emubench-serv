import { ContainerInstance, TestConfig } from '@/types/session';
import * as k8s from '@kubernetes/client-node';
import { GoogleAuth } from 'google-auth-library';

export class ContainerManagerService {
  private k8sApi!: k8s.CoreV1Api;
  private namespace: string = process.env.EMUBENCH_NAMESPACE || 'default';
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    const kc = new k8s.KubeConfig();
    try {
      if (process.env.NODE_ENV === 'development') {
        // Development: use local kubeconfig
        kc.loadFromDefault();
      } else {
        // Production (Cloud Run): authenticate with GKE using service account
        await this.initializeCloudRunKubeConfig(kc);
      }
      
      // Verify the configuration is valid
      const currentContext = kc.getCurrentContext();
      if (!currentContext) {
        throw new Error('No current context found in kubeconfig');
      }
      
      console.log(`Using Kubernetes context: ${currentContext}`);
      console.log(`Server URL: ${kc.getCurrentCluster()?.server}`);
      
      this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
      this.initialized = true;
      console.log('Kubernetes client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Kubernetes client:', error);
      throw error;
    }
  }

  private async ensureInitialized() {
    while (!this.initialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async initializeCloudRunKubeConfig(kc: k8s.KubeConfig) {
    if (!process.env.GKE_CLUSTER_NAME || !process.env.GKE_CLUSTER_LOCATION || !process.env.PROJECT_ID) {
      throw new Error('Missing required environment variables: GKE_CLUSTER_NAME, GKE_CLUSTER_LOCATION, PROJECT_ID');
    }

    const projectId = process.env.PROJECT_ID;
    const clusterName = process.env.GKE_CLUSTER_NAME;
    const clusterLocation = process.env.GKE_CLUSTER_LOCATION;

    try {
      // Use Google Cloud APIs to get cluster info
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      // Get an auth client and access token
      const authClient = await auth.getClient();
      const accessToken = await authClient.getAccessToken();

      if (!accessToken.token) {
        throw new Error('Failed to get access token');
      }

      // Get cluster information using REST API
      const clusterUrl = `https://container.googleapis.com/v1/projects/${projectId}/locations/${clusterLocation}/clusters/${clusterName}`;
      const response = await fetch(clusterUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get cluster info: ${response.status} ${response.statusText}`);
      }

      const cluster = await response.json();
      if (!cluster.endpoint || !cluster.masterAuth?.clusterCaCertificate) {
        throw new Error('Unable to get cluster endpoint or CA certificate');
      }

      kc.loadFromOptions({
        clusters: [
          {
            name: clusterName,
            server: `https://${cluster.endpoint}`,
            certificateAuthorityData: cluster.masterAuth.clusterCaCertificate,
          }
        ],
        users: [
          {
            name: 'gcp-user',
            token: accessToken.token,
          }
        ],
        contexts: [
          {
            name: 'gcp-context',
            cluster: clusterName,
            user: 'gcp-user',
          }
        ],
        currentContext: 'gcp-context',
      });

      console.log(`Successfully configured kubeconfig for cluster: ${clusterName}`);
    } catch (error) {
      console.error('Failed to configure kubeconfig for Cloud Run:', error);
      throw error;
    }
  }

  async createContainer(
    testId: string,
    testConfig: TestConfig
  ): Promise<ContainerInstance> {
    await this.ensureInitialized();
    
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
          env: [
            { name: "SAVE_STATE_FILE", value: testConfig.startStateFilename },
            { name: "MEMWATCHES", value: testConfig.contextMemWatches ? JSON.stringify({ watches: testConfig.contextMemWatches }) : '{}' },
            { name: "SESSION_ID", value: testId },
          ],
          ports: [{ containerPort: 58111 }],
          volumeMounts: [{
            name: 'screenshots-storage',
            mountPath: '/app/emu/ScreenShots'
          }]
        }],
        volumes: [{
          name: 'screenshots-storage',
          csi: {
            driver: 'gcs.csi.storage.gke.io',
            volumeAttributes: {
              bucketName: 'emubench-sessions',
              mountOptions: 'implicit-dirs'
            }
          }
        }],
        serviceAccountName: process.env.EMUBENCH_SERVICE_ACCOUNT || 'default',
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
    await this.ensureInitialized();
    
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
    await this.ensureInitialized();
    await this.k8sApi.deleteNamespacedPod({ name: containerName, namespace: this.namespace });
  }

  async getContainerIP(containerName: string): Promise<string | null> {
    await this.ensureInitialized();
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
