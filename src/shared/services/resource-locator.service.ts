import { firebaseService } from "@/shared/services/firebase.service";
import { EmuTraceLog, EmuServiceName, EmuTrace, EmuLogBlock } from "@/shared/types";
import { DocumentWithId, FB_1, FB_2, FEmuAgentJob, FEmuBaseObject, FEmuExperiment, FEmuLogBlock, FEmuTest, FEmuTestQueueJob, FEmuTestResult, FEmuTrace, FEmuTraceLog, FirebasePathParam } from "@/shared/types/firebase";
import { EmuTestResult } from "@/shared/types/test-result";
import { EmuFirebaseTransactionFunction, EmuReadOptions, EmuWriteOptions } from "@/shared/types/resource-locator";
import { formatError } from "@/shared/utils/error";
import { EmuExperiment, EmuTestQueueJob } from "@/shared/types/experiments";
import { EmuAgentJob } from "@/shared/types/agent";
import { FieldValue } from "firebase-admin/firestore";
import { EmuTest } from "@/shared/types/test";

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

function pathParamsToString(pathParams: FirebasePathParam[]) {
  return pathParams.map(p => p.docIds ? `${p.collection}/${p.docIds}` : p.collection).join('/')
};

async function readObjectFromFirebase<T extends FEmuBaseObject>(options: EmuReadOptions): Promise<T[] | null> {
  const { pathParams } = options;
  const objectPath = pathParamsToString(pathParams);

  try {
    const objects = await firebaseService.read(options);
    return objects as unknown as T[];
  } catch (error) {
    throw new Error(`[RecL] Error reading ${objectPath}: ${formatError(error)}`);
  }
}

async function writeObjectToFirebase(options: EmuWriteOptions): Promise<boolean> {
  const { pathParams } = options;
  try {
    const result = await firebaseService.write(options);
    return true;
  } catch (error) {
    const objectPath = pathParamsToString(pathParams);
    throw new Error(`[RecL] Error writing ${objectPath}: ${formatError(error)}`);
  }
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

export async function freadAgentLogs(testId: string): Promise<EmuLogBlock[] | null> {
  const result = await readObjectFromFirebase<FEmuLogBlock>({
    pathParams: [
      { collection: FB_1.TESTS, docIds: [testId] },
      { collection: FB_2.AGENT_LOGS }
    ],
  });
  return result ? sortResultsByCreatedAt((result as FEmuLogBlock[]), true) : null;
}
export async function fwriteAgentLogs(testId: string, logs: DocumentWithId[], options: Partial<EmuWriteOptions> = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.TESTS, docIds: [testId] },
      { collection: FB_2.AGENT_LOGS }
    ],
    payload: logs,
    ...options
  });
}


export async function freadDevLogs(testId: string): Promise<EmuLogBlock[] | null> {
  const result = await readObjectFromFirebase<FEmuLogBlock>({
    pathParams: [
      { collection: FB_1.TESTS, docIds: [testId] },
      { collection: FB_2.DEV_LOGS },
    ],
  });
  return result ? sortResultsByCreatedAt((result as FEmuLogBlock[]), true) : null;
}
export async function fwriteDevLogs(testId: string, logs: DocumentWithId[], options: Partial<EmuWriteOptions> = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.TESTS, docIds: [testId] },
      { collection: FB_2.DEV_LOGS },
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

export async function freadTestResults(ids: string[], options: Partial<EmuReadOptions> = {}): Promise<EmuTestResult[] | null> {
  const result = await readObjectFromFirebase<FEmuTestResult>({
    pathParams: [
      { collection: FB_1.TEST_RESULTS, docIds: ids.length > 0 ? ids : undefined },
    ],
    ...options
  });
  return result as EmuTestResult[] | null;
}
export async function fwriteTestResult(testResult: EmuTestResult, options: Partial<EmuWriteOptions> = {}) {
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.TEST_RESULTS }
    ],
    payload: [testResult],
    ...options
  });
}

export async function freadTest(testId: string, options: Partial<EmuReadOptions> = {}): Promise<EmuTest | null> {
  const result = await readObjectFromFirebase<FEmuTest>({
    pathParams: [
      { collection: FB_1.TESTS, docIds: [testId] },
    ],
    ...options
  });
  if (result) {
    return result[0] as EmuTest;
  }
  return null;
}
function testToPublic(test: Partial<EmuTest> & { id: string }) {
  return {
    id: test.id,
    ...(test.agentState && { agentState: test.agentState }),
    ...(test.testState && { testState: test.testState }),
    ...(test.emulatorState && { emulatorState: test.emulatorState }),
    ...(test.bootConfig && { bootConfig: test.bootConfig })
  };
}
function testFieldsToPublic(fields: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(fields).filter(([key]) =>
      !key.startsWith('sharedState') &&
      !key.startsWith('agentLogs') &&
      !key.startsWith('devLogs')
    )
  );
}
export async function fwriteTest(test: Partial<EmuTest> & { id: string }, options: Partial<EmuWriteOptions> = {}) {
  await writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.TESTS_PUBLIC }
    ],
    payload: [testToPublic(test)],
    ...options
  });
  return writeObjectToFirebase({
    pathParams: [
      { collection: FB_1.TESTS }
    ],
    payload: [test],
    ...options
  });
}
export async function fwriteTestFields(testId: string, fields: Record<string, any>) {
   await firebaseService.updateFields(
    [{ collection: FB_1.TESTS_PUBLIC }],
    [{ id: testId, fields: testFieldsToPublic(fields) }]
  );
  const result = await firebaseService.updateFields(
    [{ collection: FB_1.TESTS }],
    [{ id: testId, fields }]
  );
  return result;
}


export async function freadExperiment(experimentId: string, options: Partial<EmuReadOptions> = {}): Promise<EmuExperiment[] | null> {
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
export async function fmarkJobComplete(jobId: string, experimentId: string | null, testResult: EmuTestResult | null): Promise<void> {
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
      completedTestRunIds: testResult ? [...experiment.completedTestRunIds, testResult.id] : experiment.completedTestRunIds,
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
