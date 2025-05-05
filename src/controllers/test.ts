import { Request, Response } from "express";
import { DmcpSession, TestConfig } from "../types/session";
import { ipcBootGame, ipcLoadStateFile, ipcReadMemwatches, ipcSetEmulationState, ipcSetMemwatches } from "../ipc";

export class TestController {
  sessions: Record<string, DmcpSession>;

  constructor(sessions: Record<string, DmcpSession>) {
    this.sessions = sessions;
  }

  // Async sends test results
  testOrxMessages = async (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Send periodic keep-alive to prevent connection timeout
    const keepAliveInterval = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30000);

    req.dmcpSession.testOrxTransport = { req, res };
    console.log(`TestOrx session established ${req.dmcpSession.mcpTransport?.sessionId}`);
  
    req.on('close', () => {
      clearInterval(keepAliveInterval);
      console.log(`TestOrx session closed ${req.dmcpSession.mcpTransport?.sessionId}`);
      delete req.dmcpSession.testOrxTransport;
    });
  }

  setupTest = async (req: Request, res: Response) => {
    console.log('Setting up test');
    if (req.dmcpSession.setup) {
      res.status(400).send('There is already a test setup');
      return;
    }
    const testConfig: TestConfig = req.body.config;
  
    req.dmcpSession.activeTest = testConfig;
  
    await ipcBootGame(req.dmcpSession.activeTest.gamePath);

    // TODO: Make IPC call block until game is booted
    await new Promise(resolve => setTimeout(resolve, 1000));

    await ipcLoadStateFile(req.dmcpSession.activeTest.startStateFilename);
    await ipcSetEmulationState('pause');

    // TODO: Streamline
    const contextMemWatchesKeys = req.dmcpSession.activeTest.contextMemWatches;
    const endStateMemWatchesKeys = req.dmcpSession.activeTest.endStateMemWatches;
    await ipcSetMemwatches(contextMemWatchesKeys);
    await ipcSetMemwatches(endStateMemWatchesKeys);
    const contextMemWatchesValues = await ipcReadMemwatches(contextMemWatchesKeys);
    const endStateMemWatchesValues = await ipcReadMemwatches(endStateMemWatchesKeys);
    req.dmcpSession.testState = {
      contextMemWatches: contextMemWatchesValues.reduce((acc: Record<string, string>, value: string, index: number) => {
        acc[contextMemWatchesKeys[index]] = value;
        return acc;
      }, {} as Record<string, string>),
      endStateMemWatches: endStateMemWatchesValues.reduce((acc: Record<string, string>, value: string, index: number) => {
        acc[endStateMemWatchesKeys[index]] = value;
        return acc;
      }, {} as Record<string, string>),
    };

    req.dmcpSession.setup = true;
  
    res.send(200);
  }

  startTest = async (req: Request, res: Response) => {
    if (!req.dmcpSession.activeTest) {
      res.status(400).send('No active test found');
      return;
    }
    if (req.dmcpSession.started) {
      res.status(400).send('Test already started');
      return;
    }

    console.log('Starting test');
    await ipcSetEmulationState('play');

    req.dmcpSession.started = true;
  
    res.send(200);
  };
}
