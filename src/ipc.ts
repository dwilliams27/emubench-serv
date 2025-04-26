import axios from "axios";
import { IPCControllerInputRequest } from "./models";

export async function sendControllerInput(
  request: IPCControllerInputRequest,
  controllerPort = 0,
) {
  try {
    console.log(`Sending controller input to port ${controllerPort}:`, request);
    await axios.post(`http://localhost:58111/api/controller/${controllerPort}`, request)
  } catch (error) {
    console.error('Error sending controller input:', error);
    return false;
  }
  return true;
}
