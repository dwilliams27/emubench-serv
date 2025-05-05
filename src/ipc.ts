import axios from "axios";
import { IPCControllerInputRequest } from "./types/gamecube";

export async function ipcPostControllerInput(
  request: IPCControllerInputRequest,
  controllerPort = 0,
) {
  request.connected = true;
  try {
    console.log(`Sending controller input to port ${controllerPort}:`, request);
    await axios.post(`http://localhost:58111/api/controller/${controllerPort}`, request)
  } catch (error) {
    console.error('Error sending controller input:', error);
    return false;
  }
  return true;
}

export async function ipcGetScreenshot() {
  try {
    console.log("Grabbing screenshot");
    const response = await axios.get(
      "http://localhost:58111/api/screenshot",
      { responseType: 'arraybuffer'}
    );

    const base64Image = Buffer.from(response.data, 'binary').toString('base64');
    return base64Image;
  } catch (error) {
    console.error('Error grabbing screenshot:', error);
    return null;
  }
}

export async function ipcSaveStateSlot(slot: number) {
  try {
    console.log(`Saving state to slot ${slot}`);
    const response = await axios.post(`http://localhost:58111/api/emulation/state`, { action: 'save', to: slot });
  } catch (error) {
    console.error('Error saving state to slot:', error);
    return null;
  }
}

export async function ipcLoadStateSlot(slot: number) {
  try {
    console.log(`Loading state from slot ${slot}`);
    const response = await axios.post(`http://localhost:58111/api/emulation/state`, { action: 'load', to: slot });
  } catch (error) {
    console.error('Error loading state from slot:', error);
    return null;
  }
}

export async function ipcSaveStateFile(file: string) {
  try {
    console.log(`Saving state to file ${file}`);
    const response = await axios.post(`http://localhost:58111/api/emulation/state`, { action: 'save', to: file });
  } catch (error) {
    console.error('Error saving state to file:', error);
    return null;
  }
}

export async function ipcLoadStateFile(file: string) {
  try {
    console.log(`Loading state from file ${file}`);
    const response = await axios.post(`http://localhost:58111/api/emulation/state`, { action: 'load', to: file });
  } catch (error) {
    console.error('Error loading state from file:', error);
    return null;
  }
}

export async function ipcSetEmulationSpeed(speed: number) {
  try {
    console.log(`Setting emulation speed to ${speed}`);
    const response = await axios.post(
      `http://localhost:58111/api/emulation/config`,
      { speed }
    );
  } catch (error) {
    console.error('Error setting emulation speed:', error);
    return null;
  }
}

export async function ipcSetEmulationState(action: "play" | "pause") {
  try {
    console.log(`Setting emulation state to ${action}`);
    const response = await axios.post(
      `http://localhost:58111/api/emulation/state`,
      { action }
    );
  } catch (error) {
    console.error('Error setting emulation state:', error);
    return null;
  }
}

export async function ipcBootGame(game_path: string) {
  try {
    console.log(`Booting game from ${game_path}`);
    const response = await axios.post(
      `http://localhost:58111/api/emulation/boot`,
      { game_path }
    );
  } catch (error) {
    console.error('Error booting game:', error);
    return null;
  }
}

// Format: "000000" -> "0x000000"
// Can follow pointers: "000000 01" -> "(*0x000000) + 0x01"
export async function ipcSetMemwatches(addressStrings: string[]) {
  try {
    console.log(`Setting up memwatches for addresses ${addressStrings.join(", ")}`);
    const response = await axios.post(
      `http://localhost:58111/api/memwatch`,
      { addresses: addressStrings }
    );
  } catch (error) {
    console.error('Error setting emulation state:', error);
    return null;
  }
}

export async function ipcReadMemwatches(addressStrings: string[]) {
  try {
    console.log(`Reading memwatches on addresses ${addressStrings.join(", ")}`);
    const response = await axios.get(
      `http://localhost:58111/api/memwatch?addresses=${addressStrings.join("&addresses=")}`
    );
    console.log(`Response: ${JSON.stringify(response.data)}`);
    return response.data.values;
  } catch (error) {
    console.error('Error setting emulation state:', error);
    return null;
  }
}
