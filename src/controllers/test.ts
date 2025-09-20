import { containerService } from "@/services/container.service";
import { gcpService } from "@/services/gcp.service";
import { testService } from "@/services/test.service";
import { ActiveTest } from "@/types/session";
import { EmuActiveTestReponse, EmuBootConfig, EmuError, EmuGetTraceLogsResponse, EmuReqTraceMetadata, EmuTestConfig, EmuTestState } from "@/shared/types";
import { BOOT_CONFIG_ID, EXCHANGE_TOKEN_ID, genId, SHARED_TEST_STATE_ID, TEST_ID } from "@/shared/utils/id";
import { Request, Response } from "express";
import { createEmuError, formatError } from "@/shared/utils/error";
import { freadAgentLogs, freadAgentState, freadBootConfig, freadEmulatorState, freadSharedTestState, freadTestState, freadTraceLogs, fwriteAgentState, fwriteBootConfig, fwriteEmulatorState, fwriteSharedTestState, fwriteTestState } from "@/shared/services/resource-locator.service";
import { fwriteErrorToTraceLog, fwriteFormattedTraceLog } from "@/shared/utils/trace";
import { fhandleErrorResponse } from "@/utils/error";

const DEBUG_MAX_ITERATIONS = 50;

export const setupTest = async (req: Request, res: Response) => {
  const testId = genId(TEST_ID);
  console.log(`[TEST] Setting up test ${testId}`);
  fwriteFormattedTraceLog(`Setting up test ${testId}`, req.metadata?.trace);

  try {
    const bootConfig: EmuBootConfig = {
      id: genId(BOOT_CONFIG_ID),
      agentConfig: req.body.agentConfig,
      testConfig: { ...req.body.testConfig, id: testId },
      goalConfig: req.body.goalConfig,
    };

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

    req.emuSession.activeTests[testId] = activeTest;

    // Deploy game and agent in background
    asyncEmulatorSetup(activeTest, bootConfig.testConfig, req.metadata?.trace);
    asyncAgentSetup(activeTest, req.headers.authorization!.substring(7), req.metadata?.trace);

    res.send({ testId });
  } catch (error) {
    console.error(`Error setting up test: ${formatError(error)}`);
    fhandleErrorResponse(error, req, res);
  }
}

async function asyncEmulatorSetup(activeTest: ActiveTest, testConfig: EmuTestConfig, trace?: EmuReqTraceMetadata) {
  try {
    const gameContainer = await containerService.deployGame(activeTest.id, testConfig);

    if (!gameContainer.service.uri) {
      throw new Error('Unable to find container URL');
    }
    
    const { identityToken, service } = gameContainer;
    activeTest.container = service;
    activeTest.googleToken = identityToken;

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
    fwriteErrorToTraceLog(error, trace);
    console.error(`[TEST] Error setting up test ${activeTest.id} ${formatError(error)}`);
    const emulatorState = await freadEmulatorState(activeTest.id);
    if (emulatorState) {
      emulatorState.status = 'error';
      await fwriteEmulatorState(activeTest.id, emulatorState);
    }
  }
}

async function asyncAgentSetup(activeTest: ActiveTest, authToken: string, trace?: EmuReqTraceMetadata) {
  try {
    const agentJob = await containerService.runAgent(activeTest.id, authToken);
  } catch (error) {
    fwriteErrorToTraceLog(error, trace);
    console.error(`[TEST] Error setting up test ${activeTest.id} ${formatError(error)}`);
  }
}

export const attemptTokenExchange = async (req: Request, res: Response) => {
  console.log('[TEST] Attempting token exchange');
  try {
    if (!req.params.testId) {
      throw createEmuError('Must specify testId');
    }
    if (!req.body.exchangeToken) {
      throw createEmuError('Must specify exchangeToken');
    }
    const activeTest = req.emuSession.activeTests[req.params.testId];
    if (!activeTest) {
      throw createEmuError(`No active test found for id ${req.params.testId}`);
    }
    if (activeTest.exchangeToken !== req.body.exchangeToken) {
      throw createEmuError('Invalid exchangeToken');
    }
    res.send({ token: activeTest.googleToken });
  } catch (error) {
    fhandleErrorResponse(error, req, res);
  }
}

export const getScreenshots = async (req: Request, res: Response) => {
  console.log('[TEST] Getting screenshots');
  try {
    if (!req.params.testId) {
      throw createEmuError('Must specify testId');
    }
    const activeTest = req.emuSession.activeTests[req.params.testId];
    if (!activeTest) {
      throw createEmuError(`No active test found for id ${req.params.testId}`);
    }
    const screenshots = await getScreenshotsFromTest(activeTest);
    res.send({ screenshots });
  } catch (error) {
    fhandleErrorResponse(error, req, res);
  }
}

export const endTest = async (req: Request, res: Response) => {
  console.log('[TEST] Ending test');
  try {
    const testId = req.body.testId;
    if (!testId || !req.emuSession.activeTests[testId]) {
      throw createEmuError('Must pass valid testId');
    }
    const containerName = req.emuSession.activeTests[testId].container?.name;
    if (!containerName) {
      throw createEmuError('Container not found for testId');
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
  } catch (error) {
    fhandleErrorResponse(error, req, res);
  }
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
  try {
    if (!req.params.testId) {
      throw createEmuError('Must specify testId');
    }
    const activeTest = req.emuSession.activeTests[req.params.testId];
    if (!activeTest) {
      throw createEmuError(`No active test found for id ${req.params.testId}`);
    }

    // TODO: Batch reads
    const [testState, emulatorState, bootConfig, agentState, agentLogs] = await Promise.all([
      freadTestState(activeTest.id),
      freadEmulatorState(activeTest.id),
      freadBootConfig(activeTest.id),
      freadAgentState(activeTest.id),
      freadAgentLogs(activeTest.id)
    ]);

    if (!bootConfig) {
      throw createEmuError('Failed to read BOOT_CONFIG');
    };

    let screenshots = {};
    try {
      screenshots = await getScreenshotsFromTest(activeTest);
      // Update screenshots in firebase if changed
      if (Object.keys(screenshots).length !== Object.keys(testState?.screenshots || {}).length) {
        await fwriteTestState(activeTest.id, { ...testState!, screenshots });
      }
    } catch (error) {
      console.log(`Error fetching screenshots: ${formatError(error)}`);
    }

    const response: EmuActiveTestReponse = {
      testState,
      agentState,
      agentLogs,
      emulatorState,
      bootConfig,
    };
    res.send(response);
  } catch (error) {
    fhandleErrorResponse(error, req, res);
  }
}

export const getTraceLogs = async (req: Request, res: Response) => {
  console.log('[TEST] Getting trace logs');
  try {
    if (!req.params.traceId) {
      throw createEmuError('Must specify traceId');
    }
    const logs = await freadTraceLogs(req.params.traceId);
    const response: EmuGetTraceLogsResponse = { logs: logs || [] };
    res.send(response);
  } catch (error) {
    fhandleErrorResponse(error, req, res);
  }
}
