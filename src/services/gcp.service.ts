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

  async createJob(request: protos.google.cloud.run.v2.ICreateJobRequest): Promise<protos.google.cloud.run.v2.IJob> {
    const [operation] = await this.jobClient.createJob(request);
    const [job] = await operation.promise();
    return job;
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
