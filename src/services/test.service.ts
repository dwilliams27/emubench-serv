import { ActiveTest, SESSION_FUSE_PATH } from "@/types/session";
import { mkdir, readdir } from "fs/promises";
import path from "path";
import { createEmuError, formatError } from "@/shared/utils/error";
import { EmuBootConfig, EmuTestConfig, EmuTestState } from "@/shared/types";
import { freadEmulatorState, freadSharedTestState, fwriteAgentJobs, fwriteAgentState, fwriteBootConfig, fwriteEmulatorState, fwriteSharedTestState, fwriteTestState } from "@/shared/services/resource-locator.service";
import { AGENT_JOB_ID, AGENT_STATE_ID, EXCHANGE_TOKEN_ID, genId, SHARED_TEST_STATE_ID } from "@/shared/utils/id";
import { containerService } from "@/services/container.service";

const DEBUG_MAX_ITERATIONS = 50;

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

  async runTest(bootConfig: EmuBootConfig, authToken: string) {
    const testId = bootConfig.testConfig.id;
    if (bootConfig.agentConfig.maxIterations > DEBUG_MAX_ITERATIONS) {
      throw createEmuError('Max iterations too large');
    }

    // Write config to bucket
    const writeSessionFolder = await testService.createTestSessionFolder(testId);
    if (!writeSessionFolder) {
      throw createEmuError('Failed to create session folder on FUSE');
    }
    const writeConfig = await fwriteBootConfig(testId, bootConfig);
    if (!writeConfig) {
      throw createEmuError('Failed to write BOOT_CONFIG');
    }

    const testState: EmuTestState = {
      id: testId,
      status: 'booting',
      stateHistory: {},
      screenshots: {}
    };
    const testWrite = await fwriteTestState(testId, testState);
    if (!testWrite) {
      throw createEmuError('Failed to write TEST_STATE');
    }

    const sharedTestState = {
      id: genId(SHARED_TEST_STATE_ID)
    };

    const activeTest: ActiveTest = {
      id: testId,
      exchangeToken: genId(EXCHANGE_TOKEN_ID),
    };

    const sharedWrite = await fwriteSharedTestState(testId, sharedTestState);
    if (!sharedWrite) {
      throw createEmuError('Failed to write SHARED_STATE');
    }

    // Deploy game and agent in background
    this.asyncEmulatorSetup(activeTest, bootConfig.testConfig);
    this.asyncAgentSetup(activeTest, authToken);

    return activeTest;
  }

  async asyncEmulatorSetup(activeTest: ActiveTest, testConfig: EmuTestConfig) {
    try {
      const gameContainer = await containerService.deployGame(activeTest.id, testConfig);
  
      if (!gameContainer.service.uri) {
        throw new Error('Unable to find container URL');
      }
      
      const { identityToken, service } = gameContainer;
      activeTest.container = service;
      activeTest.googleToken = identityToken;
  
      // TODO: Flatten firebase schema this is stupid
      const emulatorState = await freadEmulatorState(activeTest.id);
      const sharedTestState = await freadSharedTestState(activeTest.id);
      if (emulatorState && emulatorState.status !== 'error' && sharedTestState) {
        await fwriteSharedTestState(
          activeTest.id,
          {
            ...sharedTestState,
            exchangeToken: activeTest.exchangeToken,
            emulatorUri: service.uri!
          }
        );
      } else {
        throw createEmuError('Failed to read emulator or shared state');
      }
    } catch (error) {
      console.error(`[TEST] Error setting up test ${activeTest.id} ${formatError(error)}`);
      const emulatorState = await freadEmulatorState(activeTest.id);
      if (emulatorState) {
        emulatorState.status = 'error';
        await fwriteEmulatorState(activeTest.id, emulatorState);
      }
    }
  }
  
  async asyncAgentSetup(activeTest: ActiveTest, authToken: string) {
    try {
      const testId = activeTest.id;
      await fwriteAgentJobs([{
        id: genId(AGENT_JOB_ID),
        testId,
        authToken,
        testPath: `${SESSION_FUSE_PATH}/${testId}`,
        status: 'pending',
        error: '',
        startedAt: null,
        completedAt: null,
      }]);
      await fwriteAgentState(activeTest.id, { id: genId(AGENT_STATE_ID), status: 'booting' as const });
    } catch (error) {
      console.error(`[TEST] Error setting up test ${activeTest.id} ${formatError(error)}`);
    }
  }
}

const testService = new TestService();

export { testService };
