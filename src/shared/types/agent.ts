export interface EmuAgentJob {
  id: string;
  testId: string;
  authToken: string;
  testPath: string;
  status: 'pending' | 'running' | 'error' | 'completed';
  error: string;
  startedAt: any | null;
  completedAt: any | null;
}
