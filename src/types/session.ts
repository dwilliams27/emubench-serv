import { EmuTestConfig, EmuTestState } from "@/types/shared";
import { protos } from "@google-cloud/run";

export interface ContainerInstance {
  id: string;
  url: string;
  status: 'starting' | 'running' | 'stopped';
  createdAt: Date;
}

export interface ActiveTest {
  id: string;
  emuConfig: EmuTestConfig;
  status: 'starting' | 'running' | 'finished' | 'error';
  container?: protos.google.cloud.run.v2.IService;
  googleToken?: string;
}

export interface EmuSession {
  activeTests: Record<string, ActiveTest>;
}

export const SESSION_FUSE_PATH = '/tmp/gcs/emubench-sessions';
