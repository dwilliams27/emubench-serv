import { v4 as uuidv4 } from 'uuid';

export const EXCHANGE_TOKEN_ID = 'extk';
export const EMU_OPERATION_ID = 'emuop';
export const CANVAS_ITEM_ID = 'cvs';
export const REQ_ID = 'req';

export const TEST_ID = 'tst';
export const BOOT_CONFIG_ID = 'bootcfg';
export const TEST_STATE_ID = 'tstate';
export const AGENT_STATE_ID = 'astate';
export const EMULATOR_STATE_ID = 'estate';
export const SHARED_TEST_STATE_ID = 'ststate';
export const LOG_BLOCK_ID = 'logb';
export const TRACE_ID = 'trace';
export const TRACE_LOG_ID = 'trlog';

export const HISTORY_ID = 'hist';
export const HISTORY_SLICE_ID = 'hslice';
export const HISTORY_ATOM_ID = 'hatom';

export const EXPERIMENT_ID = 'exp';

// Ids used for firebase docs
export const FID_LIST = [
  TEST_ID,
  BOOT_CONFIG_ID,
  TEST_STATE_ID,
  AGENT_STATE_ID,
  EMULATOR_STATE_ID,
  SHARED_TEST_STATE_ID,
  LOG_BLOCK_ID,
  TRACE_LOG_ID,
  TRACE_ID,
];

export function genId(prefix: string): string {
  return `${prefix}-${uuidv4().replace(/-/g, '').substring(0, 16)}`;
}
