import { MemoryWatch } from "@/types/gamecube";
import { protos } from "@google-cloud/run";

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
  mode: 'turn-based' | 'real-time';
  startStateFilename: string;
  contextMemWatches: Record<string, MemoryWatch>;
  endStateMemWatches: Record<string, MemoryWatch>;
};

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
};

export interface EmuBootConfig {
  testConfig: EmuTestConfig;
  agentConfig: EmuAgentConfig;
}

// Read in from file
export interface EmuTestState {
  state: 'booting' | 'emulator-ready' | 'server-ready' | 'running' | 'finished';
}

export interface EmuTestMemoryState {
  contextMemWatchValues: Record<string, string>;
  endStateMemWatchValues: Record<string, string>;
}

export interface ActiveTest {
  id: string;
  emuConfig: EmuTestConfig;
  emuTestState: EmuTestState;
  emuTestMemoryState: EmuTestMemoryState;
  container?: protos.google.cloud.run.v2.IService;
  googleToken?: string;
}

export interface EmuSession {
  activeTests: Record<string, ActiveTest>;
}

export const SESSION_FUSE_PATH = '/tmp/gcs/emubench-sessions';
