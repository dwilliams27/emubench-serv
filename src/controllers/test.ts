import { TestConfig, TestState } from "@/types/session";
import { genId, TEST_AUTH_KEY_ID, TEST_ID } from "@/utils/id";
import { auth } from "@modelcontextprotocol/sdk/client/auth.js";
import { Request, Response } from "express";

// Async sends test results
export const testOrxMessages = async (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Send periodic keep-alive to prevent connection timeout
  const keepAliveInterval = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);

  req.emuSession.testOrxTransport = { req, res };
  console.log(`TestOrx session established ${req.emuSession.mcpTransport?.sessionId}`);

  req.on('close', () => {
    clearInterval(keepAliveInterval);
    console.log(`TestOrx session closed ${req.emuSession.mcpTransport?.sessionId}`);
    delete req.emuSession.testOrxTransport;
  });
}

export const setupTest = async (req: Request, res: Response) => {
  console.log('Setting up test');

  const testConfig: TestConfig = req.body.config;
  const testId = genId(TEST_ID);
  const testAuthKey = genId(TEST_AUTH_KEY_ID, 32);
  const testState: TestState = {
    setup: false,
    started: false,
    finished: false,
    contextMemWatches: {},
    endStateMemWatches: {}
  };
  const testContainer = await req.cloudRunService.deployGameContainer(testId, testConfig);

  const activeTest = {
    id: testId,
    config: testConfig,
    state: testState,
    container: testContainer,
    authKey: testAuthKey
  }

  req.emuSession.activeTests[testId] = activeTest;

  // Setup then fetch initials for memwatches
  if (Object.keys(activeTest.config.contextMemWatches).length > 0) {
    await req.emulationService.setupMemWatches(activeTest, activeTest.config.contextMemWatches);
    activeTest.state.contextMemWatches = await req.emulationService.readMemWatches(activeTest, Object.keys(activeTest.state.contextMemWatches));
  }
  if (Object.keys(activeTest.config.endStateMemWatches).length > 0) {
    await req.emulationService.setupMemWatches(activeTest, activeTest.config.endStateMemWatches);
    activeTest.state.endStateMemWatches = await req.emulationService.readMemWatches(activeTest, Object.keys(activeTest.state.endStateMemWatches));
  }

  console.log('State:', activeTest.state);

  activeTest.state.setup = true;

  if (activeTest.config.autoStart) {
    await req.emulationService.setEmulationState(activeTest, 'play');
  }

  res.send(200);
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
