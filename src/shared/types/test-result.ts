import { EmuCondition, EmuConditionPrimitiveResult } from "@/shared/conditions/types";
import { EmuBootConfig, EmuLogItem } from "@/shared/types";

export interface EmuTestResult {
  id: string;
  experimentId: string | null;
  experimentRunGroupId: string | null;
  history: EmuHistorySlice[];
  bootConfig: EmuBootConfig;
  data: EmuTestResultData;
};

export interface EmuTestResultData {
  emuCondition: EmuCondition;
  conditionResult: 'passed' | 'failed' | 'error';
  conditionPrimitiveResult: EmuConditionPrimitiveResult;
  errorDetails: string;
}

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
  screenshotName?: string;
  log?: EmuLogItem;
  memoryWatch?: Record<string, any>;
};
