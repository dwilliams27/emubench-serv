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
      console.log(`Initializing ContainerManagerService in ${process.env.NODE_ENV || 'unknown'} environment`);
      
      if (process.env.NODE_ENV === 'development') {
        // Development: use local kubeconfig
        console.log('Loading kubeconfig from default location');
        kc.loadFromDefault();
      } else {
        // Production (Cloud Run): authenticate with GKE using service account
        console.log('Initializing Cloud Run kubeconfig');
        await this.initializeCloudRunKubeConfig(kc);
      }
      
      // Verify the configuration is valid
      const currentContext = kc.getCurrentContext();
      if (!currentContext) {
        throw new Error('No current context found in kubeconfig');
      }
      
      const currentCluster = kc.getCurrentCluster();
      console.log(`Using Kubernetes context: ${currentContext}`);
      console.log(`Server URL: ${currentCluster?.server}`);
      console.log(`Cluster name: ${currentCluster?.name}`);
      console.log(`Skip TLS verify: ${currentCluster?.skipTLSVerify}`);
      console.log(`Target namespace: ${this.namespace}`);
      
      this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
      this.initialized = true;
      console.log('Kubernetes client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Kubernetes client:', error);
      
      // Log environment variables for debugging (without sensitive data)
      console.error('Environment context:', {
        NODE_ENV: process.env.NODE_ENV,
        hasProjectId: !!process.env.PROJECT_ID,
        hasClusterName: !!process.env.GKE_CLUSTER_NAME,
        hasClusterLocation: !!process.env.GKE_CLUSTER_LOCATION,
        namespace: this.namespace
      });
      
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

    console.log(`Initializing kubeconfig for cluster: ${clusterName} in ${clusterLocation}`);

    try {
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      const authClient = await auth.getClient();
      const accessToken = await authClient.getAccessToken();

      if (!accessToken.token) {
        throw new Error('Failed to get access token');
      }

      console.log('Successfully obtained access token');

      const clusterUrl = `https://container.googleapis.com/v1/projects/${projectId}/locations/${clusterLocation}/clusters/${clusterName}`;
      console.log(`Fetching cluster info from: ${clusterUrl}`);
      
      const response = await fetch(clusterUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Cluster API response error: ${response.status} ${response.statusText}`);
        console.error(`Error details: ${errorText}`);
        throw new Error(`Failed to get cluster info: ${response.status} ${response.statusText}`);
      }

      const cluster = await response.json();
      console.log(`Cluster endpoint: ${cluster.endpoint}`);
      
      if (!cluster.endpoint || !cluster.masterAuth?.clusterCaCertificate) {
        console.error('Missing cluster data:', {
          hasEndpoint: !!cluster.endpoint,
          hasCaCert: !!cluster.masterAuth?.clusterCaCertificate,
          clusterStatus: cluster.status
        });
        throw new Error('Unable to get cluster endpoint or CA certificate');
      }
      
      const serverUrl = `https://${cluster.endpoint}`;
      console.log(`Using private endpoint: ${serverUrl}`);
      console.log(`Setting up kubeconfig with server: ${serverUrl}`);

      kc.loadFromOptions({
        clusters: [
          {
            name: clusterName,
            server: serverUrl,
            certificateAuthorityData: cluster.masterAuth.clusterCaCertificate,
            skipTLSVerify: true,
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
      
      // Test the connection
      console.log('Testing Kubernetes API connection...');
      const testApi = kc.makeApiClient(k8s.CoreV1Api);
      try {
        await testApi.listNamespacedPod({ namespace: this.namespace, limit: 1 });
        console.log('Kubernetes API connection test successful');
      } catch (testError) {
        console.error('Kubernetes API connection test failed:', testError);        
        throw testError;
      }
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
        },
        annotations: {
          'gke-gcsfuse/volumes': 'true',
          'gke-gcsfuse/cpu-limit': '250m',
          'gke-gcsfuse/memory-limit': '256Mi',
          'gke-gcsfuse/ephemeral-storage-limit': '1Gi'
        }
      },
      spec: {
        tolerations: [{
          key: 'architecture',
          operator: 'Equal',
          value: 'arm64',
          effect: 'NoSchedule'
        }, {
          key: 'kubernetes.io/arch',
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
          resources: {
            requests: {
              cpu: '500m',
              memory: '1Gi'
            },
            limits: {
              cpu: '2',
              memory: '4Gi'
            }
          },
          volumeMounts: [{
            name: 'screenshots-storage',
            mountPath: '/app/emu/ScreenShots'
          }]
        }],
        volumes: [{
          name: 'screenshots-storage',
          csi: {
            driver: 'gcsfuse.csi.storage.gke.io',
            volumeAttributes: {
              bucketName: 'emubench-sessions',
              mountOptions: 'implicit-dirs'
            }
          }
        }],
        serviceAccountName: process.env.EMUBENCH_SERVICE_ACCOUNT || 'emubench-container-manager-sa',
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
