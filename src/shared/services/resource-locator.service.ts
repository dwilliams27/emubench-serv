import { firebaseService } from "@/shared/services/firebase.service";
import { EmuAgentState, EmuBootConfig, EmuEmulatorState, EmuLogBlock, EmuReqTraceLog, EmuServiceName, EmuSharedTestState, EmuTestState } from "@/shared/types";
import { DocumentWithId, EmuCollectionOwnership, FB_1, FB_2, FirebasePathParam } from "@/shared/types/firebase";
import { formatError } from "@/shared/utils/error";

const currentService: EmuServiceName = (process.env.SERVICE_NAME as EmuServiceName) || 'UNKNOWN';
// For now shallow, only 1 level beyond testId
const FB_CACHE: Record<string, any> = {};

export interface EmuGrabOptions {
  forceCache?: boolean;
  forceReadThrough?: boolean;
};

function generateCacheKey(pathParams: FirebasePathParam[]) {
  return pathParams.map((param) => `${param.collection}${param.docId}`).join(':');
}

function shouldUseCache(deepestCollection?: string, options?: EmuGrabOptions) {
  if (options?.forceCache) {
    return true;
  }
  if (options?.forceReadThrough || !deepestCollection) {
    return false;
  }
  return EmuCollectionOwnership[deepestCollection]?.includes(currentService);
}

function throwIfCantWrite(deepestCollection?: string) {
  if (deepestCollection && !EmuCollectionOwnership[deepestCollection]?.includes(currentService)) {
    throw new Error(`Service ${currentService} cannot write to ${deepestCollection}`);
  }
}

function pathParamsToString(pathParams: FirebasePathParam[]) {
  return pathParams.map(p => p.docId ? `${p.collection}/${p.docId}` : p.collection).join('/')
};

async function readObjectFromFirebase<T>({ pathParams }: {
  pathParams: FirebasePathParam[]
}): Promise<T | null> {
  const objectPath = pathParamsToString(pathParams);
  if (pathParams[-1]?.docId) {
    const cacheKey = generateCacheKey(pathParams);
    if (shouldUseCache(pathParams[-1]?.collection) && FB_CACHE[cacheKey]) {
      console.log(`[RecL] Reading object from cache for ${objectPath}`);
      return FB_CACHE[cacheKey] as T;
    }
  }
  
  console.log(`[RecL] Reading object in ${objectPath}`);
  try {
    const objects = await firebaseService.read({
      pathParams,
    });
    return objects[0] as unknown as T;
  } catch (error) {
    console.error(`[RecL] Error reading ${objectPath}: ${formatError(error)}`);
    return null;
  }
}

async function writeObjectToFirebase({ pathParams, payload }: {
  pathParams: FirebasePathParam[],
  payload: DocumentWithId[]
}): Promise<boolean> {
  throwIfCantWrite(pathParams[-1]?.collection);
  const objectPath = pathParamsToString(pathParams);
  console.log(`[RecL] Writing object to ${objectPath}`);
  try {
    await firebaseService.write({
      pathParams,
      payload
    });
    if (shouldUseCache(pathParams[-1]?.collection)) {
      payload.forEach((p) => {
        const cacheKey = generateCacheKey([...pathParams.slice(0, -1), { collection: pathParams[-1].collection, docId: p.id }]);
        FB_CACHE[cacheKey] = payload;
      });
    }
    return true;
  } catch (error) {
    console.error(`[RecL] Error writing ${objectPath}: ${formatError(error)}`);
    return false;
  }
}

export async function freadBootConfig(testId: string): Promise<EmuBootConfig | null> {
  return readObjectFromFirebase<EmuBootConfig>({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.BOOT_CONFIG }
    ]
  });
}
export async function fwriteBootConfig(testId: string, bootConfig: EmuBootConfig) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.BOOT_CONFIG }
    ],
    payload: [bootConfig]
  });
}


export async function freadEmulatorState(testId: string): Promise<EmuEmulatorState | null> {
  return readObjectFromFirebase<EmuEmulatorState>({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.EMULATOR_STATE }
    ],
  });
}
export async function fwriteEmulatorState(testId: string, emulatorState: EmuEmulatorState) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.EMULATOR_STATE }
    ],
    payload: [emulatorState]
  });
}


export async function freadAgentState(testId: string): Promise<EmuAgentState | null> {
  return readObjectFromFirebase<EmuAgentState>({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.AGENT_STATE }
    ],
  });
}
export async function fwriteAgentState(testId: string, agentState: EmuAgentState) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.AGENT_STATE }
    ],
    payload: [agentState]
  });
}


export async function freadTestState(testId: string): Promise<EmuTestState | null> {
  return readObjectFromFirebase<EmuTestState>({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.TEST_STATE }
    ],
  });
}
export async function fwriteTestState(testId: string, testState: EmuTestState) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.TEST_STATE }
    ],
    payload: [testState]
  });
}


export async function freadSharedTestState(testId: string): Promise<EmuSharedTestState | null> {
  return readObjectFromFirebase<EmuSharedTestState>({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.SHARED_STATE }
    ],
  });
}
export async function fwriteSharedTestState(testId: string, sharedState: EmuSharedTestState) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.SHARED_STATE }
    ],
    payload: [sharedState]
  });
}


export async function freadAgentLogs(testId: string): Promise<EmuLogBlock[] | null> {
  return readObjectFromFirebase<EmuLogBlock[]>({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.AGENT_LOGS }
    ],
  });
}
export async function fwriteAgentLogs(testId: string, logs: EmuLogBlock[]) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.AGENT_LOGS }
    ],
    payload: logs
  });
}


export async function freadDevLogs(testId: string): Promise<EmuLogBlock[] | null> {
  return readObjectFromFirebase<EmuLogBlock[]>({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.DEV_LOGS },
    ],
  });
}
export async function fwriteDevLogs(testId: string, logs: EmuLogBlock[]) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.DEV_LOGS },
    ],
    payload: logs
  });
}

export async function freadTraceLogs(traceId: string): Promise<EmuReqTraceLog[] | null> {
  return readObjectFromFirebase<EmuReqTraceLog[]>({
    pathParams: [
      { collection: FB_1.TRACES, docId: traceId },
      { collection: FB_2.TRACE_LOGS,  }
    ],
  });
}
export async function fwriteTraceLogs(traceId: string, logs: EmuReqTraceLog[]) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.TRACES, docId: traceId },
      { collection: FB_2.TRACE_LOGS }
    ],
    payload: logs
  });
}
