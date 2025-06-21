import { EmuBootConfig, EmuTestState, SESSION_FUSE_PATH } from "@/types/session";
import { readFile, writeFile } from "fs/promises";
import path from "path";

export class TestService {
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
      const testConfigData = await writeFile(
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
}

const testService = new TestService();

export { testService };
