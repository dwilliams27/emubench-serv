import { v4 as uuidv4 } from 'uuid';

export const TEST_ID = 'tst';
export const MCP_SESSION_ID = 'mcp';

export function genId(prefix: string): string {
  return `${prefix}-${uuidv4().replace(/-/g, '').substring(0, 16)}`;
}
