import { EmuBootConfig } from "@/shared/types";
import { EmuTestRun } from "@/shared/types/test-run";

export interface EmuExperiment {
  id: string;
  name: string;
  description: string;
  baseConfig: EmuBootConfig;
  totalTestRuns: number;
  status: 'pending' | 'running' | 'error' | 'completed';
  runGroups: EmuExperimentRunGroup[];
  completedTestRunIds: string[];
}

export interface EmuExperimentRunGroup {
  baseConfigDelta: Partial<EmuBootConfig>;
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
  experimentConfig: Omit<EmuExperiment, 'id' | 'RESULTS'>;
}

export interface EmuSetupExperimentResponse {
  experimentId: string;
}
