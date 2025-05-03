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

export async function ipcSaveState(slot: number) {
  try {
    console.log(`Saving state ${slot}`);
    const response = await axios.post(`http://localhost:58111/api/savestate/${slot}`);
  } catch (error) {
    console.error('Error saving state:', error);
    return null;
  }
}

export async function ipcLoadSaveState(slot: number) {
  try {
    console.log(`Loading state ${slot}`);
    const response = await axios.get(`http://localhost:58111/api/savestate/${slot}`);
  } catch (error) {
    console.error('Error saving state:', error);
    return null;
  }
}

export async function ipcSetEmulationSpeed(speed: number) {
  try {
    console.log(`Setting emulation speed to ${speed}`);
    const response = await axios.post(
      `http://localhost:58111/api/config/emuspeed`,
    { speed }
    );
  } catch (error) {
    console.error('Error saving state:', error);
    return null;
  }
}
