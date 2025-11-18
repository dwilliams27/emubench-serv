import { gcpService } from '@/services/gcp.service';
import { SESSION_FUSE_PATH } from '@/types/session';
import { EmuReqTraceMetadata, EmuEmulatorConfig } from '@/shared/types';
import { protos } from '@google-cloud/run';
import axios from 'axios';
import { GoogleAuth } from "google-auth-library";
import { formatError } from '@/shared/utils/error';
import { fwriteFormattedTraceLog } from '@/shared/utils/trace';

export class ContainerService {
  async deployGame(testId: string, emulatorConfig: EmuEmulatorConfig, trace?: EmuReqTraceMetadata) {
    const location = 'us-central1';
    const timeoutMinutes = parseInt(process.env.CONTAINER_TIMEOUT_MINUTES || '30');
    
    const request: protos.google.cloud.run.v2.ICreateServiceRequest = {
      parent: `projects/${process.env.PROJECT_ID}/locations/${location}`,
      serviceId: `${testId}-game`,
      service: {
        template: {
          serviceAccount: `emubench-cloud-run-sa@${process.env.PROJECT_ID}.iam.gserviceaccount.com`,
          executionEnvironment: 'EXECUTION_ENVIRONMENT_GEN2',
          timeout: { seconds: timeoutMinutes * 60 },
          containers: [{
            image: `gcr.io/${process.env.PROJECT_ID}/emubench-${emulatorConfig.platform}-${emulatorConfig.gameId.toLowerCase()}:latest`,
            ports: [{ containerPort: 8080 }],
            env: [
              { name: "DOLPHIN_EMU_USERPATH", value: `${SESSION_FUSE_PATH}/${testId}` },
              { name: "SAVE_STATE_FILE", value: emulatorConfig.startStateFilename },
              { name: "MEMWATCHES", value: JSON.stringify({ contextMemWatches: emulatorConfig.contextMemWatches || {}, endStateMemWatches: emulatorConfig.endStateMemWatches || {} }) },
              { name: "TEST_ID", value: testId },
              { name: "MODE", value: emulatorConfig.mode },
              { name: "USE_SHADER", value: emulatorConfig.shader },
            ],
            resources: {
              limits: {
                cpu: '2',
                memory: '4Gi'
              }
            },
          }],
          scaling: {
            minInstanceCount: 0,
            maxInstanceCount: 1
          }
        },
        ingress: 'INGRESS_TRAFFIC_ALL',
      }
    };

    const service = await gcpService.createService(request);
    const identityToken = await this.getIdentityToken(service.uri!);

    console.log(`[Container] Service ${testId} deployed at ${service.uri}`);
    try {
      const response = await axios.get(`${service.uri}/`, {
        headers: {
          'Authorization': `Bearer ${identityToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(`[Container] Health check successful for service ${testId}: ${response.data}`);
      fwriteFormattedTraceLog(`Emulator health check from server for ${testId} successful`, trace);
    } catch (error) {
      console.error(`Health check failed for service ${testId}: ${formatError(error)}`);
      fwriteFormattedTraceLog(`Emulator health check from server for ${testId} FAILED`, trace);
    }

    return { identityToken, service };
  }

  async destroyGame(serviceName: string) {
    try {
      await gcpService.deleteService(serviceName);
      console.log(`[Container] Service ${serviceName} deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete service ${serviceName}: ${formatError(error)}`);
    }
  }

  private async getIdentityToken(targetUrl: string): Promise<string> {
    const auth = new GoogleAuth();
    
    const client = await auth.getIdTokenClient(targetUrl);
    const idToken = await client.idTokenProvider.fetchIdToken(targetUrl);
    
    return idToken;
  }
}

const containerService = new ContainerService();

export { containerService };
