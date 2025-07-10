export interface EmuLogItem {
  text: string;
  metadata?: Record<string, string>;
}

export interface EmuLogBlock {
  title: string;
  logs: EmuLogItem[]
}

export interface EmuBootConfig {
  agentConfig: EmuAgentConfig;
  testConfig: EmuTestConfig;
};

export interface EmuMemoryWatch {
  address: string; // Address in hex format, e.g. "0x80000000"
  offset?: string; // If the address is a pointer, this is the offset to read from
  size: number; // Size in bytes
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

export interface EmuTestState {
  status: 'booting' | 'emulator-ready' | 'running' | 'finished';
  contextMemWatchValues: Record<string, string>;
  endStateMemWatchValues: Record<string, string>;
}

export interface EmuTask {
  name: string;
  description: string;
}
