import { IpcControllerInputRequest, MemoryWatch } from "@/types/gamecube";
import { ActiveTest } from "@/types/session";
import axios, { AxiosInstance } from "axios";
import { Agent } from "https";

export interface PostControllerInputResponse {
  contextMemWatchValues: Record<string, string>;
  endStateMemWatchValues: Record<string, string>;
  screenshot: string;
};

export class EmulationService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 300000,
      httpsAgent: new Agent({ 
        keepAlive: true,
        maxSockets: 50,
        maxFreeSockets: 10,
        timeout: 300000,
      }),
    });
  }

  async postControllerInput(
    activeTest: ActiveTest,
    request: IpcControllerInputRequest,
    controllerPort = 0,
  ): Promise<PostControllerInputResponse | null> {
    request.connected = true;
    try {
      console.log(`[Emulation] Sending controller input for test ${activeTest.id} to port ${controllerPort}: ${JSON.stringify(request)}`);
      const response = await this.axiosInstance.post(
        `${activeTest.container?.uri}/api/controller/${controllerPort}`,
        request,
        { 
          headers: {
            'Authorization': `Bearer ${activeTest.googleToken}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      console.log(`[Emulation] Sent controller input for test ${activeTest.id}`);
      return response.data;
    } catch (error) {
      console.error('[Emulation] Error sending controller input:', error);
      return null;
    }
  }

  async getScreenshot(activeTest: ActiveTest) {
    try {
      console.log("Grabbing screenshot");
      const response = await this.axiosInstance.get(
        `${activeTest.container?.uri}/api/screenshot`,
        {
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Bearer ${activeTest.googleToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
  
      const base64Image = Buffer.from(response.data, 'binary').toString('base64');
      return base64Image;
    } catch (error) {
      console.error('Error grabbing screenshot:', error);
      return null;
    }
  }

  async saveStateSlot(activeTest: ActiveTest, slot: number) {
    try {
      console.log(`[Emulation] Saving state to slot ${slot}`);
      const response = await this.axiosInstance.post(
        `${activeTest.container?.uri}/api/emulation/state`,
        { action: 'save', to: slot },
        {
          headers: {
            'Authorization': `Bearer ${activeTest.googleToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error saving state to slot:', error);
      return null;
    }
  }

  async loadStateSlot(activeTest: ActiveTest, slot: number) {
    try {
      console.log(`[Emulation] Loading state from slot ${slot}`);
      const response = await this.axiosInstance.post(
        `${activeTest.container?.uri}/api/emulation/state`,
        { action: 'load', to: slot },
        {
          headers: {
            'Authorization': `Bearer ${activeTest.googleToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error loading state from slot:', error);
      return null;
    }
  }

  async saveStateFile(activeTest: ActiveTest, file: string) {
    try {
      console.log(`[Emulation] Saving state to file ${file}`);
      const response = await this.axiosInstance.post(
        `${activeTest.container?.uri}/api/emulation/state`,
        { action: 'save', to: file },
        {
          headers: {
            'Authorization': `Bearer ${activeTest.googleToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error saving state to file:', error);
      return null;
    }
  }

  async loadStateFile(activeTest: ActiveTest, file: string) {
    try {
      console.log(`[Emulation] Loading state from file ${file}`);
      const response = await this.axiosInstance.post(
        `${activeTest.container?.uri}/api/emulation/state`,
        { action: 'load', to: file },
        {
          headers: {
            'Authorization': `Bearer ${activeTest.googleToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error loading state from file:', error);
      return null;
    }
  }

  async setEmulationSpeed(activeTest: ActiveTest, speed: number) {
    try {
      console.log(`[Emulation] Setting emulation speed to ${speed}`);
      const response = await this.axiosInstance.post(
        `${activeTest.container?.uri}/api/emulation/config`,
        { speed },
        {
          headers: {
            'Authorization': `Bearer ${activeTest.googleToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error setting emulation speed:', error);
      return null;
    }
  }

  async setEmulationState(activeTest: ActiveTest, action: "play" | "pause") {
    try {
      console.log(`[Emulation] Setting emulation state to ${action}`);
      const response = await this.axiosInstance.post(
        `${activeTest.container?.uri}/api/emulation/state`,
        { action },
        {
          headers: {
            'Authorization': `Bearer ${activeTest.googleToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error setting emulation state:', error);
      return null;
    }
  }

  async startTest(activeTest: ActiveTest) {
    try {
      console.log(`[Emulation] Starting test for container ${activeTest.container?.uri}`);
      const response = await this.axiosInstance.get(
        `${activeTest.container?.uri}/api/test/start`,
        {
          headers: {
            'Authorization': `Bearer ${activeTest.googleToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error setting emulation state:', error);
      return null;
    }
  }

  async bootGame(activeTest: ActiveTest, game_path: string) {
    try {
      console.log(`[Emulation] Booting game from ${game_path}`);
      const response = await this.axiosInstance.post(
        `${activeTest.container?.uri}/api/emulation/boot`,
        { game_path },
        {
          headers: {
            'Authorization': `Bearer ${activeTest.googleToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error booting game:', error);
      return null;
    }
  }

  async setupMemWatches(activeTest: ActiveTest, watches: Record<string, MemoryWatch>) {
    try {
      console.log(`[Emulation] Setting up memwatches for addresses ${Object.values(watches).map((watch) => watch.address).join(", ")}`);
      const response = await this.axiosInstance.post(
        `${activeTest.container?.uri}/api/memwatch/setup`,
        { watches },
        {
          headers: {
            'Authorization': `Bearer ${activeTest.googleToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error: any) {
      console.error('Error setting memwatches:', error?.response?.data);
      return null;
    }
  }

  async readMemWatches(activeTest: ActiveTest, names: string[]): Promise<{ values: Record<string, string> }> {
    try {
      console.log(`[Emulation] Reading memwatches on addresses ${names.join(", ")}`);
      const response = await this.axiosInstance.get(
        `${activeTest.container?.uri}/api/memwatch/values?names=${names.join(",")}`,
        {
          headers: {
            'Authorization': `Bearer ${activeTest.googleToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data.values;
    } catch (error: any) {
      console.error('Error reading memwatches:', error?.response?.data);
      return { values: {} };
    }
  }
}

const emulationService = new EmulationService();

export { emulationService };
