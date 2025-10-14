import { EmuTestSummary } from "@/shared/types/experiments";

export interface EmuRunAgentRequest {
  authToken: string;
  testPath: string;
  testId: string;
}

export interface EmuGetExperimentSummaryResponse {
  runGroupSummaries: Record<string, {
    id: string;
    tests: Record<string, EmuTestSummary>;
  }>;
}
