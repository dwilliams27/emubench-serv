import { containerService } from "@/services/container.service";
import { emulationService } from "@/services/emulation.service";
import { testService } from "@/services/test.service";
import { ActiveTest, EmuAgentConfig, EmuTestConfig, EmuTestMemoryState, EmuTestState, SESSION_FUSE_PATH } from "@/types/session";
import { genId, MCP_SESSION_ID, TEST_ID } from "@/utils/id";
import { Request, Response } from "express";

export const setupTest = async (req: Request, res: Response) => {
  console.log('Setting up test');

  try {
    const testId = genId(TEST_ID);
    const testConfig: EmuTestConfig = { ...req.body.testConfig, id: testId };
    const agentConfig: EmuAgentConfig = { ...req.body.agentConfig, mcpServerEndpoint: 'https://api.emubench.com/mcp' };
    const testState: EmuTestState = {
      state: 'booting',
    };
    const testMemoryState: EmuTestMemoryState = {
      contextMemWatchValues: {},
      endStateMemWatchValues: {}
    }
    const mcpSessionId = genId(MCP_SESSION_ID);

    // Write config to bucket
    const writeConfig = await testService.writeBootConfig({ testConfig, agentConfig });
    if (!writeConfig) {
      console.error('Failed to write boot config file');
      res.status(500).send('Failed to write boot config file');
      return;
    }

    // Deploy game and agent
    const gamePromise = containerService.deployGame(testId, testConfig);
    const agentPromise = containerService.runAgent(testId, mcpSessionId, req.headers.authorization!.substring(7));

    const [gameContainer, agentJob] = await Promise.all([gamePromise, agentPromise]);
    
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
  const contextMemWatchValues = (await emulationService.readMemWatches(activeTest, Object.keys(activeTest.emuConfig.contextMemWatches))).values;
  const endStateMemWatchValues = (await emulationService.readMemWatches(activeTest, Object.keys(activeTest.emuConfig.endStateMemWatches))).values;

  activeTest.emuTestMemoryState.contextMemWatchValues = contextMemWatchValues;
  activeTest.emuTestMemoryState.endStateMemWatchValues = endStateMemWatchValues;
  // TODO: Fetch image from bucket
  // TODO: Pull in LLM messages

  return {
    // TODO: Fetch this from file evey time
    state: activeTest.emuTestState,
    memoryState: activeTest.emuTestMemoryState
  }
}
