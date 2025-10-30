import { EmuAgentState, EmuBootConfig, EmuEmulatorState, EmuLogBlock, EmuSharedTestState, EmuTestState } from "@/shared/types";
import { EmuTestResultData } from "@/shared/types/test-result";

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
  result: EmuTestResultData | null;
  agentLogs: EmuLogBlock[];
  devLogs: EmuLogBlock[];
}

export interface EmuTestPublic {
  id: string;
  agentState: EmuAgentState;
  testState: EmuTestState;
  emulatorState: EmuEmulatorState;
  sharedState: EmuSharedTestState;
  bootConfig: EmuBootConfig;
  screenshots: Record<string, EmuScreenshot>;
  result: EmuTestResultData | null;
}
