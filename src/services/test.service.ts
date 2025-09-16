import { firebaseService } from "@/shared/services/firebase.service";
import { SESSION_FUSE_PATH } from "@/types/session";
import { EmuBootConfig, EmuLogBlock, EmuSharedTestState, EmuTestState } from "@/shared/types";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { formatError } from "@/shared/utils/error";
import { FB_1, FB_2 } from "@/shared/types/firebase";

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
        pathParams: [
          { collection: FB_1.SESSIONS, docId: bootConfig.testConfig.id },
          { collection: FB_2.BOOT_CONFIG }
        ],
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
        pathParams: [
          { collection: FB_1.SESSIONS, docId: testId },
          { collection: FB_2.SHARED_STATE }
        ],
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
}

const testService = new TestService();

export { testService };
