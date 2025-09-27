import { EmuCondition } from "@/shared/conditions/types";
import { EmuBootConfig, EmuLogBlock } from "@/shared/types";

export interface EmuTestRun {
  id: string;
  history: EmuHistorySlice[];
  bootConfig: EmuBootConfig;
  result: EmuTestResult;
};

export interface EmuHistorySlice {
  id: string;
  turn: number;
  images: EmuHistoryAtom[];
  agentLogs: EmuHistoryAtom[];
  memoryWatches: EmuHistoryAtom[];
};

export interface EmuHistoryAtom {
  id: string;
  eventTimestamp: Date;
  type: 'screenshot' | 'log' | 'memory-watch';
  screenshot?: string;
  log?: EmuLogBlock;
  memoryWatch?: Record<string, any>;
};

export interface EmuTestResult {
  emuCondition: EmuCondition;
  conditionResult: 'passed' | 'failed' | 'error';
  conditionNumericalResult?: number;
}
