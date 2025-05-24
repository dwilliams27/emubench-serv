import { DmcpSession } from "@/types/session";

export class SessionService {
  sessions: Record<string, DmcpSession> = {};

  createSession(sessionId: string) {
    this.sessions[sessionId] = {
      activeTests: {}
    };
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

const sessionService = new SessionService();

export { sessionService };
