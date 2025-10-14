import { fwriteNewTrace, fwriteTraceLogs } from "@/shared/services/resource-locator.service";
import { EmuError, EmuTraceLog, EmuReqTraceMetadata } from "@/shared/types";
import { genId, TRACE_LOG_ID } from "@/shared/utils/id";

// TODO: Bad
const seenTraces = new Set<string>();

export async function fwriteFormattedTraceLog(message: string, metadata?: EmuReqTraceMetadata, level: 'info' | 'error' = 'info') {
  if (!metadata) {
    return;
  }
  const traceId = metadata.id;
  if (!seenTraces.has(traceId)) {
    seenTraces.add(traceId);
    if (seenTraces.size > 2000) {
      seenTraces.clear();
    }
    await fwriteNewTrace(traceId, metadata.testId || 'NULL');
  }
  const timestamp = (new Date()).toISOString();
  const log: EmuTraceLog = {
    timestamp: timestamp,
    level,
    message: `${level}:${metadata.service}:${metadata.reqId} - ${message}`,
    id: genId(TRACE_LOG_ID),
  };
  
  await fwriteTraceLogs(traceId, [log]);
}

export function fwriteErrorToTraceLog(error: unknown, metadata?: EmuReqTraceMetadata) {
  if (!metadata) {
    return;
  }
  if (error instanceof EmuError) {
    fwriteFormattedTraceLog(`${error.message}`, metadata, 'error');
  } else {
    fwriteFormattedTraceLog(`Unknown error (500)`, metadata, 'error');
  }
}
