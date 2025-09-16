import { FirebasePathParams } from "@/shared/services/firebase.service";
import { EmuBootConfig, EmuLogBlock, EmuSharedTestState, EmuTestState } from "@/shared/types";
import { HISTORY_ATOM_ID, HISTORY_ID, REPLAY_SLICE_ID, TEST_ID } from "@/shared/utils/id";

// Top level firebase collections
export const FB_1 = {
  SESSIONS: 'SESSIONS',
  HISTORY: 'HISTORY',
} as const;

export const FB_2 = {
  // SESSIONS
  AGENT_LOGS: 'AGENT_LOGS',
  AGENT_STATE: 'AGENT_STATE',
  TEST_STATE: 'TEST_STATE',
  SHARED_STATE: 'SHARED_STATE',
  BOOT_CONFIG: 'BOOT_CONFIG',
  DEV_LOGS: 'DEV_LOGS',

  // HISTORY
  HISTORY_ATOMS: 'HISTORY_ATOMS',
  REPLAY_SLICES: 'REPLAY_SLICES',
} as const;

export const ID_MAP: Record<string, (...args: any) => FirebasePathParams[]> = {
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
}

export interface FEmuBaseObject {
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
  deletedAt: FirebaseFirestore.FieldValue | null;
  id: string;
}

export interface FEmuTest extends FEmuBaseObject {}
export interface FEmuBootConfig extends FEmuBaseObject, EmuBootConfig {};
export interface FEmuTestState extends FEmuBaseObject, EmuTestState {}
export interface FEmuSharedTestState extends FEmuBaseObject, EmuSharedTestState {}
export interface FEmuLogBlock extends FEmuBaseObject, EmuLogBlock {}
