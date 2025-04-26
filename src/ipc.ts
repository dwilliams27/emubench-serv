import axios from "axios";
import { IPCControllerInputRequest } from "./models";

export async function sendControllerInput(
  request: IPCControllerInputRequest
) {
  try {
    await axios.post('http://localhost:58111', request)
  } catch (error) {
    console.error('Error sending controller input:', error);
    return false;
  }
  return true;
}
