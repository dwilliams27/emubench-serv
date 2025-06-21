import { emulationService } from "@/services/emulation.service";
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

  getTestIdFromSessionId(session: EmuSession | undefined, sessionId: string): string | null {
    if (!session) return null;

    return Object.keys(session.activeTests).find((key) => session.activeTests[key].mcpSessionId === sessionId) || null;
  }

  async addMcpSession(session: EmuSession | undefined, mcpSessionId: string, testId: string, transport: StreamableHTTPServerTransport) {
    if (!session) {
      console.error(`No session found for MCP session ID: ${mcpSessionId}`);
      return;
    }

    session.mcpSessions[mcpSessionId] = transport;
    this.mcpSessions[mcpSessionId] = [session.activeTests[testId], transport];

    const activeTest = session.activeTests[testId];
    await emulationService.startTest(activeTest);
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
