import { SESSION_FUSE_PATH } from "@/types/session";
import { mkdir, readdir } from "fs/promises";
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

  async getScreenshots(testId: string): Promise<string[]> {
    const screenshotPath = path.join(`${SESSION_FUSE_PATH}/${testId}`, 'ScreenShots');
    const files = await readdir(screenshotPath);
    return files.sort();
  }
}

const testService = new TestService();

export { testService };
