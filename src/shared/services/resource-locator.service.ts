import { firebaseService } from "@/shared/services/firebase.service";
import { EmuAgentState, EmuBootConfig, EmuEmulatorState, EmuLogBlock, EmuTraceLog, EmuServiceName, EmuSharedTestState, EmuTestState, EmuTrace } from "@/shared/types";
import { DocumentWithId, EmuCollectionOwnership, FB_1, FB_2, FEmuBaseObject, FEmuLogBlock, FEmuTrace, FEmuTraceLog, FirebasePathParam } from "@/shared/types/firebase";
import { EmuWriteOptions } from "@/shared/types/resource-locator";
import { formatError } from "@/shared/utils/error";

const currentService: EmuServiceName = (process.env.SERVICE_NAME as EmuServiceName) || 'UNKNOWN';
// For now shallow, only 1 level beyond testId
const FB_CACHE: Record<string, any> = {};

export interface EmuGrabOptions {
  forceCache?: boolean;
  forceReadThrough?: boolean;
};

function sortResultsByCreatedAt(results: FEmuBaseObject[], mostRecentFirst: boolean = false) {
  return results.sort((a, b) => {
    const aTime = a.createdAt._seconds * 1000 + a.createdAt._nanoseconds / 1000000;
    const bTime = b.createdAt._seconds * 1000 + b.createdAt._nanoseconds / 1000000;
    return mostRecentFirst ? bTime - aTime : aTime - bTime;
  }) as any[];
}

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

async function readObjectFromFirebase<T>({ pathParams, where }: {
  pathParams: FirebasePathParam[],
  where?: [string, FirebaseFirestore.WhereFilterOp, any][]
}): Promise<T[] | null> {
  const objectPath = pathParamsToString(pathParams);
  if (pathParams[-1]?.docId) {
    const cacheKey = generateCacheKey(pathParams);
    if (shouldUseCache(pathParams[-1]?.collection) && FB_CACHE[cacheKey]) {
      console.log(`[RecL] Reading object from cache for ${objectPath}`);
      return FB_CACHE[cacheKey] as T[];
    }
  }
  
  console.log(`[RecL] Reading object in ${objectPath}`);
  try {
    const objects = await firebaseService.read({
      pathParams,
      where
    });
    return objects as unknown as T[];
  } catch (error) {
    console.error(`[RecL] Error reading ${objectPath}: ${formatError(error)}`);
    return null;
  }
}

async function writeObjectToFirebase({ pathParams, payload, options }: {
  pathParams: FirebasePathParam[],
  payload: DocumentWithId[],
  options: EmuWriteOptions
}): Promise<boolean> {
  throwIfCantWrite(pathParams[-1]?.collection);
  const objectPath = pathParamsToString(pathParams);
  console.log(`[RecL] Writing object to ${objectPath}`);
  try {
    await firebaseService.write(pathParams, payload, options);
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
  const result = await readObjectFromFirebase<EmuBootConfig>({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.BOOT_CONFIG }
    ]
  });
  return result ? result[0] : null;
}
export async function fwriteBootConfig(testId: string, bootConfig: DocumentWithId, options: EmuWriteOptions = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.BOOT_CONFIG }
    ],
    payload: [bootConfig],
    options
  });
}


export async function freadEmulatorState(testId: string): Promise<EmuEmulatorState | null> {
  const result = await readObjectFromFirebase<EmuEmulatorState>({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.EMULATOR_STATE }
    ],
  });
  return result ? result[0] : null;
}
export async function fwriteEmulatorState(testId: string, emulatorState: DocumentWithId, options: EmuWriteOptions = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.EMULATOR_STATE }
    ],
    payload: [emulatorState],
    options
  });
}


export async function freadAgentState(testId: string): Promise<EmuAgentState | null> {
  const result = await readObjectFromFirebase<EmuAgentState>({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.AGENT_STATE }
    ],
  });
  return result ? result[0] : null;
}
export async function fwriteAgentState(testId: string, agentState: DocumentWithId, options: EmuWriteOptions = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.AGENT_STATE }
    ],
    payload: [agentState],
    options
  });
}


export async function freadTestState(testId: string): Promise<EmuTestState | null> {
  const result = await  readObjectFromFirebase<EmuTestState>({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.TEST_STATE }
    ],
  });
  return result ? result[0] : null;
}
export async function fwriteTestState(testId: string, testState: DocumentWithId, options: EmuWriteOptions = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.TEST_STATE }
    ],
    payload: [testState],
    options
  });
}


export async function freadSharedTestState(testId: string): Promise<EmuSharedTestState | null> {
  const result = await  readObjectFromFirebase<EmuSharedTestState>({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.SHARED_STATE }
    ],
  });
  return result ? result[0] : null;
}
export async function fwriteSharedTestState(testId: string, sharedState: DocumentWithId, options: EmuWriteOptions = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.SHARED_STATE }
    ],
    payload: [sharedState],
    options
  });
}


export async function freadAgentLogs(testId: string): Promise<EmuLogBlock[] | null> {
  const result = await readObjectFromFirebase<FEmuLogBlock>({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.AGENT_LOGS }
    ],
  });
  return result ? sortResultsByCreatedAt(result, true) : null;
}
export async function fwriteAgentLogs(testId: string, logs: DocumentWithId[], options: EmuWriteOptions = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.AGENT_LOGS }
    ],
    payload: logs,
    options
  });
}


export async function freadDevLogs(testId: string): Promise<EmuLogBlock[] | null> {
  const result = await readObjectFromFirebase<FEmuLogBlock>({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.DEV_LOGS },
    ],
  });
  return result ? sortResultsByCreatedAt(result, true) : null;
}
export async function fwriteDevLogs(testId: string, logs: DocumentWithId[], options: EmuWriteOptions = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docId: testId },
      { collection: FB_2.DEV_LOGS },
    ],
    payload: logs,
    options
  });
}


export async function freadTraceLogs(traceId: string): Promise<EmuTraceLog[] | null> {
  const result = await readObjectFromFirebase<FEmuTraceLog>({
    pathParams: [
      { collection: FB_1.TRACES, docId: traceId },
      { collection: FB_2.TRACE_LOGS,  }
    ],
  });
  return result ? sortResultsByCreatedAt(result, true) : null;
}
export async function fwriteTraceLogs(traceId: string, logs: DocumentWithId[], options: EmuWriteOptions = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.TRACES, docId: traceId },
      { collection: FB_2.TRACE_LOGS }
    ],
    payload: logs,
    options
  });
}


export async function freadTracesByTestId(testId: string): Promise<EmuTrace[] | null> {
  console.log(`[RecL] Querying traces for testId: ${testId}`);
  const traces = await readObjectFromFirebase<FEmuTrace>({
    pathParams: [
      { collection: FB_1.TRACES },
    ],
    where: [['testId', '==', testId]]
  });
  const results = await Promise.all((traces || []).map(async (trace) => {
    const logs = await freadTraceLogs(trace.id);
    return {
      ...trace,
      logs: logs || []
    };
  }));
  console.log(`[RecL] Returning ${results.length} processed traces for testId ${testId}`);
  return results;
}


export async function fwriteNewTrace(traceId: string, testId: string, options: EmuWriteOptions = {}) {
  console.log(`[RecL] Writing new trace: traceId=${traceId}, testId=${testId}`);
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.TRACES, docId: traceId },
    ],
    payload: [{ id: traceId, testId }],
    options
  });
}
