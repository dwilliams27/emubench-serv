import axios from "axios";
import { IPCControllerInputRequest } from "./models";

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
