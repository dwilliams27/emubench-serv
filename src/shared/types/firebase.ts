import { EmuAgentState, EmuBootConfig, EmuEmulatorState, EmuLogBlock, EmuTraceLog, EmuServiceName, EmuSharedTestState, EmuTestState, EmuTrace } from "@/shared/types";
import { EmuAgentJob } from "@/shared/types/agent";
import { EmuExperiment, EmuTestQueueJob } from "@/shared/types/experiments";
import { EmuTestRun } from "@/shared/types/test-run";

export interface DocumentWithId {
  id: string;
  [key: string]: any;
};

export interface FirebaseTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

export interface FirebasePathParam {
  collection: string;
  docIds?: string[];
};

// Top level firebase collections
export const FB_1 = {
  SESSIONS: 'SESSIONS',
  TEST_QUEUE: 'TEST_QUEUE',
  TEST_RUNS: 'TEST_RUNS',
  EXPERIMENTS: 'EXPERIMENTS',
  TRACES: 'TRACES',
  AGENT_JOBS: 'AGENT_JOBS',
} as const;

export const FB_2 = {
  // SESSIONS
  AGENT_STATE: 'AGENT_STATE',
  TEST_STATE: 'TEST_STATE',
  EMULATOR_STATE: 'EMULATOR_STATE',
  SHARED_STATE: 'SHARED_STATE',
  BOOT_CONFIG: 'BOOT_CONFIG',
  AGENT_LOGS: 'AGENT_LOGS',
  DEV_LOGS: 'DEV_LOGS',

  // TRACES
  TRACE_LOGS: 'TRACE_LOGS',

  // EXPERIMENTS
  RESULTS: 'RESULTS',
} as const;

export interface FEmuBaseObject {
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  deletedAt: FirebaseTimestamp | null;
  id: string;
};

export const EmuCollectionOwnership: { [key: string]: EmuServiceName[] } = {
  [FB_2.AGENT_STATE]: [],
  [FB_2.TEST_STATE]: [],
  [FB_2.EMULATOR_STATE]: [],
  [FB_2.SHARED_STATE]: [],
  [FB_2.BOOT_CONFIG]: ["SERV"],
  [FB_2.AGENT_LOGS]: [],
  [FB_2.DEV_LOGS]: [],
  [FB_2.TRACE_LOGS]: [],
};

export interface FEmuTest extends FEmuBaseObject {};
export interface FEmuBootConfig extends FEmuBaseObject, EmuBootConfig {};
export interface FEmuTestState extends FEmuBaseObject, EmuTestState {};
export interface FEmuEmulatorState extends FEmuBaseObject, EmuEmulatorState {};
export interface FEmuAgentState extends FEmuBaseObject, EmuAgentState {};
export interface FEmuSharedTestState extends FEmuBaseObject, EmuSharedTestState {};
export interface FEmuLogBlock extends FEmuBaseObject, EmuLogBlock {};
export interface FEmuTrace extends FEmuBaseObject, Omit<EmuTrace, "logs"> {};
export interface FEmuTraceLog extends FEmuBaseObject, EmuTraceLog {};

export interface FEmuTestRun extends FEmuBaseObject, EmuTestRun {};

export interface FEmuExperiment extends FEmuBaseObject, Omit<EmuExperiment, "RESULTS"> {};
export interface FEmuTestQueueJob extends FEmuBaseObject, EmuTestQueueJob {};

export interface FEmuAgentJob extends FEmuBaseObject, EmuAgentJob {};
