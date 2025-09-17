import { firebaseService } from "@/shared/services/firebase.service";
import { EmuAgentState, EmuBootConfig, EmuEmulatorState, EmuLogBlock, EmuServiceName, EmuSharedTestState, EmuTestState } from "@/shared/types";
import { DocumentWithId, EmuDocumentOwnership, FB_1, FB_2, FirebasePathParam } from "@/shared/types/firebase";
import { formatError } from "@/shared/utils/error";
import { AGENT_STATE_ID, BOOT_CONFIG_ID, EMULATOR_STATE_ID, LOG_BLOCK_ID, SHARED_TEST_STATE_ID, TEST_STATE_ID } from "@/shared/utils/id";

const currentService: EmuServiceName = (process.env.SERVICE_NAME as EmuServiceName) || 'UNKNOWN';
// For now shallow, only 1 level beyond testId
const FB_CACHE: Record<string, any> = {};

export interface EmuGrabOptions {
  forceCache?: boolean;
  forceReadThrough?: boolean;
};

function generateCacheKey(testId: string, pathIds: string[]) {
  return `${testId}::${pathIds.join(':')}`;
}

function shouldUseCache(idPrefix: string, options?: EmuGrabOptions) {
  if (options?.forceCache) {
    return true;
  }
  if (options?.forceReadThrough) {
    return false;
  }
  return EmuDocumentOwnership[idPrefix]?.includes(currentService);
}

// TODO: Hmm
function throwIfCantWrite(id: string) {
  // if (!EmuDocumentOwnership[id]?.includes(currentService)) {
  //   throw new Error(`Service ${currentService} cannot write to document ${id}`);
  // }
}

async function readObjectFromFirebase<T>({ testId, idPrefix, pathParams }: {
  testId: string,
  idPrefix: string,
  pathParams: FirebasePathParam[]
}): Promise<T | null> {
  const cacheKey = generateCacheKey(testId, [idPrefix]);
  if (shouldUseCache(idPrefix) && FB_CACHE[cacheKey]) {
    console.log(`[RecL] Reading object from cache for ${pathParams.map(p => p.docId ? `${p.collection}/${p.docId}` : p.collection).join('/')}`);
    return FB_CACHE[cacheKey] as T;
  }
  console.log(`[RecL] Reading object in ${pathParams.map(p => p.docId ? `${p.collection}/${p.docId}` : p.collection).join('/')}`);
  try {
    const objects = await firebaseService.read({
      pathParams,
    });
    return objects[0] as unknown as T;
  } catch (error) {
    console.error(`[RecL] Error reading ${idPrefix}: ${formatError(error)}`);
    return null;
  }
}

async function writeObjectToFirebase({ testId, idPrefix, pathParams, payload }: {
  testId: string,
  idPrefix: string,
  pathParams: FirebasePathParam[],
  payload: DocumentWithId[]
}): Promise<boolean> {
  throwIfCantWrite(idPrefix);
  console.log(`[RecL] Writing object to ${pathParams.map(p => p.docId ? `${p.collection}/${p.docId}` : p.collection).join('/')}`);
  try {
    await firebaseService.write({
      pathParams,
      payload
    });
    if (shouldUseCache(idPrefix)) {
      const cacheKey = generateCacheKey(testId, [idPrefix]);
      FB_CACHE[cacheKey] = payload;
    }
    return true;
  } catch (error) {
    console.error(`[RecL] Error writing ${idPrefix}: ${formatError(error)}`);
    return false;
  }
}

export async function freadBootConfig(testId: string): Promise<EmuBootConfig | null> {
  return readObjectFromFirebase<EmuBootConfig>({
    testId,
    idPrefix: BOOT_CONFIG_ID,
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.BOOT_CONFIG }
    ]
  });
}
export async function fwriteBootConfig(testId: string, bootConfig: EmuBootConfig) {
  return writeObjectToFirebase({
    testId,
    idPrefix: BOOT_CONFIG_ID,
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.BOOT_CONFIG }
    ],
    payload: [bootConfig]
  });
}


export async function freadEmulatorState(testId: string): Promise<EmuEmulatorState | null> {
  return readObjectFromFirebase<EmuEmulatorState>({
    testId,
    idPrefix: EMULATOR_STATE_ID,
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.EMULATOR_STATE }
    ],
  });
}
export async function fwriteEmulatorState(testId: string, emulatorState: EmuEmulatorState) {
  return writeObjectToFirebase({
    testId,
    idPrefix: EMULATOR_STATE_ID,
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.EMULATOR_STATE }
    ],
    payload: [emulatorState]
  });
}


export async function freadAgentState(testId: string): Promise<EmuAgentState | null> {
  return readObjectFromFirebase<EmuAgentState>({
    testId,
    idPrefix: AGENT_STATE_ID,
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.AGENT_STATE }
    ],
  });
}
export async function fwriteAgentState(testId: string, agentState: EmuAgentState) {
  return writeObjectToFirebase({
    testId,
    idPrefix: AGENT_STATE_ID,
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.AGENT_STATE }
    ],
    payload: [agentState]
  });
}


export async function freadTestState(testId: string): Promise<EmuTestState | null> {
  return readObjectFromFirebase<EmuTestState>({
    testId,
    idPrefix: TEST_STATE_ID,
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.TEST_STATE }
    ],
  });
}
export async function fwriteTestState(testId: string, testState: EmuTestState) {
  return writeObjectToFirebase({
    testId,
    idPrefix: TEST_STATE_ID,
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.TEST_STATE }
    ],
    payload: [testState]
  });
}


export async function freadSharedTestState(testId: string): Promise<EmuSharedTestState | null> {
  return readObjectFromFirebase<EmuSharedTestState>({
    testId,
    idPrefix: SHARED_TEST_STATE_ID,
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.SHARED_STATE }
    ],
  });
}
export async function fwriteSharedTestState(testId: string, sharedState: EmuSharedTestState) {
  return writeObjectToFirebase({
    testId,
    idPrefix: SHARED_TEST_STATE_ID,
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.SHARED_STATE }
    ],
    payload: [sharedState]
  });
}


export async function freadAgentLogs(testId: string): Promise<EmuLogBlock[] | null> {
  return readObjectFromFirebase<EmuLogBlock[]>({
    testId,
    idPrefix: LOG_BLOCK_ID,
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.AGENT_LOGS }
    ],
  });
}
export async function fwriteAgentLogs(testId: string, logs: EmuLogBlock[]) {
  return writeObjectToFirebase({
    testId,
    idPrefix: LOG_BLOCK_ID,
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.AGENT_LOGS }
    ],
    payload: logs
  });
}


export async function freadDevLogs(testId: string): Promise<EmuLogBlock[] | null> {
  return readObjectFromFirebase<EmuLogBlock[]>({
    testId,
    idPrefix: LOG_BLOCK_ID,
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.DEV_LOGS },
    ],
  });
}
export async function fwriteDevLogs(testId: string, logs: EmuLogBlock[]) {
  return writeObjectToFirebase({
    testId,
    idPrefix: LOG_BLOCK_ID,
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.DEV_LOGS },
    ],
    payload: logs
  });
}
