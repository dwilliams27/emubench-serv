import { EmuBootConfig, EmuSharedTestState } from "@/shared/types";
import { protos } from "@google-cloud/run";

export interface ContainerInstance {
  id: string;
  url: string;
  status: 'starting' | 'running' | 'stopped';
  createdAt: Date;
}

export interface ActiveTest {
  id: string;
  bootConfig: EmuBootConfig;
  sharedTestState: EmuSharedTestState;
  emulatorStatus: 'starting' | 'running' | 'finished' | 'error';
  agentStatus: 'starting' | 'running' | 'finished' | 'error';
  exchangeToken: string;
  container?: protos.google.cloud.run.v2.IService;
  googleToken?: string;
}

export interface EmuSession {
  activeTests: Record<string, ActiveTest>;
}

export const SESSION_FUSE_PATH = '/tmp/gcs/emubench-sessions';
