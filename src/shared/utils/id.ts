import { v4 as uuidv4 } from 'uuid';

export const TEST_ID = 'tst';
export const EXCHANGE_TOKEN_ID = 'extk';
export const EMU_OPERATION_ID = 'emuop';
export const CANVAS_ITEM_ID = 'cvs';

export const HISTORY_ID = 'hist';
export const REPLAY_SLICE_ID = 'rslice';
export const HISTORY_ATOM_ID = 'hatom';

export const BOOT_CONFIG_ID = 'bootcfg';
export const TEST_STATE_ID = 'tstate';
export const SHARED_TEST_STATE_ID = 'ststate';
export const LOG_BLOCK_ID = 'logb';

// Ids used for firebase docs
export const FID_LIST = [
  TEST_ID,
  HISTORY_ID,
  REPLAY_SLICE_ID,
  HISTORY_ATOM_ID,
];

export function genId(prefix: string): string {
  return `${prefix}-${uuidv4().replace(/-/g, '').substring(0, 16)}`;
}
