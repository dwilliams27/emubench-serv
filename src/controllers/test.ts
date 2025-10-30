import { gcpService } from "@/services/gcp.service";
import { testService } from "@/services/test.service";
import { EmuActiveTestReponse, EmuBootConfig, EmuGetTraceLogsResponse } from "@/shared/types";
import { BOOT_CONFIG_ID, EXPERIMENT_ID, genId, JOB_ID, TEST_ID, TRACE_ID } from "@/shared/utils/id";
import { Request, Response } from "express";
import { createEmuError, formatError } from "@/shared/utils/error";
import { freadAgentLogs, freadTest, freadTestResults, freadTraceLogs, freadTracesByTestId, fwriteExperiment, fwriteJobs, fwriteTest, fwriteTestFields } from "@/shared/services/resource-locator.service";
import { fwriteFormattedTraceLog } from "@/shared/utils/trace";
import { fhandleErrorResponse } from "@/utils/error";
import { EmuExperiment, EmuSetupExperimentRequest, EmuTestQueueJob } from "@/shared/types/experiments";
import { cryptoService } from "@/services/crypto.service";
import { testQueueService } from "@/services/test-queue.service";
import { EmuCondition } from "@/shared/conditions/types";

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
      baseConfig: {
        ...body.experimentConfig.baseConfig,
        experimentId,
      },
      totalTestRuns: body.experimentConfig.totalTestRuns,
      runGroups: body.experimentConfig.runGroups || [],
      status: "running",
      completedTestRunIds: []
    };

    const totalTests = experiment.runGroups.reduce((sum, group) => sum + group.iterations, 0);
    if (totalTests !== experiment.totalTestRuns) {
      throw createEmuError('Total test runs do not match sum of run group iterations');
    }

    const jobs = [];
    for (const runGroup of experiment.runGroups) {
      for (let i = 0; i < runGroup.iterations; i++) {
        const bootConfigCopy = {
          ...experiment.baseConfig,
          agentConfig: {
            ...experiment.baseConfig.agentConfig,
            ...runGroup.baseConfigDelta.agentConfig,
          }
        };
        const job: EmuTestQueueJob = {
          id: genId(JOB_ID),
          bootConfig: {
            ...bootConfigCopy,
            id: genId(BOOT_CONFIG_ID),
            experimentId: experiment.id,
            experimentRunGroupId: runGroup.id,
            testConfig: {
              ...bootConfigCopy.testConfig,
              id: genId(TEST_ID)
            }
          },
          encryptedUserToken: cryptoService.encrypt(req.headers.authorization!.substring(7)),
          status: 'pending',
          error: '',
          startedAt: null,
          completedAt: null
        };
        jobs.push(job);
      }
    }
    await fwriteJobs(jobs);
    await fwriteExperiment(experiment);

    if (!testQueueService.isRunning) {
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
      experimentId: null,
      experimentRunGroupId: null,
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
  try {
    if (!req.params.testId) {
      throw createEmuError('Must specify testId');
    }
    // TODO: Check if test belongs to user
    const screenshots = await getScreenshotsFromTest(req.params.testId);
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

    const test = await freadTest(testId);
    if (!test) {
      throw createEmuError('Test not found');
    }

    const result = await fwriteTestFields(testId, {
      'testState.status': 'finished',
      'emulatorState.status': test.emulatorState.status === 'error' ? test.emulatorState.status : 'finished',
      'agentState.status': test.agentState.status === 'error' ? test.agentState.status : 'finished'
    });

    console.log(`[TEST] Test ${testId} deleted`);
    fwriteFormattedTraceLog(`Test successfuly ended`, req.metadata?.trace);
    res.status(200).send();
  } catch (error) {
    fhandleErrorResponse(error, req, res);
  }
}

const getScreenshotsFromTest = async (testId: string): Promise<Record<string, string>> => {
  let screenshots = {};
  const testScreenshots = await testService.getScreenshots(testId);
  const signedUrlsPromises = testScreenshots.map((screenshot) => new Promise(async (res) => {
    const url = await gcpService.getSignedURL('emubench-sessions', `${testId}/ScreenShots/${screenshot}`);
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
    // TODO: Check if test belongs to user
    const testId = req.params.testId;

    // TODO: Batch reads
    const [test, agentLogs] = await Promise.all([
      freadTest(testId),
      freadAgentLogs(testId)
    ]);

    if (!test) {
      throw createEmuError(`No test found for id ${testId}`);
    }

    if (!test.bootConfig) {
      throw createEmuError('Failed to read BOOT_CONFIG');
    };

    const currentCondition: EmuCondition = test.bootConfig.goalConfig.condition;
    // Not 0 indexed
    const lastHistoryIndex = Object.keys(test.testState.stateHistory).length;
    const lastHistoryKey = `turn_${lastHistoryIndex}`;
    if (test.bootConfig.goalConfig.condition && lastHistoryIndex >= 0 && test.testState.stateHistory[lastHistoryKey]) {
      Object.entries(test.testState.stateHistory[lastHistoryKey].contextMemWatchValues).forEach(([key, value]) => {
        if (currentCondition.inputs[key]) {
          currentCondition.inputs[key].rawValue = value;
        }
      });
    }

    const response: EmuActiveTestReponse = {
      testState: test.testState,
      agentState: test.agentState,
      agentLogs,
      emulatorState: test.emulatorState,
      bootConfig: test.bootConfig,
      screenshots: test.screenshots,
      currentCondition
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

export const getTestResult = async (req: Request, res: Response) => {
  try {
    if (!req.params.testResultId) {
      throw createEmuError('Must specify testResultId');
    }
    const result = await freadTestResults([req.params.testResultId]);
    if (!result || result.length === 0) {
      throw createEmuError(`No test result found for id ${req.params.testResultId}`);
    }
    res.send({ testResult: result[0] });
  } catch (error) {
    fhandleErrorResponse(error, req, res);
  }
}
