import { fwriteTraceLogs } from "@/shared/services/resource-locator.service";
import { EmuError, EmuReqTraceLog, EmuReqTraceMetadata } from "@/shared/types";

export async function fwriteFormattedTraceLog(message: string, metadata?: EmuReqTraceMetadata, level: 'info' | 'error' = 'info') {
  if (!metadata) {
    return;
  }
  const timestamp = (new Date()).toISOString();
  const log: EmuReqTraceLog = {
    timestamp: timestamp,
    level,
    message: `${level}:${metadata.service}:${metadata.reqId} - ${message}`,
    id: metadata.id,
  };
  
  await fwriteTraceLogs(metadata.id, [log]);
}

export function fwriteErrorToTraceLog(error: unknown, metadata?: EmuReqTraceMetadata) {
  if (!metadata) {
    return;
  }
  if (error instanceof EmuError) {
    fwriteFormattedTraceLog(`Emulator setup failed: ${error.message}`, metadata, 'error');
  } else {
    fwriteFormattedTraceLog(`Emulator setup failed: Unknown error (500)`, metadata, 'error');
  }
}
