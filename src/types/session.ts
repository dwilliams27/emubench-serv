import { MemoryWatch } from "@/types/gamecube";
import { protos } from "@google-cloud/run";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export interface ContainerInstance {
  id: string;
  url: string;
  status: 'starting' | 'running' | 'stopped';
  createdAt: Date;
}

export interface EmuTestConfig {
  id: string;
  gameId: string;
  platform: 'gamecube';
  startStateFilename: string;
  contextMemWatches: Record<string, MemoryWatch>;
  endStateMemWatches: Record<string, MemoryWatch>;
};

// Read in from file
export interface EmuTestState {
  state: 'booting' | 'ready' | 'running' | 'finished';
}

export interface EmuTestMemoryState {
  contextMemWatchValues: Record<string, string>;
  endStateMemWatchValues: Record<string, string>;
}

export interface ActiveTest {
  id: string;
  mcpSessionId: string;
  emuConfig: EmuTestConfig;
  emuTestState: EmuTestState;
  emuTestMemoryState: EmuTestMemoryState;
  container: protos.google.cloud.run.v2.IService;
  googleToken: string;
}

export interface EmuSession {
  activeTests: Record<string, ActiveTest>;
  mcpSessions: Record<string, StreamableHTTPServerTransport>;
}

export const SESSION_FUSE_PATH = '/tmp/gcs/emubench-sessions/';
