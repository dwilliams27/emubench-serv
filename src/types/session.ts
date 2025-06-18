import { MemoryWatch } from "@/types/gamecube";
import { protos } from "@google-cloud/run";
import { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export interface ContainerInstance {
  id: string;
  url: string;
  status: 'starting' | 'running' | 'stopped';
  createdAt: Date;
}

export interface TestConfig {
  gameId: string;
  platform: 'gamecube';
  startStateFilename: string;
  contextMemWatches: Record<string, MemoryWatch>;
  endStateMemWatches: Record<string, MemoryWatch>;
};

export interface TestState {
  setup: boolean;
  started: boolean;
  finished: boolean;
  images: string[];
  messages: string[];
  contextMemWatchValues: Record<string, string>;
  endStateMemWatchValues: Record<string, string>;
}

export interface ActiveTest {
  id: string;
  mcpSessionId: string;
  config: TestConfig;
  state: TestState;
  container: protos.google.cloud.run.v2.IService;
  googleToken: string;
}

export interface EmuSession {
  activeTests: Record<string, ActiveTest>;
  mcpSessions: Record<string, StreamableHTTPServerTransport>;
}
