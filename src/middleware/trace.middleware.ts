import { EMU_TRACE_HEADER } from '@/shared/types';
import { genId, REQ_ID, TRACE_ID } from '@/shared/utils/id';
import { Request, Response, NextFunction } from 'express';

export async function traceMiddleware(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  const unvalidatedTraceId = req.headers[EMU_TRACE_HEADER] || genId(TRACE_ID);
  if (typeof unvalidatedTraceId === 'string' && unvalidatedTraceId.length > 0 && unvalidatedTraceId.length < 100) {
    const validTraceId = unvalidatedTraceId;
    req.metadata = {
      trace: {
        id: validTraceId,
        reqId: genId(REQ_ID),
        service: 'SERV',
        testId: req.params?.testId || req.body?.testId || undefined,
      }
    };
  }
  if (req.metadata?.trace?.id) {
    res.setHeader(EMU_TRACE_HEADER, req.metadata.trace.id);
  }
  next();
}
