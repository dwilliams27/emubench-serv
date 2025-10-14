import { EmuSession } from "@/types/session";

export class SessionService {
  private sessions: Record<string, EmuSession> = {};
  private debugSharedSession: EmuSession = {
    activeTests: {},
  };

  createSession(sessionId: string) {
    // this.sessions[sessionId] = {
    //   activeTests: {},
    // };
    // return this.sessions[sessionId];
    return this.debugSharedSession;
  }

  getSession(sessionId: string): EmuSession | undefined {
    // return this.sessions[sessionId];
    return this.debugSharedSession;
  }

  isValidSession(sessionId: string): boolean {
    // return !!this.sessions[sessionId];
    return true;
  }
}

const sessionService = new SessionService();

export { sessionService };
