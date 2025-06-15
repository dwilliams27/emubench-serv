import { ActiveTest, TestConfig, TestState } from "@/types/session";
import { genId, MCP_SESSION_ID, TEST_AUTH_KEY_ID, TEST_ID } from "@/utils/id";
import { Request, Response } from "express";

export const setupTest = async (req: Request, res: Response) => {
  console.log('Setting up test');

  try {
    const testConfig: TestConfig = req.body.config;
    const testId = genId(TEST_ID);
    const testAuthKey = genId(TEST_AUTH_KEY_ID);
    const testState: TestState = {
      setup: false,
      started: false,
      finished: false,
      images: [],
      messages: [],
      contextMemWatchValues: {},
      endStateMemWatchValues: {}
    };
    const { identityToken, service } = await req.containerService.deployCloudRunService(testId, testConfig);

    const activeTest: ActiveTest = {
      id: testId,
      mcpSessionId: genId(MCP_SESSION_ID),
      config: testConfig,
      state: testState,
      container: service,
      googleToken: identityToken
    }

    req.emuSession.activeTests[testId] = activeTest;

    // TODO leverage new method
    // if (Object.keys(activeTest.config.contextMemWatches).length > 0) {
    //   await req.emulationService.setupMemWatches(activeTest, activeTest.config.contextMemWatches);
    //   activeTest.state.contextMemWatches = await req.emulationService.readMemWatches(activeTest, Object.keys(activeTest.state.contextMemWatches));
    // }
    // if (Object.keys(activeTest.config.endStateMemWatches).length > 0) {
    //   await req.emulationService.setupMemWatches(activeTest, activeTest.config.endStateMemWatches);
    //   activeTest.state.endStateMemWatches = await req.emulationService.readMemWatches(activeTest, Object.keys(activeTest.state.endStateMemWatches));
    // }

    console.log('State:', activeTest.state);

    activeTest.state.setup = true;

    if (activeTest.config.autoStart) {
      await req.emulationService.setEmulationState(activeTest, 'play');
    }
    
    // TODO: Push to DB

    res.send(200);
  } catch (error) {
    console.error('Error setting up test:', JSON.stringify(error));
    res.status(500).send('Failed to set up test');
  }
}

export const getTestConfigs = async (req: Request, res: Response) => {
  // TODO: Fetch from DB
}

export const getTestState = async (req: Request, res: Response): Promise<{ state?: TestState }> => {
  if (!req.params.testId) {
    res.status(400).send('Must specify testId');
    return {};
  }
  const activeTest = req.emuSession.activeTests[req.params.testId];
  if (!activeTest) {
    res.status(400).send(`No active test found for id ${req.params.testId}`);
    return {};
  }
  if (activeTest.state.started) {
    res.status(400).send('Test already started');
    return {};
  }
  const contextMemWatchValues = (await req.emulationService.readMemWatches(activeTest, Object.keys(activeTest.config.contextMemWatches))).values;
  const endStateMemWatchValues = (await req.emulationService.readMemWatches(activeTest, Object.keys(activeTest.config.endStateMemWatches))).values;

  activeTest.state.contextMemWatchValues = contextMemWatchValues;
  activeTest.state.endStateMemWatchValues = endStateMemWatchValues;
  // TODO: Fetch image from bucket
  // TODO: Pull in LLM messages

  return {
    state: activeTest.state
  }
}

export const startTest = async (req: Request, res: Response) => {
  if (!req.body.testId) {
    res.status(400).send('Must specify testId');
    return;
  }
  const activeTest = req.emuSession.activeTests[req.body.testId];
  if (!activeTest) {
    res.status(400).send(`No active test found for id ${req.body.testId}`);
    return;
  }
  if (activeTest.state.started) {
    res.status(400).send('Test already started');
    return;
  }

  console.log('Starting test');
  await req.emulationService.setEmulationState(activeTest, 'play');

  activeTest.state.started = true;

  res.send(200);
};
