import { containerService } from "@/services/container.service";
import { gcpService } from "@/services/gcp.service";
import { testService } from "@/services/test.service";
import { ActiveTest } from "@/types/session";
import { EmuActiveTestReponse, EmuAgentConfig, EmuTestConfig } from "@/shared/types";
import { EXCHANGE_TOKEN_ID, genId, TEST_ID } from "@/utils/id";
import { Request, Response } from "express";

const DEBUG_MAX_ITERATIONS = 30;

export const setupTest = async (req: Request, res: Response) => {
  const testId = genId(TEST_ID);
  console.log(`[TEST] Setting up test ${testId}`);

  try {
    const testConfig: EmuTestConfig = { ...req.body.testConfig, id: testId };
    const agentConfig: EmuAgentConfig = req.body.agentConfig;

    if (agentConfig.maxIterations > DEBUG_MAX_ITERATIONS) {
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
    const writeConfig = await testService.writeBootConfig({ testConfig, agentConfig });
    if (!writeConfig) {
      console.error('Failed to write boot config file');
      res.status(500).send('Failed to write BOOT_CONFIG');
      return;
    }

    const activeTest: ActiveTest = {
      id: testId,
      exchangeToken: genId(EXCHANGE_TOKEN_ID),
      emuConfig: testConfig,
      emulatorStatus: 'starting',
      agentStatus: 'starting'
    }

    const sharedTestState = await testService.writeSharedTestState(testId, {});
    if (!sharedTestState) {
      console.error('Failed to write SHARED_STATE');
      res.status(500).send('Failed to write SHARED_STATE');
      return;
    }

    req.emuSession.activeTests[testId] = activeTest;

    // Deploy game and agent in background
    asyncEmulatorSetup(activeTest, req.headers.authorization!.substring(7));
    asyncAgentSetup(activeTest, req.headers.authorization!.substring(7));

    res.send({ testId });
  } catch (error) {
    console.error('Error setting up test:', JSON.stringify(error));
    res.status(500).send('Failed to set up test');
  }
}

async function asyncEmulatorSetup(activeTest: ActiveTest, authToken: string) {
  try {
    const gameContainer = await containerService.deployGame(activeTest.id, activeTest.emuConfig);

    if (!gameContainer.service.uri) {
      throw new Error('Unable to find container URL');
    }
    
    const { identityToken, service } = gameContainer;
    activeTest.container = service;
    activeTest.googleToken = identityToken;

    if (activeTest.emulatorStatus !== 'error') {
      activeTest.emulatorStatus = 'running';
    }

    await testService.writeSharedTestState(activeTest.id, { exchangeToken: activeTest.exchangeToken, emulatorUri: service.uri! });
  } catch (error) {
    console.error(`[TEST] Error setting up test ${activeTest.id}`, error);
    activeTest.emulatorStatus = 'error';
  }
}

async function asyncAgentSetup(activeTest: ActiveTest, authToken: string) {
  try {
    const agentJob = await containerService.runAgent(activeTest.id, authToken);
    
    if (activeTest.agentStatus !== 'error') {
      activeTest.agentStatus = 'running';
    }
  } catch (error) {
    console.error(`[TEST] Error setting up test ${activeTest.id}`, error);
    activeTest.agentStatus = 'error';
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
  req.emuSession.activeTests[testId].agentStatus = 'finished';
  req.emuSession.activeTests[testId].emulatorStatus = 'finished';
  console.log(`[TEST] Test ${testId} deleted`);
  res.status(200).send();
}

export const getEmuTestConfigs = async (req: Request, res: Response) => {
  // TODO: Fetch from DB
}

const getScreenshotsFromTest = async (activeTest: ActiveTest): Promise<Record<string, string>> => {
  let screenshots = {};
  if (activeTest.emulatorStatus === 'running' && activeTest.agentStatus === 'running' || (activeTest.emulatorStatus === 'finished' && activeTest.agentStatus === 'finished')) {
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
  }
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
  const testId = activeTest.emuConfig.id;

  const screenshots = await getScreenshotsFromTest(activeTest);

  // Logs
  const agentLogs = await testService.getAgentLogs(testId);

  // Test state
  const testState = await testService.getTestState(testId);

  res.send({
    testState: testState,
    screenshots,
    agentLogs,
    emulatorStatus: activeTest.emulatorStatus,
    agentStatus: activeTest.agentStatus,
  } as EmuActiveTestReponse);
}
