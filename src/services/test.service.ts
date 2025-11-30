import { ActiveTest, SESSION_FUSE_PATH } from "@/types/session";
import { mkdir, readdir } from "fs/promises";
import path from "path";
import { createEmuError, formatError } from "@/shared/utils/error";
import { EmuBootConfig, EmuEmulatorConfig, EmuTestState } from "@/shared/types";
import { fwriteAgentJobs, fwriteTest, fwriteTestFields } from "@/shared/services/resource-locator.service";
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
    const testId = bootConfig.id;
    if (bootConfig.agentConfig.maxIterations > DEBUG_MAX_ITERATIONS) {
      throw createEmuError('Max iterations too large');
    }

    // Write config to bucket
    const writeSessionFolder = await testService.createTestSessionFolder(testId);
    if (!writeSessionFolder) {
      throw createEmuError('Failed to create session folder on FUSE');
    }

    const testState: EmuTestState = {
      id: testId,
      status: 'booting',
      stateHistory: {},
      screenshots: {}
    };

    const sharedTestState = {
      id: genId(SHARED_TEST_STATE_ID)
    };

    const activeTest: ActiveTest = {
      id: testId,
      exchangeToken: genId(EXCHANGE_TOKEN_ID),
    };

    const result = await fwriteTest({
      id: testId,
      bootConfig,
      testState,
      screenshots: {},
      result: null,
      sharedState: sharedTestState,
    });

    // Deploy game and agent in background
    this.asyncEmulatorSetup(activeTest, bootConfig.emulatorConfig);
    this.asyncAgentSetup(activeTest, authToken);

    return activeTest;
  }

  async asyncEmulatorSetup(activeTest: ActiveTest, emulatorConfig: EmuEmulatorConfig) {
    try {
      const gameContainer = await containerService.deployGame(activeTest.id, emulatorConfig);
  
      if (!gameContainer.service.uri) {
        throw new Error('Unable to find container URL');
      }
      
      const { identityToken, service } = gameContainer;
      activeTest.container = service;
      activeTest.googleToken = identityToken;
  
      const result = await fwriteTestFields(activeTest.id, {
        'sharedState.exchangeToken': activeTest.exchangeToken,
        'sharedState.emulatorUri': service.uri,
      });
      if (!result) {
        throw createEmuError('Failed to write test fields');
      }
    } catch (error) {
      console.error(`[TEST] Error setting up test ${activeTest.id} ${formatError(error)}`);
      const result = await fwriteTestFields(activeTest.id, {
        'emulatorState.status': 'error',
      });
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
      await fwriteTestFields(activeTest.id, { 'agentState': { id: genId(AGENT_STATE_ID), status: 'booting' as const } });
    } catch (error) {
      console.error(`[TEST] Error setting up test ${activeTest.id} ${formatError(error)}`);
    }
  }
}

const testService = new TestService();

export { testService };
