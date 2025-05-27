import { MemoryWatch } from "@/types/gamecube";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Request, Response } from "express";

export interface TestOrxTransport {
  req: Request;
  res: Response;
}

export interface ContainerInstance {
  id: string;
  url: string;
  status: 'starting' | 'running' | 'stopped';
  createdAt: Date;
}

export interface TestConfig {
  autoStart: boolean;
  gameId: string;
  gamePath: string;
  platform: 'gamecube';
  startStateFilename: string;
  contextMemWatches: Record<string, MemoryWatch>;
  endStateMemWatches: Record<string, MemoryWatch>;
};

export interface TestState {
  setup: boolean;
  started: boolean;
  finished: boolean;
  contextMemWatches: Record<string, string>;
  endStateMemWatches: Record<string, string>;
}

export interface ActiveTest {
  id: string;
  config: TestConfig;
  state: TestState;
  container: ContainerInstance;
  // TODO: Maybe rethink this, but my dude is already authed?
  authKey: string;
}

export interface EmuSession {
  activeTests: Record<string, ActiveTest>;
  testOrxTransport?: TestOrxTransport;
  mcpTransport?: SSEServerTransport;
}
