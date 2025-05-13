import express from 'express';
import cors from 'cors';
import { DmcpSession } from './types/session';
import { DolphinMcpController } from './controllers/mcp';
import { TestController } from './controllers/test';
import { SessionMiddleware } from './middleware/sessionIdMiddleware';

const app = express();
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-dmcp-session-id'],
  credentials: true
}));

// x-dmcp-session-id
const sessions: Record<string, DmcpSession> = {};
const sessionMiddleware = new SessionMiddleware(sessions);

app.use(sessionMiddleware.middleware);

const mcp = new DolphinMcpController(sessions);
const test = new TestController(sessions);

// MCP
app.get('/mcp', mcp.getMcpHandler);
app.post('/messages', mcp.postMessagesHandler);

// test-orx 
app.get('/test-orx/events', test.testOrxMessages);
app.post('/test-orx/setup', test.setupTest);
app.post('/test-orx/start', test.startTest);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🐬🛜 dolphin-mcp-serv listening on port ${PORT}`);
});

process.on('SIGINT', async () => {
  for(const sessionId in sessions) {
    const session = sessions[sessionId];
    if (session.mcpTransport) {
      console.log(`Closing MCP transport for session ${sessionId}`);
      await session.mcpTransport.close();
    }
    if (session.testOrxTransport) {
      console.log(`Closing TestOrx transport for session ${sessionId}`);
      await session.testOrxTransport.res.end();
    }
  }
  await mcp.destroy();
  process.exit(0);
});
