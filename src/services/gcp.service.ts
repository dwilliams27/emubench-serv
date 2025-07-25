import { JobsClient, protos, ServicesClient } from "@google-cloud/run";
import { Storage } from "@google-cloud/storage";
import { GoogleAuth } from "google-auth-library";

export class GcpService {
  private servicesClient = new ServicesClient();
  private jobClient = new JobsClient();
  private storage = new Storage();
  private auth = new GoogleAuth();
  private signedUrlCache: Record<string, string> = {};

  async getIdentityToken(targetUrl: string): Promise<string> {
    const servicesClient = await this.auth.getIdTokenClient(targetUrl);
    const idToken = await servicesClient.idTokenProvider.fetchIdToken(targetUrl);
    
    return idToken;
  }

  async createService(request: protos.google.cloud.run.v2.ICreateServiceRequest): Promise<protos.google.cloud.run.v2.IService> {
    const [operation] = await this.servicesClient.createService(request);
    const [service] = await operation.promise();
    return service;
  }

  async deleteService(name: string): Promise<void> {
    const [operation] = await this.servicesClient.deleteService({ name });
    await operation.promise();
  }

  async runJob(testPath: string, testId: string, authToken: string): Promise<boolean> {
    await this.jobClient.runJob({
      name: `projects/${process.env.PROJECT_ID}/locations/us-central1/jobs/emubench-agent-job`,
      overrides: {
        containerOverrides: [{
          env: [
            {
              name: 'TEST_PATH',
              value: testPath
            },
            {
              name: 'TEST_ID',
              value: testId
            },
            {
              name: 'AUTH_TOKEN',
              value: authToken
            },
            {
              name: 'OPENAI_API_KEY',
              value: process.env.OPENAI_API_KEY
            },
            {
              name: 'ANTHROPIC_API_KEY',
              value: process.env.ANTHROPIC_API_KEY
            },
            {
              name: 'GOOGLE_GENERATIVE_AI_API_KEY',
              value: process.env.GOOGLE_GENERATIVE_AI_API_KEY
            }
          ]
        }]
      }
    });
    return true;
  }

  async getIamPolicy(resource: string): Promise<[protos.google.iam.v1.IPolicy, protos.google.iam.v1.IGetIamPolicyRequest | undefined, {} | undefined]> {
    const policy = await this.servicesClient.getIamPolicy({
      resource
    });
    return policy;
  }

  async setIamPolicy(request: protos.google.iam.v1.ISetIamPolicyRequest) {
    await this.servicesClient.setIamPolicy(request);
  }

  async getSignedURL(bucketName: string, filePath: string) {
    if (this.signedUrlCache[`${bucketName}${filePath}`]) {
      return this.signedUrlCache[`${bucketName}${filePath}`];
    }

    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(filePath);

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });
    this.signedUrlCache[`${bucketName}${filePath}`] = url;
    return url;
  }
}

const gcpService = new GcpService();

export { gcpService };
