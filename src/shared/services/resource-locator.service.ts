import { firebaseService } from "@/shared/services/firebase.service";
import { EmuAgentState, EmuBootConfig, EmuEmulatorState, EmuLogBlock, EmuTraceLog, EmuServiceName, EmuSharedTestState, EmuTestState, EmuTrace } from "@/shared/types";
import { DocumentWithId, EmuCollectionOwnership, FB_1, FB_2, FEmuAgentJob, FEmuAgentState, FEmuBaseObject, FEmuBootConfig, FEmuEmulatorState, FEmuExperiment, FEmuLogBlock, FEmuSharedTestState, FEmuTestQueueJob, FEmuTestRun, FEmuTestState, FEmuTrace, FEmuTraceLog, FirebasePathParam } from "@/shared/types/firebase";
import { EmuTestRun } from "@/shared/types/test-run";
import { EmuFirebaseTransactionFunction, EmuReadOptions, EmuWriteOptions } from "@/shared/types/resource-locator";
import { formatError } from "@/shared/utils/error";
import { EmuExperiment, EmuTestQueueJob } from "@/shared/types/experiments";
import { EmuAgentJob } from "@/shared/types/agent";
import { FieldValue } from "firebase-admin/firestore";

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
  return pathParams.map((param) => `${param.collection}${param.docIds}`).join(':');
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
  return pathParams.map(p => p.docIds ? `${p.collection}/${p.docIds}` : p.collection).join('/')
};

async function readObjectFromFirebase<T extends FEmuBaseObject>(options: EmuReadOptions): Promise<(T | EmuFirebaseTransactionFunction)[] | null> {
  const { pathParams, where, atomic } = options;
  const objectPath = pathParamsToString(pathParams);
  if (pathParams[-1]?.docIds) {
    const cacheKey = generateCacheKey(pathParams);
    if (shouldUseCache(pathParams[-1]?.collection) && FB_CACHE[cacheKey]) {
      console.log(`[RecL] Reading object from cache for ${objectPath}`);
      return FB_CACHE[cacheKey] as T[];
    }
  }

  try {
    const objects = await firebaseService.read({
      pathParams,
      where,
      atomic,
    });
    return objects as unknown as T[];
  } catch (error) {
    throw new Error(`[RecL] Error reading ${objectPath}: ${formatError(error)}`);
  }
}

async function writeObjectToFirebase(options: EmuWriteOptions): Promise<boolean> {
  const { pathParams, payload } = options;
  throwIfCantWrite(pathParams[-1]?.collection);
  try {
    const result = await firebaseService.write(options);
    if (shouldUseCache(pathParams[-1]?.collection)) {
      payload.forEach((p) => {
        const cacheKey = generateCacheKey([...pathParams.slice(0, -1), { collection: pathParams[-1].collection, docIds: [p.id] }]);
        FB_CACHE[cacheKey] = payload;
      });
    }
    return true;
  } catch (error) {
    const objectPath = pathParamsToString(pathParams);
    throw new Error(`[RecL] Error writing ${objectPath}: ${formatError(error)}`);
  }
}

export async function freadBootConfig(testId: string): Promise<EmuBootConfig | null> {
  const result = await readObjectFromFirebase<FEmuBootConfig>({
    pathParams: [
      { collection: FB_1.SESSIONS, docIds: [testId] },
      { collection: FB_2.BOOT_CONFIG }
    ]
  });
  return result ? (result as FEmuBootConfig[])[0] : null;
}
export async function fwriteBootConfig(testId: string, bootConfig: DocumentWithId, options: Partial<EmuWriteOptions> = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docIds: [testId] },
      { collection: FB_2.BOOT_CONFIG }
    ],
    payload: [bootConfig],
    ...options
  });
}


export async function freadEmulatorState(testId: string): Promise<EmuEmulatorState | null> {
  const result = await readObjectFromFirebase<FEmuEmulatorState>({
    pathParams: [
      { collection: FB_1.SESSIONS, docIds: [testId] },
      { collection: FB_2.EMULATOR_STATE }
    ],
  });
  return result ? (result as FEmuEmulatorState[])[0] : null;
}
export async function fwriteEmulatorState(testId: string, emulatorState: DocumentWithId, options: Partial<EmuWriteOptions> = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docIds: [testId] },
      { collection: FB_2.EMULATOR_STATE }
    ],
    payload: [emulatorState],
    ...options
  });
}


export async function freadAgentState(testId: string): Promise<EmuAgentState | null> {
  const result = await readObjectFromFirebase<FEmuAgentState>({
    pathParams: [
      { collection: FB_1.SESSIONS, docIds: [testId] },
      { collection: FB_2.AGENT_STATE }
    ],
  });
  return result ? (result as FEmuAgentState[])[0] : null;
}
export async function fwriteAgentState(testId: string, agentState: DocumentWithId, options: Partial<EmuWriteOptions> = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docIds: [testId] },
      { collection: FB_2.AGENT_STATE }
    ],
    payload: [agentState],
    ...options
  });
}


export async function freadTestState(testId: string): Promise<EmuTestState | null> {
  const result = await  readObjectFromFirebase<FEmuTestState>({
    pathParams: [
      { collection: FB_1.SESSIONS, docIds: [testId] },
      { collection: FB_2.TEST_STATE }
    ],
  });
  return result ? (result as FEmuTestState[])[0] : null;
}
export async function fwriteTestState(testId: string, testState: DocumentWithId, options: Partial<EmuWriteOptions> = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docIds: [testId] },
      { collection: FB_2.TEST_STATE }
    ],
    payload: [testState],
    ...options
  });
}


export async function freadSharedTestState(testId: string): Promise<EmuSharedTestState | null> {
  const result = await  readObjectFromFirebase<FEmuSharedTestState>({
    pathParams: [
      { collection: FB_1.SESSIONS, docIds: [testId] },
      { collection: FB_2.SHARED_STATE }
    ],
  });
  return result ? (result as FEmuSharedTestState[])[0] : null;
}
export async function fwriteSharedTestState(testId: string, sharedState: DocumentWithId, options: Partial<EmuWriteOptions> = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docIds: [testId] },
      { collection: FB_2.SHARED_STATE }
    ],
    payload: [sharedState],
    ...options
  });
}


export async function freadAgentLogs(testId: string): Promise<EmuLogBlock[] | null> {
  const result = await readObjectFromFirebase<FEmuLogBlock>({
    pathParams: [
      { collection: FB_1.SESSIONS, docIds: [testId] },
      { collection: FB_2.AGENT_LOGS }
    ],
  });
  return result ? sortResultsByCreatedAt((result as FEmuLogBlock[]), true) : null;
}
export async function fwriteAgentLogs(testId: string, logs: DocumentWithId[], options: Partial<EmuWriteOptions> = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docIds: [testId] },
      { collection: FB_2.AGENT_LOGS }
    ],
    payload: logs,
    ...options
  });
}


export async function freadDevLogs(testId: string): Promise<EmuLogBlock[] | null> {
  const result = await readObjectFromFirebase<FEmuLogBlock>({
    pathParams: [
      { collection: FB_1.SESSIONS, docIds: [testId] },
      { collection: FB_2.DEV_LOGS },
    ],
  });
  return result ? sortResultsByCreatedAt((result as FEmuLogBlock[]), true) : null;
}
export async function fwriteDevLogs(testId: string, logs: DocumentWithId[], options: Partial<EmuWriteOptions> = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.SESSIONS, docIds: [testId] },
      { collection: FB_2.DEV_LOGS },
    ],
    payload: logs,
    ...options
  });
}


export async function freadTraceLogs(traceId: string): Promise<EmuTraceLog[] | null> {
  const result = await readObjectFromFirebase<FEmuTraceLog>({
    pathParams: [
      { collection: FB_1.TRACES, docIds: [traceId] },
      { collection: FB_2.TRACE_LOGS,  }
    ],
  });
  return result ? sortResultsByCreatedAt((result as FEmuTraceLog[]), true) : null;
}
export async function fwriteTraceLogs(traceId: string, logs: DocumentWithId[], options: Partial<EmuWriteOptions> = {}) {
  console.log(logs.map(l => l.message).join('\n'));
  return true;
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.TRACES, docIds: [traceId] },
      { collection: FB_2.TRACE_LOGS }
    ],
    payload: logs,
    ...options
  });
}


export async function freadTracesByTestId(testId: string): Promise<EmuTrace[] | null> {
  const traces = await readObjectFromFirebase<FEmuTrace>({
    pathParams: [
      { collection: FB_1.TRACES },
    ],
    where: [['testId', '==', testId]]
  });
  const results = await Promise.all((traces as FEmuTrace[] || []).map(async (trace) => {
    const logs = await freadTraceLogs(trace.id);
    return {
      ...trace,
      logs: logs || []
    };
  }));
  return results;
}

// TODO: Fix this lol
export async function fwriteNewTrace(traceId: string, testId: string, options: Partial<EmuWriteOptions> = {}) {
  return true;
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.TRACES, docIds: [traceId] },
    ],
    payload: [{ id: traceId, testId }],
    ...options
  });
}

export async function freadTestRuns(ids: string[], options: Partial<EmuReadOptions> = {}): Promise<EmuTestRun[] | null> {
  const result = await readObjectFromFirebase<FEmuTestRun>({
    pathParams: [
      { collection: FB_1.TEST_RUNS, docIds: ids.length > 0 ? ids : undefined },
    ],
    ...options
  });
  return result as EmuTestRun[] | null;
}
export async function fwriteTestRun(testRun: EmuTestRun, options: Partial<EmuWriteOptions> = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.TEST_RUNS }
    ],
    payload: [testRun],
    ...options
  });
}

export async function freadExperiment(experimentId: string, options: Partial<EmuReadOptions> = {}): Promise<EmuExperiment[] | null | EmuFirebaseTransactionFunction[]> {
  const result = await readObjectFromFirebase<FEmuExperiment>({
    pathParams: [
      { collection: FB_1.EXPERIMENTS, docIds: [experimentId] },
    ],
    ...options
  });
  return result as EmuExperiment[] | null;
}
export async function fwriteExperiment(experiment: Partial<EmuExperiment> & { id: string }, options: Partial<EmuWriteOptions> = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.EXPERIMENTS }
    ],
    payload: [experiment],
    ...options
  });
}

export async function freadJobs(ids: string[], options: Partial<EmuReadOptions> = {}): Promise<EmuTestQueueJob[] | null | EmuFirebaseTransactionFunction[]> {
  const result = await readObjectFromFirebase<FEmuTestQueueJob>({
    pathParams: [
      { collection: FB_1.TEST_QUEUE, docIds: ids.length > 0 ? ids : undefined },
    ],
    ...options
  });
  if (typeof result === 'function' || !result) {
    return result;
  }
  return result ? sortResultsByCreatedAt(result as FEmuTestQueueJob[], true) : null;
}
export async function fwriteJobs(jobs: (Partial<EmuTestQueueJob> & { id: string })[], options: Partial<EmuWriteOptions> = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.TEST_QUEUE }
    ],
    payload: jobs,
    ...options
  });
}
export async function fattemptClaimJob(jobId: string): Promise<EmuTestQueueJob | null> {
  const jobTransactionFunction = async (transaction: FirebaseFirestore.Transaction, metadata: Record<string, any>) => {
    const result = await firebaseService.readTransaction(
      transaction,
      {
        pathParams: [
          { collection: FB_1.TEST_QUEUE, docIds: [jobId] }
        ],
      }
    ) as EmuTestQueueJob[];
    if (!result || result.length === 0 || result[0].status !== 'pending') {
      throw new Error('Job already claimed');
    }
    const jobDoc = result[0];
    const startedAt = FieldValue.serverTimestamp();
    await firebaseService.writeTransaction(
      transaction,
      {
        pathParams: [
          { collection: FB_1.TEST_QUEUE, docIds: [jobId] }
        ],
        payload: [{ id: jobId, status: 'running', startedAt }],
        update: true
      }
    );
    return [{ ...jobDoc, status: 'running', startedAt } as EmuTestQueueJob];
  };
  const success = await firebaseService.runTransactions([jobTransactionFunction]);
  if (success) {
    return success[0] as EmuTestQueueJob;
  }
  return null;
}
export async function fmarkJobComplete(jobId: string, experimentId: string | null, testRun: EmuTestRun | null): Promise<void> {
  const deleteJobPromise = firebaseService.delete({
    pathParams: [
      { collection: FB_1.TEST_QUEUE, docIds: [jobId] }
    ]
  });
  if (!experimentId) {
    await deleteJobPromise;
    return;
  }

  const experimentTransactionFunction = async (transaction: FirebaseFirestore.Transaction, metadata: Record<string, any>) => {
    const result = await firebaseService.readTransaction(
      transaction,
      {
        pathParams: [
          { collection: FB_1.EXPERIMENTS, docIds: [experimentId] }
        ],
      }
    ) as EmuExperiment[];
    if (!result || result.length === 0) {
      throw new Error('Experiment not found');
    }
    const experiment = result[0];
    const experimentComplete = experiment.completedTestRunIds.length + 1 >= experiment.totalTestRuns;
    const experimentUpdate = {
      id: experimentId,
      status: experimentComplete ? 'completed' : experiment.status,
      completedTestRunIds: testRun ? [...experiment.completedTestRunIds, testRun.id] : experiment.completedTestRunIds,
    };
    await firebaseService.writeTransaction(
      transaction,
      {
        pathParams: [
          { collection: FB_1.EXPERIMENTS, docIds: [experimentId] }
        ],
        payload: [experimentUpdate],
        update: true
      }
    );
  };
  await Promise.all([
    deleteJobPromise,
    firebaseService.runTransactions([experimentTransactionFunction])
  ]);
}


export async function freadAgentJobs(ids: string[], options: Partial<EmuReadOptions> = {}): Promise<EmuAgentJob[] | null | EmuFirebaseTransactionFunction[]> {
  const result = await readObjectFromFirebase<FEmuAgentJob>({
    pathParams: [
      { collection: FB_1.AGENT_JOBS, docIds: ids.length > 0 ? ids : undefined },
    ],
    ...options
  });
  if (typeof result === 'function' || !result) {
    return result;
  }
  return result ? sortResultsByCreatedAt(result as FEmuAgentJob[], true) : null;
}
export async function fwriteAgentJobs(jobs: (Partial<EmuAgentJob> & { id: string })[], options: Partial<EmuWriteOptions> = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.AGENT_JOBS }
    ],
    payload: jobs,
    ...options
  });
}
