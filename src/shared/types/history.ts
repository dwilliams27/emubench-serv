import { EmuBootConfig, EmuLogBlock } from "@/shared/types";

// Top level firebase item per acct
export interface EmuHistory {

}

export interface EmuTestRun {
  id: string;
  replay: EmuReplaySlice[];
  bootConfig: EmuBootConfig;
  // TODO: Fill
}

export interface EmuReplaySlice {
  id: string;
  images: EmuHistoryAtom[];
  agentLogs: EmuHistoryAtom[];
  memoryWatches: EmuHistoryAtom[];
}

export interface EmuHistoryAtom {
  id: string;
  eventTimestamp: Date;
  type: 'screenshot' | 'log' | 'memory-watch';
  screenshot?: string;
  log?: EmuLogBlock;
  memoryWatch?: Record<string, any>;
}
