import { EmuSession } from "@/types/session";

export class SessionService {
  private sessions: Record<string, EmuSession> = {};

  createSession(sessionId: string) {
    this.sessions[sessionId] = {
      activeTests: {},
    };
    return this.sessions[sessionId];
  }

  getSession(sessionId: string): EmuSession | undefined {
    return this.sessions[sessionId];
  }

  isValidSession(sessionId: string): boolean {
    return !!this.sessions[sessionId];
  }
}

const sessionService = new SessionService();

export { sessionService };
