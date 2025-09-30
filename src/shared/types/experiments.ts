import { EmuBootConfig } from "@/shared/types";
import { EmuTestRun } from "@/shared/types/test-run";

export interface EmuExperiment {
  id: string;
  name: string;
  description: string;
  baseConfig: EmuBootConfig;

  uniqueConfigCount: number;
  groupGenerator: (baseConfig: EmuBootConfig, index: number) => EmuExperimentRunGroup;
}

export interface EmuExperimentRunGroup {
  id: string;
  bootConfig: EmuBootConfig;
  iterations: number;
}

export interface EmuExperimentResult {
  id: string;
  experiment: EmuExperiment;
  runGroups: EmuExperimentRunGroup[];
  results: Record<string, EmuTestRun[]>;
}

export interface EmuTestQueueJob {
  id: string;
  bootConfig: EmuBootConfig;
  status: 'pending' | 'running' | 'error' | 'done';
  startedAt: Date;
}
