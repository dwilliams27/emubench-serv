import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Request, Response } from "express";

export interface TestOrxTransport {
  req: Request;
  res: Response;
}

export interface TestConfig {
  gameId: string;
  gamePath: string;
  startStateFilename: string;
  contextMemWatches: string[];
  endStateMemWatches: string[];
};

export interface TestState {
  contextMemWatches: Record<string, string>;
  endStateMemWatches: Record<string, string>;
}

export interface DmcpSession {
  setup: boolean;
  started: boolean;
  finished: boolean;
  activeTest?: TestConfig;
  testState?: TestState;
  testOrxTransport?: TestOrxTransport;
  mcpTransport?: SSEServerTransport;
}
