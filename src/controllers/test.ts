import { ActiveTest, EmuTestConfig, EmuTestMemoryState, EmuTestState, SESSION_FUSE_PATH } from "@/types/session";
import { genId, MCP_SESSION_ID, TEST_ID } from "@/utils/id";
import { Request, Response } from "express";
import { readFile } from "fs/promises";
import path from "path";

export const setupTest = async (req: Request, res: Response) => {
  console.log('Setting up test');

  try {
    const testId = genId(TEST_ID);
    const testConfig: EmuTestConfig = { ...req.body.config, id: testId };
    const testState: EmuTestState = {
      state: 'booting',
    };
    const testMemoryState: EmuTestMemoryState = {
      contextMemWatchValues: {},
      endStateMemWatchValues: {}
    }
    const mcpSessionId = genId(MCP_SESSION_ID);

    // Deploy game and agent
    const gamePromise = req.containerService.deployGame(testId, testConfig);
    const agentPromise = req.containerService.deployAgent(testId, mcpSessionId, req.headers['Authorization'] as string);
    const [gameContainer, agentContainer] = await Promise.all([gamePromise, agentPromise]);
    const { identityToken, service } = gameContainer;

    const activeTest: ActiveTest = {
      id: testId,
      mcpSessionId,
      emuConfig: testConfig,
      emuTestState: testState,
      emuTestMemoryState: testMemoryState,
      container: service,
      googleToken: identityToken
    }

    req.emuSession.activeTests[testId] = activeTest;

    console.log('State:', activeTest.emuTestState);

    try {
      const testStateData = await readFile(
        path.join(`${SESSION_FUSE_PATH}/${testId}`, 'test_state.json'), 
        'utf8'
      );
      const testStateFromFile = JSON.parse(testStateData) as EmuTestState;
      if (testStateFromFile.state === "booting") {
        console.warn(`Test state from file is not ready: ${testStateFromFile.state}`);
      }
      activeTest.emuTestState = testStateFromFile;
    } catch (error) {
      console.error('Error reading test_state.json:', error);
    }
    
    // TODO: Push to DB

    res.send({ testId });
  } catch (error) {
    console.error('Error setting up test:', JSON.stringify(error));
    res.status(500).send('Failed to set up test');
  }
}

export const getEmuTestConfigs = async (req: Request, res: Response) => {
  // TODO: Fetch from DB
}

export const getEmuTestState = async (req: Request, res: Response): Promise<{ state?: EmuTestState, memoryState?: EmuTestMemoryState }> => {
  if (!req.params.testId) {
    res.status(400).send('Must specify testId');
    return {};
  }
  const activeTest = req.emuSession.activeTests[req.params.testId];
  if (!activeTest) {
    res.status(400).send(`No active test found for id ${req.params.testId}`);
    return {};
  }
  const contextMemWatchValues = (await req.emulationService.readMemWatches(activeTest, Object.keys(activeTest.emuConfig.contextMemWatches))).values;
  const endStateMemWatchValues = (await req.emulationService.readMemWatches(activeTest, Object.keys(activeTest.emuConfig.endStateMemWatches))).values;

  activeTest.emuTestMemoryState.contextMemWatchValues = contextMemWatchValues;
  activeTest.emuTestMemoryState.endStateMemWatchValues = endStateMemWatchValues;
  // TODO: Fetch image from bucket
  // TODO: Pull in LLM messages

  return {
    state: activeTest.emuTestState,
    memoryState: activeTest.emuTestMemoryState
  }
}
