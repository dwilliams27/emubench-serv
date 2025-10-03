import { containerService } from "@/services/container.service";
import { gcpService } from "@/services/gcp.service";
import { testService } from "@/services/test.service";
import { ActiveTest } from "@/types/session";
import { EmuActiveTestReponse, EmuBootConfig, EmuGetTraceLogsResponse } from "@/shared/types";
import { BOOT_CONFIG_ID, EXPERIMENT_ID, genId, JOB_ID, TEST_ID, TRACE_ID } from "@/shared/utils/id";
import { Request, Response } from "express";
import { createEmuError, formatError } from "@/shared/utils/error";
import { freadAgentLogs, freadAgentState, freadBootConfig, freadEmulatorState, freadTestState, freadTraceLogs, freadTracesByTestId, fwriteAgentState, fwriteEmulatorState, fwriteJobs, fwriteTestState } from "@/shared/services/resource-locator.service";
import { fwriteFormattedTraceLog } from "@/shared/utils/trace";
import { fhandleErrorResponse } from "@/utils/error";
import { EmuExperiment, EmuExperimentRunGroup, EmuSetupExperimentRequest, EmuTestQueueJob } from "@/shared/types/experiments";
import { cryptoService } from "@/services/crypto.service";
import { testQueueService } from "@/services/test-queue.service";

const DEBUG_MAX_EXPERIMENT_TOTAL_TESTS = 20;

export const setupExperiment = async (req: Request, res: Response) => {
  console.log('[TEST] Setting up experiment');
  try {
    const body = req.body as unknown as EmuSetupExperimentRequest;

    if (!body.experimentConfig) {
      throw createEmuError('Must provide experimentConfig');
    }
    if (body.experimentConfig.totalTestRuns > DEBUG_MAX_EXPERIMENT_TOTAL_TESTS) {
      throw createEmuError('Too many test runs');
    }

    const experimentId = genId(EXPERIMENT_ID);
    const experiment: EmuExperiment = {
      id: experimentId,
      name: body.experimentConfig.name,
      description: body.experimentConfig.description,
      baseConfig: body.experimentConfig.baseConfig,
      totalTestRuns: body.experimentConfig.totalTestRuns,
      runGroups: body.experimentConfig.runGroups || [],

      RESULTS: [],
    };

    const totalTests = experiment.runGroups.reduce((sum, group) => sum + group.iterations, 0);
    if (totalTests !== experiment.totalTestRuns) {
      throw createEmuError('Total test runs do not match sum of run group iterations');
    }

    const jobs = [];
    for (const runGroup of experiment.runGroups) {
      for (let i = 0; i < runGroup.iterations; i++) {
        const job: EmuTestQueueJob = {
          id: genId(JOB_ID),
          bootConfig: runGroup.bootConfig,
          encryptedUserToken: cryptoService.encrypt(req.headers.authorization!.substring(7)),
          status: 'pending',
          error: "",
          startedAt: null,
          completedAt: null
        };
        jobs.push(job);
      }
    }
    await fwriteJobs(jobs);

    if (testQueueService.sleeping) {
      console.log('[TEST] Waking up the lazy workers');
      testQueueService.start();
    }

    res.send({ experimentId });
  } catch (error) {
    fhandleErrorResponse(error, req, res);
  }
}

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

    const test = await testService.runTest(bootConfig, req.headers.authorization!.substring(7));
    req.emuSession.activeTests[testId] = test;
    
    res.send({ testId });
  } catch (error) {
    console.error(`Error setting up test: ${formatError(error)}`);
    fhandleErrorResponse(error, req, res);
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
    fwriteFormattedTraceLog(`Agent token exchange success`, req.metadata?.trace);
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
  const testId = req.body.testId;
  fwriteFormattedTraceLog(`End test recieved`, req.metadata?.trace);
  try {
    if (!testId || !req.emuSession.activeTests[testId]) {
      throw createEmuError('Must pass valid testId');
    }
    const containerName = req.emuSession.activeTests[testId].container?.name;
    if (!containerName) {
      throw createEmuError('Container not found for testId');
    }
    await gcpService.deleteService(containerName);

    const [agentState, emulatorState] = await Promise.all([
      freadAgentState(testId),
      freadEmulatorState(testId),
    ]);
    if (agentState) {
      agentState.status = agentState.status === 'error' ? agentState.status : 'finished';
      await fwriteAgentState(testId, agentState);
    }
    if (emulatorState) {
      emulatorState.status = emulatorState.status === 'error' ? emulatorState.status : 'finished';
      await fwriteEmulatorState(testId, emulatorState);
    }
    await fwriteTestState(testId, { id: testId, status: 'finished' }, { update: true });
    console.log(`[TEST] Test ${testId} deleted`);
    fwriteFormattedTraceLog(`Test successfuly ended`, req.metadata?.trace);
    res.status(200).send();
  } catch (error) {
    fhandleErrorResponse(error, req, res);
  }
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
    const id = req.params.traceId;
    if (id.startsWith(TRACE_ID)) {
      const logs = await freadTraceLogs(req.params.traceId);
      const response: EmuGetTraceLogsResponse = { traces: [{ id, testId: 'NULL', logs: logs || [] }] };
      res.send(response);
    } else if(id.startsWith(TEST_ID)) {
      // Get traceId from testId
      const traces = await freadTracesByTestId(id);
      if (!traces || traces.length === 0) {
        throw createEmuError(`No traces found for testId ${id}`);
      }
      const response: EmuGetTraceLogsResponse = { traces };
      res.send(response);
    }
  } catch (error) {
    fhandleErrorResponse(error, req, res);
  }
}
