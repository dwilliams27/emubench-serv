import { sessionService } from "@/services/session.service";
import { extractBearerToken } from "@/utils/auth";
import { Request, Response } from "express";

export function sessionMiddleware(req: Request, res: Response, next: () => void) {
  const sessionId = extractBearerToken(req);
    
  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).send({ error: "Must include valid 'authorization' header" });
    return;
  }

  if (!sessionService.sessions[sessionId]) {
    sessionService.createSession(sessionId);
  }

  req.emuSession = sessionService.sessions[sessionId];
  next();
}
