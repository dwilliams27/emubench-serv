import { EmuAgentState, EmuBootConfig, EmuEmulatorState, EmuLogBlock, EmuTraceLog, EmuServiceName, EmuSharedTestState, EmuTestState, EmuTrace } from "@/shared/types";
import { EmuHistoryAtom, EmuReplaySlice, EmuTestRun } from "@/shared/types/history";
import { HISTORY_ATOM_ID, HISTORY_ID, REPLAY_SLICE_ID, TEST_ID } from "@/shared/utils/id";

export type DocumentWithId = {
  id: string;
  [key: string]: any;
};

export interface FirebasePathParam {
  collection: string;
  docId?: string;
};

// Top level firebase collections
export const FB_1 = {
  SESSIONS: 'SESSIONS',
  HISTORY: 'HISTORY',
  TRACES: 'TRACES',
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

  // HISTORY
  HISTORY_ATOMS: 'HISTORY_ATOMS',
  REPLAY_SLICES: 'REPLAY_SLICES',
  TEST_RUN: 'TEST_RUN',

  // TRACES
  TRACE_LOGS: 'TRACE_LOGS',
} as const;

export const ID_MAP: Record<string, (...args: any) => FirebasePathParam[]> = {
 [TEST_ID]: (testId: string) => [{ collection: FB_1.SESSIONS, docId: testId }],
 [HISTORY_ID]: (historyId: string) => [{ collection: FB_1.HISTORY, docId: historyId }],
 [HISTORY_ATOM_ID]: (historyId: string, atomId: string) => [
   { collection: FB_1.HISTORY, docId: historyId },
   { collection: FB_2.HISTORY_ATOMS, docId: atomId }
 ],
 [REPLAY_SLICE_ID]: (historyId: string, sliceId: string) => [
    { collection: FB_1.HISTORY, docId: historyId },
    { collection: FB_2.REPLAY_SLICES, docId: sliceId }
  ],
};

export interface FEmuBaseObject {
  // TODO: Fix
  createdAt: {
    "_seconds": number,
    "_nanoseconds": number
  };
  updatedAt: FirebaseFirestore.FieldValue;
  deletedAt: FirebaseFirestore.FieldValue | undefined;
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

export interface FEmuHistoryAtom extends FEmuBaseObject, EmuHistoryAtom {};
export interface FEmuReplaySlice extends FEmuBaseObject, EmuReplaySlice {};
export interface FEmuTestRun extends FEmuBaseObject, EmuTestRun {};
