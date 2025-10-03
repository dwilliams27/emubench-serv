import { EmuBootConfig } from "@/shared/types";
import { EmuTestRun } from "@/shared/types/test-run";

export interface EmuExperiment {
  id: string;
  name: string;
  description: string;
  baseConfig: EmuBootConfig;

  totalTestRuns: number;
  uniqueGroupCount: number;
  groupGenerator: (baseConfig: EmuBootConfig, index: number) => EmuExperimentRunGroup;

  runGroups: EmuExperimentRunGroup[];

  RESULTS: EmuTestRun[]; 
}

export interface EmuExperimentRunGroup {
  id: string;
  bootConfig: EmuBootConfig;
  iterations: number;
}

export interface EmuTestQueueJob {
  id: string;
  bootConfig: EmuBootConfig;
  encryptedUserToken: string;
  status: 'pending' | 'running' | 'error' | 'completed';
  error: string;
  startedAt: any | null;
  completedAt: any | null;
}

export interface EmuSetupExperimentRequest {
  experimentConfig: Omit<EmuExperiment, 'id'>;
}

export interface EmuSetupExperimentResponse {
  experimentId: string;
}
