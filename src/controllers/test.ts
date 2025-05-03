import { Request, Response } from "express";
import { DmcpSession, TestConfig } from "../types/session";

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

    const id = Math.random().toString();
    req.dmcpSession.testOrxTransport = { id, req, res };
    console.log(`TestOrx session established: ${id} for dmcp-session ${req.dmcpSession.mcpTransport?.sessionId}`);
  
    req.on('close', () => {
      clearInterval(keepAliveInterval);
      console.log(`TestOrx session closed: ${req.dmcpSession.testOrxTransport?.id} for dmcp-session ${req.dmcpSession.mcpTransport?.sessionId}`);
      delete req.dmcpSession.testOrxTransport;
    });
  }

  setupTest = async (req: Request, res: Response) => {
    console.log('Setting up test');
    const testConfig: TestConfig = req.body.config;
  
    req.dmcpSession.activeTest = testConfig;
  
    // TODO: File based save states (with pause?)
    // await ipcLoadSaveState();
  
    res.send(200);
  }

  startTest = (req: Request, res: Response) => {
    console.log('Starting test');
  
    // TODO: Play
    // await ipcPlayEmulation();

    req.dmcpSession.started = true;
  
    res.send(200);
  };
}
