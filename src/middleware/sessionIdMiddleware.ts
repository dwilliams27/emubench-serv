import { Request, Response } from "express";
import { DmcpSession } from "../types/session";
import { createNewSession } from "../sessions";

const sessionIdHeader = "x-dmcp-session-id";

export class SessionMiddleware {
  sessions: Record<string, DmcpSession>;

  constructor(sessions: Record<string, DmcpSession>) {
    this.sessions = sessions;
  }

  middleware = (req: Request, res: Response, next: () => void) => {
    const sessionId = req.headers[sessionIdHeader];
    
    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).send({ error: "Must include valid 'x-dmcp-session-id' header" });
      return;
    }

    if (!this.sessions[sessionId]) {
      this.sessions[sessionId] = createNewSession(res);
    }

    req.dmcpSession = this.sessions[sessionId];
    next();
  }

  async destroy() {
    for (const sessionId in this.sessions) {
      // Close MCP transports
      try {
        console.log(`Closing transport for session ${sessionId}`);
        await this.sessions[sessionId].mcpTransport?.close();
        delete this.sessions[sessionId];
      } catch (error) {
        console.error(`Error closing transport for session ${sessionId}:`, error);
      }
    }
  }
}
