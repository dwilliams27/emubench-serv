import { FirebaseCollection, FirebaseFile, firebaseService, FirebaseSubCollection } from "@/services/firebase.service";
import { SESSION_FUSE_PATH } from "@/types/session";
import { EmuBootConfig, EmuLogBlock, EmuSharedTestState, EmuTestState } from "@/shared/types";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { formatError } from "@/shared/utils/error";

export class TestService {
  async createTestSessionFolder(testId: string): Promise<boolean> {
    try {
      const dirPath = path.join(`${SESSION_FUSE_PATH}/${testId}`);
      await mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      console.error(`Error creating test session dir: ${formatError(error)}`);
    }
    return false;
  }

  async getBootConfig(testId: string): Promise<EmuBootConfig | null> {
    try {
      const testConfigData = await readFile(
        path.join(`${SESSION_FUSE_PATH}/${testId}`, 'test_config.json'), 
        'utf8'
      );
      const bootConfig = JSON.parse(testConfigData) as EmuBootConfig;
      return bootConfig;
    } catch (error) {
      console.error(`Error reading BOOT_CONFIG ${formatError(error)}`);
    }
    return null;
  }

  async writeBootConfig(bootConfig: EmuBootConfig): Promise<boolean> {
    try {
      await firebaseService.write({
        testId: bootConfig.testConfig.id,
        collection: FirebaseCollection.SESSIONS,
        subCollection: FirebaseSubCollection.CONFIG,
        file: FirebaseFile.BOOT_CONFIG,
        payload: [bootConfig]
      });

      return true;
    } catch (error) {
      console.error(`Error writing BOOT_CONFIG: ${formatError(error)}`);
    }
    return false;
  }

  async writeSharedTestState(testId: string, sharedTestState: EmuSharedTestState): Promise<boolean> {
    try {
      console.log(`[Test] Writing shared state for ${testId}...`)
      await firebaseService.write({
        testId,
        collection: FirebaseCollection.SESSIONS,
        subCollection: FirebaseSubCollection.STATE,
        file: FirebaseFile.SHARED_STATE,
        payload: [sharedTestState]
      });

      return true;
    } catch (error) {
      console.error(`Error writing SHARED_STATE: ${formatError(error)}`);
    }
    return false;
  }

  async getScreenshots(testId: string): Promise<string[]> {
    const screenshotPath = path.join(`${SESSION_FUSE_PATH}/${testId}`, 'ScreenShots');
    const files = await readdir(screenshotPath);
    return files.sort();
  }

  async getAgentLogs(testId: string): Promise<EmuLogBlock[]> {
    console.log(`[Test] Fetching agent logs in ${FirebaseCollection.SESSIONS}/${testId}/${FirebaseSubCollection.AGENT_LOGS}`)
    try {
      const logs = await firebaseService.read({
        collection: FirebaseCollection.SESSIONS,
        subCollection: FirebaseSubCollection.AGENT_LOGS,
        testId: testId
      });
      return logs as unknown as EmuLogBlock[];
    } catch (error) {
      console.error(`[Test] Error getting agent logs: ${formatError(error)}`)
      return [];
    }
  }

  async getTestState(testId: string): Promise<EmuTestState | null> {
    console.log(`[Test] Fetching test state in ${FirebaseCollection.SESSIONS}/${testId}/${FirebaseSubCollection.STATE}`)
    try {
      const testState = await firebaseService.read({
        collection: FirebaseCollection.SESSIONS,
        subCollection: FirebaseSubCollection.STATE,
        file: FirebaseFile.TEST_STATE,
        testId: testId
      });
      return testState as unknown as EmuTestState;
    } catch (error) {
      console.error(`[Test] Error getting TEST_STATE: ${formatError(error)}`)
      return null;
    }
  }
}

const testService = new TestService();

export { testService };
