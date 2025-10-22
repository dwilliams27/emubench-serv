import { EmuAgentState, EmuBootConfig, EmuEmulatorState, EmuLogBlock, EmuTraceLog, EmuServiceName, EmuSharedTestState, EmuTestState, EmuTrace } from "@/shared/types";
import { EmuAgentJob } from "@/shared/types/agent";
import { EmuExperiment, EmuTestQueueJob } from "@/shared/types/experiments";
import { EmuTest } from "@/shared/types/test";
import { EmuTestResult } from "@/shared/types/test-result";

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
  TESTS: 'TESTS',
  TESTS_PUBLIC: 'TESTS_PUBLIC',
  TEST_QUEUE: 'TEST_QUEUE',
  TEST_RESULTS: 'TEST_RESULTS',
  EXPERIMENTS: 'EXPERIMENTS',
  TRACES: 'TRACES',
  AGENT_JOBS: 'AGENT_JOBS',
} as const;

export const FB_2 = {
  // TESTS
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

export interface FEmuTest extends FEmuBaseObject, EmuTest {};
export interface FEmuBootConfig extends FEmuBaseObject, EmuBootConfig {};
export interface FEmuTestState extends FEmuBaseObject, EmuTestState {};
export interface FEmuEmulatorState extends FEmuBaseObject, EmuEmulatorState {};
export interface FEmuAgentState extends FEmuBaseObject, EmuAgentState {};
export interface FEmuSharedTestState extends FEmuBaseObject, EmuSharedTestState {};
export interface FEmuLogBlock extends FEmuBaseObject, EmuLogBlock {};
export interface FEmuTrace extends FEmuBaseObject, Omit<EmuTrace, "logs"> {};
export interface FEmuTraceLog extends FEmuBaseObject, EmuTraceLog {};

export interface FEmuTestResult extends FEmuBaseObject, EmuTestResult {};

export interface FEmuExperiment extends FEmuBaseObject, Omit<EmuExperiment, "RESULTS"> {};
export interface FEmuTestQueueJob extends FEmuBaseObject, EmuTestQueueJob {};

export interface FEmuAgentJob extends FEmuBaseObject, EmuAgentJob {};
