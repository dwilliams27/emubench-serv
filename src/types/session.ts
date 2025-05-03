import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Request, Response } from "express";

export interface TestOrxTransport {
  id: string;
  req: Request;
  res: Response;
}

export interface TestConfig {
  gameId: string;
  startStateFilename: string;
  contextMemWatches: Record<string, string>;
  endStateMemWatches: Record<string, string>;
};

export interface DmcpSession {
  started: boolean;
  finished: boolean;
  activeTest?: TestConfig;
  testOrxTransport?: TestOrxTransport;
  mcpTransport?: SSEServerTransport;
}
