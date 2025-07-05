import { EmuBootConfig, EmuTestState, LogBlock, SESSION_FUSE_PATH } from "@/types/session";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";

export class TestService {
  async createTestSessionFolder(testId: string): Promise<boolean> {
    try {
      const dirPath = path.join(`${SESSION_FUSE_PATH}/${testId}`);
      await mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      console.error('Error creating test session dir:', error);
    }
    return false;
  }

  async getTestState(testId: string): Promise<EmuTestState | null> {
    try {
      const testStateData = await readFile(
        path.join(`${SESSION_FUSE_PATH}/${testId}`, 'test_state.json'), 
        'utf8'
      );
      const testStateFromFile = JSON.parse(testStateData) as EmuTestState;
      return testStateFromFile;
    } catch (error) {
      console.error('Error reading test_state.json:', error);
    }
    return null;
  }

  async writeTestState(testId: string, testState: EmuTestState): Promise<boolean> {
    try {
      await writeFile(
        path.join(`${SESSION_FUSE_PATH}/${testId}`, 'test_state.json'),
        JSON.stringify(testState, null, 2),
        'utf8'
      );
      return true;
    } catch (error) {
      console.error('Error writing test_state.json:', error);
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
      console.error('Error reading test_config.json:', error);
    }
    return null;
  }

  async writeBootConfig(bootConfig: EmuBootConfig): Promise<boolean> {
    try {
      await writeFile(
        path.join(`${SESSION_FUSE_PATH}/${bootConfig.testConfig.id}`, 'test_config.json'),
        JSON.stringify(bootConfig, null, 2),
        'utf8'
      );
      return true;
    } catch (error) {
      console.error('Error writing test_config.json:', error);
    }
    return false;
  }

  async getScreenshots(testId: string): Promise<string[]> {
    const screenshotPath = path.join(`${SESSION_FUSE_PATH}/${testId}`, 'ScreenShots');
    const files = await readdir(screenshotPath);
    return files.sort();
  }

  async getAgentLogs(testId: string): Promise<LogBlock[]> {
    try {
      const agentLogData = await readFile(
        path.join(`${SESSION_FUSE_PATH}/${testId}`, 'agent_logs.txt'), 
        'utf8'
      );
      const agentLogs = agentLogData.split('$$ENDLOG$$').filter(logBlock => logBlock.trim().length > 0).map((logBlock => JSON.parse(logBlock.trim()))) as LogBlock[];
      return agentLogs;
    } catch (error) {
      console.log(`[Test] Error getting agent logs: ${JSON.stringify((error as any).message)}`)
      return [];
    }
  }
}

const testService = new TestService();

export { testService };
