import { sessionService } from "@/services/session.service";
import { Request, Response } from "express";

const sessionIdHeader = "x-dmcp-session-id";

export function sessionMiddleware(req: Request, res: Response, next: () => void) {
  const sessionId = req.headers[sessionIdHeader];
    
  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).send({ error: "Must include valid 'x-dmcp-session-id' header" });
    return;
  }

  if (!sessionService.sessions[sessionId]) {
    sessionService.createSession(sessionId);
  }

  req.emuSession = sessionService.sessions[sessionId];
  next();
}
