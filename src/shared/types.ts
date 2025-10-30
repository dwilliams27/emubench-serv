import { EmuCondition } from "@/shared/conditions/types";
import { EmuScreenshot } from "@/shared/types/test";
import { EmuTestResult } from "@/shared/types/test-result";

export interface EmuLogItem {
  text: string;
  metadata: {
    type: 'tool-call' | 'message';
    timestamp: string;

    screenshotName?: string;

    toolName?: string;
    toolPayload?: any;

    contextMemWatchValues?: Record<string, string>;
    endStateMemWatchValues?: Record<string, string>;
  };
};

export interface EmuLogBlock {
  id: string;
  title: string;
  logs: EmuLogItem[]
};

export interface EmuBootConfig {
  id: string;
  experimentId: string | null;
  experimentRunGroupId: string | null;
  agentConfig: EmuAgentConfig;
  testConfig: EmuTestConfig;
  goalConfig: EmuGoalConfig;
};

export interface EmuMemoryWatch {
  address: string;
  pointerOffsets?: string[];
  size: number;
};

export interface EmuTestConfig {
  id: string;
  gameId: string;
  platform: 'gamecube';
  mode: 'turn-based' | 'real-time';
  startStateFilename: string;
  contextMemWatches: Record<string, EmuMemoryWatch>;
  endStateMemWatches: Record<string, EmuMemoryWatch>;
};

export interface EmuAgentConfig {
  systemPrompt: string;
  gameContext: string;
  llmProvider: 'openai' | 'anthropic' | 'google';
  model: string;
  maxIterations: number;
  temperature: number;
  taskName: string;
  taskDescription: string;
  contextHistorySize: number;
};

export interface EmuGoalConfig {
  condition: EmuCondition;
};

export interface EmuTestState {
  id: string;
  status: 'booting' | 'ready' | 'running' | 'finished';
  screenshots: Record<string, string>;
  stateHistory: { [key: string]: { contextMemWatchValues: Record<string, string>; endStateMemWatchValues: Record<string, string>; } };
};

export interface EmuEmulatorState {
  id: string;
  status: 'booting' | 'emulator-ready' | 'running' | 'finished' | 'error';
  contextMemWatchValues: Record<string, string>;
  endStateMemWatchValues: Record<string, string>;
};

export interface EmuAgentState {
  id: string;
  status: 'booting' | 'running' | 'finished' | 'error';
};

export interface EmuSharedTestState {
  id: string;
  emulatorUri?: string;
  exchangeToken?: string;
};

export interface EmuActiveTestReponse {
  testState?: EmuTestState | null;
  agentState?: EmuAgentState | null;
  agentLogs?: EmuLogBlock[] | null;
  emulatorState?: EmuEmulatorState | null;
  screenshots?: Record<string, EmuScreenshot>;
  currentCondition?: EmuCondition;
  bootConfig: EmuBootConfig;
};

export interface EmuGetTraceLogsResponse {
  traces: EmuTrace[];
};

export interface EmuGetTestHistoryResponse {
  testResult: EmuTestResult;
}

export interface EmuSetupExperimentResponse {
  experimentId: string;
}

export interface EmuTurn {
  iteration: number;
  logBlock: EmuLogBlock;
};

export interface EmuLlmMessageContentItem {
  type: 'text' | 'image';
  text?: string;
  image?: string;
};

export const EmuLogNamespace = {
  DEV: 'DEV',
  AGENT: 'AGENT'
};

export type EmuServiceName = 'SERV' | 'AGENT' | 'UI' | 'EMULATOR' | 'UNKNOWN';

export interface EmuReqMetadata {
  trace: EmuReqTraceMetadata;
};

export interface EmuReqTraceMetadata {
  id: string;
  reqId: string;
  service: EmuServiceName;
  testId?: string;
};

export interface EmuTrace {
  id: string;
  testId: string;
  logs: EmuTraceLog[];
};

export interface EmuTraceLog {
  id: string;
  timestamp: string;
  level: 'info' | 'error';
  message: string;
};

export class EmuError extends Error {
  traceId?: string;
};

export const EMU_TRACE_HEADER = 'x-emubench-trace-id';

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
