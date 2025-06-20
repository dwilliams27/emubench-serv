import { ActiveTest, EmuTestConfig, EmuTestState } from "@/types/session";
import { genId, MCP_SESSION_ID, TEST_ID } from "@/utils/id";
import { Request, Response } from "express";

export const setupTest = async (req: Request, res: Response) => {
  console.log('Setting up test');

  try {
    const testId = genId(TEST_ID);
    const testConfig: EmuTestConfig = { ...req.body.config, id: testId };
    const testState: EmuTestState = {
      state: 'booting',
      contextMemWatchValues: {},
      endStateMemWatchValues: {}
    };
    const { identityToken, service } = await req.containerService.deployCloudRunService(testId, testConfig);

    const activeTest: ActiveTest = {
      id: testId,
      mcpSessionId: genId(MCP_SESSION_ID),
      emuConfig: testConfig,
      emuState: testState,
      container: service,
      googleToken: identityToken
    }

    req.emuSession.activeTests[testId] = activeTest;

    console.log('State:', activeTest.emuState);

    // TODO: Sync from FUSE
    activeTest.emuState.state = 'ready';
    
    // TODO: Push to DB

    res.send({ testId, mcpSessionId: activeTest.mcpSessionId });
  } catch (error) {
    console.error('Error setting up test:', JSON.stringify(error));
    res.status(500).send('Failed to set up test');
  }
}

export const getEmuTestConfigs = async (req: Request, res: Response) => {
  // TODO: Fetch from DB
}

export const getEmuTestState = async (req: Request, res: Response): Promise<{ state?: EmuTestState }> => {
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

  activeTest.emuState.contextMemWatchValues = contextMemWatchValues;
  activeTest.emuState.endStateMemWatchValues = endStateMemWatchValues;
  // TODO: Fetch image from bucket
  // TODO: Pull in LLM messages

  return {
    state: activeTest.emuState
  }
}
