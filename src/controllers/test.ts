import { containerService } from "@/services/container.service";
import { gcpService } from "@/services/gcp.service";
import { testService } from "@/services/test.service";
import { ActiveTest } from "@/types/session";
import { EmuActiveTestReponse, EmuAgentState, EmuBootConfig, EmuEmulatorState, EmuTestConfig, EmuTestState } from "@/shared/types";
import { BOOT_CONFIG_ID, EXCHANGE_TOKEN_ID, genId, SHARED_TEST_STATE_ID, TEST_ID } from "@/shared/utils/id";
import { Request, Response } from "express";
import { formatError } from "@/shared/utils/error";
import { freadAgentLogs, freadAgentState, freadBootConfig, freadEmulatorState, freadTestState, fwriteAgentState, fwriteBootConfig, fwriteEmulatorState, fwriteSharedTestState, fwriteTestState } from "@/shared/services/resource-locator.service";

const DEBUG_MAX_ITERATIONS = 30;

export const setupTest = async (req: Request, res: Response) => {
  const testId = genId(TEST_ID);
  console.log(`[TEST] Setting up test ${testId}`);

  try {
    const bootConfig: EmuBootConfig = {
      id: genId(BOOT_CONFIG_ID),
      agentConfig: req.body.agentConfig,
      testConfig: { ...req.body.testConfig, id: testId },
      goalConfig: req.body.goalConfig,
    };

    if (bootConfig.agentConfig.maxIterations > DEBUG_MAX_ITERATIONS) {
      res.status(400).send('Max iterations too large');
      return;
    }

    // Write config to bucket
    const writeSessionFolder = await testService.createTestSessionFolder(testId);
    if (!writeSessionFolder) {
      console.error('Failed to create session folder');
      res.status(500).send('Failed to create session folder');
      return;
    }
    const writeConfig = await fwriteBootConfig(testId, bootConfig);
    if (!writeConfig) {
      console.error('Failed to write boot config file');
      res.status(500).send('Failed to write BOOT_CONFIG');
      return;
    }

    const testState: EmuTestState = {
      id: testId,
      status: 'booting',
      stateHistory: {},
      screenshots: {}
    }
    const testWrite = await fwriteTestState(testId, testState);
    if (!testWrite) {
      console.error('Failed to write TEST_STATE');
      res.status(500).send('Failed to write TEST_STATE');
      return;
    }

    const sharedTestState = {
      id: genId(SHARED_TEST_STATE_ID)
    };

    const activeTest: ActiveTest = {
      id: testId,
      exchangeToken: genId(EXCHANGE_TOKEN_ID),
    }

    const sharedWrite = await fwriteSharedTestState(testId, sharedTestState);
    if (!sharedWrite) {
      console.error('Failed to write SHARED_STATE');
      res.status(500).send('Failed to write SHARED_STATE');
      return;
    }

    req.emuSession.activeTests[testId] = activeTest;

    // Deploy game and agent in background
    asyncEmulatorSetup(activeTest, bootConfig.testConfig);
    asyncAgentSetup(activeTest, req.headers.authorization!.substring(7));

    res.send({ testId });
  } catch (error) {
    console.error(`Error setting up test: ${formatError(error)}`);
    res.status(500).send('Failed to set up test');
  }
}

async function asyncEmulatorSetup(activeTest: ActiveTest, testConfig: EmuTestConfig) {
  try {
    const gameContainer = await containerService.deployGame(activeTest.id, testConfig);

    if (!gameContainer.service.uri) {
      throw new Error('Unable to find container URL');
    }
    
    const { identityToken, service } = gameContainer;
    activeTest.container = service;
    activeTest.googleToken = identityToken;

    const sharedTestState = await freadEmulatorState(activeTest.id);
    if (sharedTestState && sharedTestState.status !== 'error') {
      await fwriteSharedTestState(
        activeTest.id,
        {
          ...sharedTestState,
          exchangeToken: activeTest.exchangeToken,
          emulatorUri: service.uri!
        }
      );
    } else {
      throw new Error('[TEST] Aborting, shared test state set to error');
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

async function asyncAgentSetup(activeTest: ActiveTest, authToken: string) {
  try {
    const agentJob = await containerService.runAgent(activeTest.id, authToken);
  } catch (error) {
    console.error(`[TEST] Error setting up test ${activeTest.id} ${formatError(error)}`);
  }
}

export const attemptTokenExchange = async (req: Request, res: Response) => {
  console.log('[TEST] Attempting token exchange');
  if (!req.params.testId) {
    res.status(400).send('Must specify testId');
    return;
  }
  if (!req.body.exchangeToken) {
    res.status(400).send('Must specify exchangeToken');
    return;
  }
  const activeTest = req.emuSession.activeTests[req.params.testId];
  if (!activeTest) {
    res.status(400).send(`No active test found for id ${req.params.testId}`);
    return;
  }
  if (activeTest.exchangeToken !== req.body.exchangeToken) {
    res.status(400).send('Invalid exchangeToken');
    return;
  }

  res.send({ token: activeTest.googleToken });
}

export const getScreenshots = async (req: Request, res: Response) => {
  console.log('[TEST] Getting screenshots');
  if (!req.params.testId) {
    res.status(400).send('Must specify testId');
    return;
  }
  const activeTest = req.emuSession.activeTests[req.params.testId];
  if (!activeTest) {
    res.status(400).send(`No active test found for id ${req.params.testId}`);
    return;
  }
  const screenshots = await getScreenshotsFromTest(activeTest);
  res.send({ screenshots });
}

export const endTest = async (req: Request, res: Response) => {
  console.log('[TEST] Ending test');
  const testId = req.body.testId;
  if (!testId || !req.emuSession.activeTests[testId]) {
    res.status(400).send('Must pass valid testId');
    return;
  }
  const containerName = req.emuSession.activeTests[testId].container?.name;
  if (!containerName) {
    res.status(400).send('Container not found for testId');
    return;
  }
  await gcpService.deleteService(containerName);

  // TODO: Partial updates
  const agentState = await freadAgentState(testId);
  if (agentState) {
    agentState.status = 'finished';
    await fwriteAgentState(testId, agentState);
  }
  const emulatorState = await freadEmulatorState(testId);
  if (emulatorState) {
    emulatorState.status = 'finished';
  }
  console.log(`[TEST] Test ${testId} deleted`);
  res.status(200).send();
}

export const getEmuTestConfigs = async (req: Request, res: Response) => {
  // TODO: Fetch from DB
}

const getScreenshotsFromTest = async (activeTest: ActiveTest): Promise<Record<string, string>> => {
  let screenshots = {};
  const testScreenshots = await testService.getScreenshots(activeTest.id);
  const signedUrlsPromises = testScreenshots.map((screenshot) => new Promise(async (res) => {
    const url = await gcpService.getSignedURL('emubench-sessions', `${activeTest.id}/ScreenShots/${screenshot}`);
    res([screenshot, url])
  }));
  const signedUrls = await Promise.all(signedUrlsPromises) as [string, string][];

  screenshots = signedUrls.reduce((acc: Record<string, string>, url) => {
    acc[url[0]] = url[1];
    return acc;
  }, {});
  return screenshots;
}

export const getEmuTestState = async (req: Request, res: Response) => {
  console.log('[TEST] Getting test state');
  if (!req.params.testId) {
    res.status(400).send('Must specify testId');
    return;
  }
  const activeTest = req.emuSession.activeTests[req.params.testId];
  if (!activeTest) {
    res.status(400).send(`No active test found for id ${req.params.testId}`);
    return;
  }

  // TODO: Batch reads
  const [testState, emulatorState, bootConfig, agentState, agentLogs] = await Promise.all([
    freadTestState(activeTest.id),
    freadEmulatorState(activeTest.id),
    freadBootConfig(activeTest.id),
    freadAgentState(activeTest.id),
    freadAgentLogs(activeTest.id)
  ]);

  const screenshots = await getScreenshotsFromTest(activeTest);

  // Update screenshots in firebase if changed
  if (Object.keys(screenshots).length !== Object.keys(testState?.screenshots || {}).length) {
    await fwriteTestState(activeTest.id, { ...testState!, screenshots });
  }

  res.send({
    testState,
    agentState,
    agentLogs,
    emulatorState,
    bootConfig,
  } as EmuActiveTestReponse);
}
