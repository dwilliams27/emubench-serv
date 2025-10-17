import { EmuCondition } from "@/shared/conditions/types";
import { DeepPartial, EmuAgentState, EmuBootConfig, EmuEmulatorState } from "@/shared/types";

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
  name: string;
  id: string;
  baseConfigDelta: DeepPartial<EmuBootConfig>;
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

export interface EmuTestSummary {
  agentState: EmuAgentState;
  emulatorState: EmuEmulatorState;
  currentCondition: EmuCondition;
}
