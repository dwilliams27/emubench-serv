import { v4 as uuidv4 } from 'uuid';

export const TEST_ID = 'tst';
export const EXCHANGE_TOKEN_ID = 'extk'

export function genId(prefix: string): string {
  return `${prefix}-${uuidv4().replace(/-/g, '').substring(0, 16)}`;
}
