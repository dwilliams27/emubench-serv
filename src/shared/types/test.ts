import { EmuAgentState, EmuBootConfig, EmuEmulatorState, EmuLogBlock, EmuSharedTestState, EmuTestState } from "@/shared/types";

export interface EmuScreenshot {
  fullResolutionUrl: string;
  thumbnailUrl: string;
}

export interface EmuTest {
  id: string;
  agentState: EmuAgentState;
  testState: EmuTestState;
  emulatorState: EmuEmulatorState;
  sharedState: EmuSharedTestState;
  bootConfig: EmuBootConfig;
  screenshots: Record<string, EmuScreenshot>;
  agentLogs: EmuLogBlock[];
  devLogs: EmuLogBlock[];
}
