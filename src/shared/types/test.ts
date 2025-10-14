import { EmuAgentState, EmuBootConfig, EmuEmulatorState, EmuLogBlock, EmuSharedTestState, EmuTestState } from "@/shared/types";

export interface EmuTest {
  id: string;
  agentState: EmuAgentState;
  testState: EmuTestState;
  emulatorState: EmuEmulatorState;
  sharedState: EmuSharedTestState;
  bootConfig: EmuBootConfig;
  agentLogs: EmuLogBlock[];
  devLogs: EmuLogBlock[];
}
