import { IpcControllerInputRequest, MemoryWatch } from "@/types/gamecube";
import axios from "axios";

export class EmulationService {
  async postControllerInput(
    hostname: string,
    request: IpcControllerInputRequest,
    controllerPort = 0,
  ) {
    request.connected = true;
    try {
      console.log(`Sending controller input to port ${controllerPort}:`, request);
      await axios.post(`http://${hostname}:58111/api/controller/${controllerPort}`, request)
    } catch (error) {
      console.error('Error sending controller input:', error);
      return false;
    }
    return true;
  }

  async getScreenshot(hostname: string) {
    try {
      console.log("Grabbing screenshot");
      const response = await axios.get(
        `http://${hostname}:58111/api/screenshot`,
        { responseType: 'arraybuffer'}
      );
  
      const base64Image = Buffer.from(response.data, 'binary').toString('base64');
      return base64Image;
    } catch (error) {
      console.error('Error grabbing screenshot:', error);
      return null;
    }
  }

  async saveStateSlot(hostname: string, slot: number) {
    try {
      console.log(`Saving state to slot ${slot}`);
      const response = await axios.post(`http://${hostname}:58111/api/emulation/state`, { action: 'save', to: slot });
    } catch (error) {
      console.error('Error saving state to slot:', error);
      return null;
    }
  }

  async loadStateSlot(hostname: string, slot: number) {
    try {
      console.log(`Loading state from slot ${slot}`);
      const response = await axios.post(`http://${hostname}:58111/api/emulation/state`, { action: 'load', to: slot });
    } catch (error) {
      console.error('Error loading state from slot:', error);
      return null;
    }
  }

  async saveStateFile(hostname: string, file: string) {
    try {
      console.log(`Saving state to file ${file}`);
      const response = await axios.post(`http://${hostname}:58111/api/emulation/state`, { action: 'save', to: file });
    } catch (error) {
      console.error('Error saving state to file:', error);
      return null;
    }
  }

  async loadStateFile(hostname: string, file: string) {
    try {
      console.log(`Loading state from file ${file}`);
      const response = await axios.post(`http://${hostname}:58111/api/emulation/state`, { action: 'load', to: file });
    } catch (error) {
      console.error('Error loading state from file:', error);
      return null;
    }
  }

  async setEmulationSpeed(hostname: string, speed: number) {
    try {
      console.log(`Setting emulation speed to ${speed}`);
      const response = await axios.post(
        `http://${hostname}:58111/api/emulation/config`,
        { speed }
      );
    } catch (error) {
      console.error('Error setting emulation speed:', error);
      return null;
    }
  }

  async setEmulationState(hostname: string, action: "play" | "pause") {
    try {
      console.log(`Setting emulation state to ${action}`);
      const response = await axios.post(
        `http://${hostname}:58111/api/emulation/state`,
        { action }
      );
    } catch (error) {
      console.error('Error setting emulation state:', error);
      return null;
    }
  }

  async bootGame(hostname: string, game_path: string) {
    try {
      console.log(`Booting game from ${game_path}`);
      const response = await axios.post(
        `http://${hostname}:58111/api/emulation/boot`,
        { game_path }
      );
    } catch (error) {
      console.error('Error booting game:', error);
      return null;
    }
  }

  async setupMemWatches(hostname: string, watches: Record<string, MemoryWatch>) {
    try {
      console.log(`Setting up memwatches for addresses ${Object.values(watches).map((watch) => watch.address).join(", ")}`);
      const response = await axios.post(
        `http://${hostname}:58111/api/memwatch/setup`,
        { watches }
      );
    } catch (error: any) {
      console.error('Error setting memwatches:', error?.response?.data);
      return null;
    }
  }

  async readMemWatches(hostname: string, names: string[]) {
    try {
      console.log(`Reading memwatches on addresses ${names.join(", ")}`);
      const response = await axios.get(
        `http://${hostname}:58111/api/memwatch/values?names=${names.join(",")}`,
      );
      return response.data.values;
    } catch (error: any) {
      console.error('Error reading memwatches:', error?.response?.data);
      return null;
    }
  }
}

const emulationService = new EmulationService();

export { emulationService };
