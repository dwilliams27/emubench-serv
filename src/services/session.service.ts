import { ActiveTest, EmuSession } from "@/types/session";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export class SessionService {
  private sessions: Record<string, EmuSession> = {};
  private mcpSessions: Record<string, [ActiveTest, StreamableHTTPServerTransport]> = {};

  createSession(sessionId: string) {
    this.sessions[sessionId] = {
      activeTests: {},
      mcpSessions: {}
    };
  }

  getSession(sessionId: string): EmuSession | undefined {
    return this.sessions[sessionId];
  }

  isValidSession(sessionId: string): boolean {
    return !!this.sessions[sessionId];
  }

  addMcpSession(session: EmuSession | undefined, mcpSessionId: string, transport: StreamableHTTPServerTransport) {
    if (!session) {
      console.error(`No session found for MCP session ID: ${mcpSessionId}`);
      return;
    }

    const testId = Object.keys(session.activeTests).find((key) => session.activeTests[key].mcpSessionId === mcpSessionId);
    if (!testId) {
      console.error(`No active test found for MCP session ID: ${mcpSessionId}`);
      return;
    }

    session.mcpSessions[mcpSessionId] = transport;
    this.mcpSessions[mcpSessionId] = [session.activeTests[testId], transport];
  }

  destroyMcpSession(mcpSessionId: string) {
    delete this.mcpSessions[mcpSessionId];
  }

  getMcpSession(mcpSessionId: string): [ActiveTest, StreamableHTTPServerTransport] | undefined {
    return this.mcpSessions[mcpSessionId];
  }
}

const sessionService = new SessionService();

export { sessionService };
