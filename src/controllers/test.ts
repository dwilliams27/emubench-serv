import { containerService } from "@/services/container.service";
import { gcpService } from "@/services/gcp.service";
import { testService } from "@/services/test.service";
import { ActiveTest } from "@/types/session";
import { EmuAgentConfig, EmuTestConfig } from "@/types/shared";
import { genId, TEST_ID } from "@/utils/id";
import { Request, Response } from "express";

const DEBUG_MAX_ITERATIONS = 30;

export const setupTest = async (req: Request, res: Response) => {
  console.log('[TEST] Setting up test');

  try {
    const testId = genId(TEST_ID);
    const testConfig: EmuTestConfig = { ...req.body.testConfig, id: testId };
    // TODO: Pull gameContext from DB eventually
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
      res.status(500).send('Failed to write boot config file');
      return;
    }

    const activeTest: ActiveTest = {
      id: testId,
      emuConfig: testConfig,
    }

    req.emuSession.activeTests[testId] = activeTest;

    // Deploy game and agent
    const gameContainer =  await containerService.deployGame(testId, testConfig);

    if (!gameContainer.service.uri) {
      throw new Error('Unable to find container URL');
    }

    const agentJob = await containerService.runAgent(testId, req.headers.authorization!.substring(7), gameContainer.identityToken, gameContainer.service.uri);
    
    const { identityToken, service } = gameContainer;

    activeTest.container = service;
    activeTest.googleToken = identityToken;
    
    // TODO: Push to DB

    res.send({ testId });
  } catch (error) {
    console.error('Error setting up test:', JSON.stringify(error));
    res.status(500).send('Failed to set up test');
  }
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
  console.log('[TEST] Test deleted');
  res.status(200).send();
}

export const getEmuTestConfigs = async (req: Request, res: Response) => {
  // TODO: Fetch from DB
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

  // Screenshots
  const screenshots = await testService.getScreenshots(testId);
  const signedUrlsPromises = screenshots.map((screenshot) => new Promise(async (res) => {
    const url = await gcpService.getSignedURL('emubench-sessions', `${testId}/ScreenShots/${screenshot}`);
    res([screenshot, url])
  }));
  const signedUrls = await Promise.all(signedUrlsPromises) as [string, string][];

  // Logs
  const agentLogs = await testService.getAgentLogs(testId);

  // Test state
  const testState = await testService.getTestState(testId);

  res.send({
    testState: testState,
    screenshots: signedUrls.reduce((acc: Record<string, string>, url) => {
      acc[url[0]] = url[1];
      return acc;
    }, {}),
    agentLogs,
  });
}
