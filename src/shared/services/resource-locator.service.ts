import { firebaseService } from "@/shared/services/firebase.service";
import { EmuBootConfig, EmuLogBlock, EmuSharedTestState, EmuTestState } from "@/shared/types";
import { FB_1, FB_2, FEmuBootConfig, FEmuLogBlock, FEmuSharedTestState, FEmuTestState } from "@/shared/types/firebase";
import { formatError } from "@/shared/utils/error";

async function readEmuBootConfigFromFirebase(testId: string): Promise<FEmuBootConfig | null> {
  console.log(`[RecL] Reading test state in SESSIONS/${testId}/BOOT_CONFIG`);
  try {
    const bootConfig = await firebaseService.read({
      pathParams: [
        { collection: FB_1.SESSIONS, docId: testId },
        { collection: FB_2.BOOT_CONFIG }
      ],
    });
    return bootConfig[0] as unknown as FEmuBootConfig;
  } catch (error) {
    console.error(`[RecL] Error reading BOOT_CONFIG: ${formatError(error)}`);
    return null;
  }
}
async function writeEmuBootConfigToFirebase(testId: string, bootConfig: EmuBootConfig): Promise<boolean> {
  console.log(`[RecL] Writing SESSIONS/${testId}/BOOT_CONFIG`);
  try {
    await firebaseService.write({
      pathParams: [
        { collection: FB_1.SESSIONS, docId: testId },
        { collection: FB_2.BOOT_CONFIG }
      ],
      payload: [bootConfig]
    });
    return true;
  } catch (error) {
    console.error(`[RecL] Error writing BOOT_CONFIG: ${formatError(error)}`);
    return false;
  }
}

export async function freadBootConfig(testId: string): Promise<EmuBootConfig | null> {
  return readEmuBootConfigFromFirebase(testId);
}
export async function fwriteBootConfig(testId: string, bootConfig: EmuBootConfig) {
  return writeEmuBootConfigToFirebase(testId, bootConfig);
}


async function readEmuTestStateFromFirebase(testId: string): Promise<FEmuTestState | null> {
  console.log(`[RecL] Reading test state in SESSIONS/${testId}/TEST_STATE`);
  try {
    const testState = await firebaseService.read({
      pathParams: [
        { collection: FB_1.SESSIONS, docId: testId },
        { collection: FB_2.TEST_STATE }
      ],
    });
    return testState[0] as unknown as FEmuTestState;
  } catch (error) {
    console.error(`[RecL] Error reading TEST_STATE: ${formatError(error)}`);
    return null;
  }
}
async function writeEmuTestStateToFirebase(testId: string, testState: EmuTestState): Promise<boolean> {
  console.log(`[RecL] Writing test state in SESSIONS/${testId}/TEST_STATE`);
  try {
    await firebaseService.write({
      pathParams: [
        { collection: FB_1.SESSIONS, docId: testId },
        { collection: FB_2.TEST_STATE }
      ],
      payload: [testState]
    });
    return true;
  } catch (error) {
    console.error(`[RecL] Error writing TEST_STATE: ${formatError(error)}`);
    return false;
  }
}

export async function freadTestState(testId: string): Promise<EmuTestState | null> {
  return readEmuTestStateFromFirebase(testId);
}
export async function fwriteTestState(testId: string, testState: EmuTestState) {
  return writeEmuTestStateToFirebase(testId, testState);
}


async function readEmuSharedTestStateFromFirebase(testId: string): Promise<FEmuSharedTestState | null> {
  console.log(`[RecL] Reading test state in SESSIONS/${testId}/SHARED_STATE`);
  try {
    const sharedState = await firebaseService.read({
      pathParams: [
        { collection: FB_1.SESSIONS, docId: testId },
        { collection: FB_2.SHARED_STATE }
      ],
    });
    return sharedState[0] as unknown as FEmuSharedTestState;
  } catch (error) {
    console.error(`[RecL] Error reading SHARED_STATE: ${formatError(error)}`);
    return null;
  }
}
async function writeEmuSharedTestStateToFirebase(testId: string, sharedState: EmuSharedTestState): Promise<boolean> {
  console.log(`[RecL] Writing test state in SESSIONS/${testId}/SHARED_STATE`);
  try {
    await firebaseService.write({
      pathParams: [
        { collection: FB_1.SESSIONS, docId: testId },
        { collection: FB_2.SHARED_STATE }
      ],
      payload: [sharedState]
    });
    return true;
  } catch (error) {
    console.error(`[RecL] Error writing SHARED_STATE: ${formatError(error)}`);
    return false;
  }
}

export async function freadSharedTestState(testId: string): Promise<EmuSharedTestState | null> {
  return readEmuSharedTestStateFromFirebase(testId);
}
export async function fwriteSharedTestState(testId: string, testState: EmuSharedTestState) {
  return writeEmuSharedTestStateToFirebase(testId, testState);
}

async function readEmuAgentLogsFromFirebase(testId: string): Promise<FEmuLogBlock[] | null> {
  console.log(`[RecL] Reading agent logs in SESSIONS/${testId}/AGENT_LOGS`)
  try {
    const agentLogs = await firebaseService.read({
      pathParams: [
        { collection: FB_1.SESSIONS, docId: testId },
        { collection: FB_2.AGENT_LOGS }
      ],
    });
    return agentLogs as unknown as FEmuLogBlock[];
  } catch (error) {
    console.error(`[RecL] Error reading AGENT_LOGS: ${formatError(error)}`)
    return null;
  }
}
async function writeEmuAgentLogsToFirebase(testId: string, logs: EmuLogBlock[]): Promise<boolean> {
  console.log(`[RecL] Writing agent logs in SESSIONS/${testId}/AGENT_LOGS`)
  try {
    await firebaseService.write({
      pathParams: [
        { collection: FB_1.SESSIONS, docId: testId },
        { collection: FB_2.AGENT_LOGS }
      ],
      payload: logs
    });
    return true;
  } catch (error) {
    console.error(`[RecL] Error writing AGENT_LOGS: ${formatError(error)}`)
    return false;
  }
}

export async function freadAgentLogs(testId: string): Promise<EmuLogBlock[] | null> {
  return readEmuAgentLogsFromFirebase(testId);
}
export async function fwriteAgentLogs(testId: string, logs: EmuLogBlock[]) {
  return writeEmuAgentLogsToFirebase(testId, logs);
}

async function readEmuDevLogsFromFirebase(testId: string): Promise<FEmuLogBlock[] | null> {
  console.log(`[RecL] Reading test state in SESSIONS/${testId}/DEV_LOGS`)
  try {
    const devLogs = await firebaseService.read({
      pathParams: [
        { collection: FB_1.SESSIONS, docId: testId },
        { collection: FB_2.DEV_LOGS }
      ],
    });
    return devLogs as unknown as FEmuLogBlock[];
  } catch (error) {
    console.error(`[RecL] Error reading DEV_LOGS: ${formatError(error)}`)
    return null;
  }
}
async function writeEmuDevLogsToFirebase(testId: string, logs: EmuLogBlock[]): Promise<boolean> {
  console.log(`[RecL] Writing dev logs in SESSIONS/${testId}/DEV_LOGS`)
  try {
    await firebaseService.write({
      pathParams: [
        { collection: FB_1.SESSIONS, docId: testId },
        { collection: FB_2.DEV_LOGS }
      ],
      payload: logs
    });
    return true;
  } catch (error) {
    console.error(`[RecL] Error writing DEV_LOGS: ${formatError(error)}`)
    return false;
  }
}

export async function freadDevLogs(testId: string): Promise<EmuLogBlock[] | null> {
  return readEmuDevLogsFromFirebase(testId);
}
export async function fwriteDevLogs(testId: string, logs: EmuLogBlock[]) {
  return writeEmuDevLogsToFirebase(testId, logs);
}
