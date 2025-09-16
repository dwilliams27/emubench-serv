import { EmuCondition } from "@/shared/conditions/types";

export interface EmuLogItem {
  text: string;
  metadata: {
    type: 'tool-call' | 'message';
    timestamp: string;

    screenshotName?: string;

    toolName?: string;
    toolPayload?: any;
  };
}

export interface EmuLogBlock {
  id: string;
  title: string;
  logs: EmuLogItem[]
}

export interface EmuBootConfig {
  id: string;
  agentConfig: EmuAgentConfig;
  testConfig: EmuTestConfig;
  goalConfig: EmuGoalConfig;
};

export interface EmuMemoryWatch {
  address: string;
  pointerOffsets?: string[];
  size: number;
}

export interface EmuTestConfig {
  id: string;
  gameId: string;
  platform: 'gamecube';
  mode: 'turn-based' | 'real-time';
  startStateFilename: string;
  contextMemWatches: Record<string, EmuMemoryWatch>;
  endStateMemWatches: Record<string, EmuMemoryWatch>;
}

export interface EmuTask {
  name: string;
  description: string;
}

export interface EmuAgentConfig {
  systemPrompt: string;
  gameContext: string;
  llmProvider: 'openai' | 'anthropic' | 'google';
  model: string;
  maxIterations: number;
  temperature: number;
  task: EmuTask;
}

export interface EmuGoalConfig {
  condition: EmuCondition;
}

export interface EmuTestState {
  id: string;
  status: 'booting' | 'emulator-ready' | 'running' | 'finished';
  contextMemWatchValues: Record<string, string>;
  endStateMemWatchValues: Record<string, string>;
  stateHistory: { [key: string]: Omit<EmuTestState, 'stateHistory'> };
}

export interface EmuSharedTestState {
  id: string;
  emulatorUri?: string;
  exchangeToken?: string;
}

export interface EmuActiveTestReponse {
  testState: EmuTestState;
  screenshots: Record<string, string>;
  agentLogs: EmuLogBlock[];
  emulatorStatus: 'starting' | 'running' | 'finished' | 'error';
  agentStatus: 'starting' | 'running' | 'finished' | 'error';
  goalConfig: EmuGoalConfig;
}

export interface EmuTurn {
  iteration: number;
  logBlock: EmuLogBlock;
}

export interface EmuLlmMessageContentItem {
  type: 'text' | 'image';
  text?: string;
  image?: string;
}

export const EmuLogNamespace = {
  DEV: 'DEV',
  AGENT: 'AGENT'
};
