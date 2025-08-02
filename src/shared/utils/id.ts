import { v4 as uuidv4 } from 'uuid';

export const TEST_ID = 'tst';
export const EXCHANGE_TOKEN_ID = 'extk';
export const EMU_OPERATION_ID = 'emuop';
export const CANVAS_ITEM_ID = 'cvs';

export function genId(prefix: string): string {
  return `${prefix}-${uuidv4().replace(/-/g, '').substring(0, 16)}`;
}
