import { JobsClient, protos, ServicesClient } from "@google-cloud/run";
import { GoogleAuth } from "google-auth-library";

export class GcpService {
  private client = new ServicesClient();
  private jobClient = new JobsClient();
  private auth = new GoogleAuth();

  async getIdentityToken(targetUrl: string): Promise<string> {
    const client = await this.auth.getIdTokenClient(targetUrl);
    const idToken = await client.idTokenProvider.fetchIdToken(targetUrl);
    
    return idToken;
  }

  async createService(request: protos.google.cloud.run.v2.ICreateServiceRequest): Promise<protos.google.cloud.run.v2.IService> {
    const [operation] = await this.client.createService(request);
    const [service] = await operation.promise();
    return service;
  }

  async runJob(testPath: string, authToken: string, mcpSessionId: string): Promise<boolean> {
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
              name: 'AUTH_TOKEN',
              value: authToken
            },
            {
              name: 'MCP_SESSION_ID',
              value: mcpSessionId
            }
          ]
        }]
      }
    });
    return true;
  }

  async getIamPolicy(resource: string): Promise<[protos.google.iam.v1.IPolicy, protos.google.iam.v1.IGetIamPolicyRequest | undefined, {} | undefined]> {
    const policy = await this.client.getIamPolicy({
      resource
    });
    return policy;
  }

  async setIamPolicy(request: protos.google.iam.v1.ISetIamPolicyRequest) {
    await this.client.setIamPolicy(request);
  }
}

const gcpService = new GcpService();

export { gcpService };
