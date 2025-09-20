import { EmuError } from '@/shared/types';
import { fwriteErrorToTraceLog } from '@/shared/utils/trace';
import { Response, Request } from 'express';

export function fhandleErrorResponse(error: unknown, req: Request, res: Response) {
  fwriteErrorToTraceLog(error, req.metadata?.trace);
  if (error instanceof EmuError) {
    res.status(400).send(`Error: ${error.message}`);
  } else {
    res.status(500).send('Internal server error');
  }
}
