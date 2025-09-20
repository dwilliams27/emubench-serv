import { EmuError } from "@/shared/types";

export function formatError(error: unknown) {
  return `${(error as any).message || ''} ${(error as any).response?.data || ''}`.trim();
}

export function createEmuError(payload: unknown) {
  if (typeof payload === 'string') {
    return new EmuError(payload);
  }
  if (payload instanceof Error) {
    return new EmuError(payload.message);
  }
  return new Error('An unknown error occurred');
}
