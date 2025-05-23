import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Request, Response } from "express";
import { MemoryWatch } from "./gamecube";

export interface TestOrxTransport {
  req: Request;
  res: Response;
}

export interface TestConfig {
  autoStart: boolean;
  gameId: string;
  gamePath: string;
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
}

export interface DmcpSession {
  activeTests: Record<string, ActiveTest>;
  testOrxTransport?: TestOrxTransport;
  mcpTransport?: SSEServerTransport;
}
