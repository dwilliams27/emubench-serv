import express from 'express';
import cors from 'cors';
import { cloudRunMiddleware } from '@/middleware/cloud-run.middleware';
import { sessionMiddleware } from '@/middleware/session.middleware';
import * as mcpController from '@/controllers/mcp';
import * as testController from '@/controllers/test';
import { sessionService } from '@/services/session.service';
import { mcpService } from '@/services/mcp.service';
import { configDotenv } from 'dotenv';

configDotenv();

const app = express();
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-dmcp-session-id'],
  credentials: true
}));

app.use(cloudRunMiddleware);
app.use(sessionMiddleware);

app.get('/health', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// MCP
app.get('/mcp', mcpController.getMcpHandler);
app.post('/messages', mcpController.postMessagesHandler);

// test-orx 
app.get('/test-orx/events', testController.testOrxMessages);
app.post('/test-orx/setup', testController.setupTest);
app.post('/test-orx/start', testController.startTest);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
app.listen(PORT, () => {
  console.log(`🐬🛜 dolphin-mcp-serv listening on port ${PORT}`);
});

process.on('SIGINT', async () => {
  for(const sessionId in sessionService.sessions) {
    const session = sessionService.sessions[sessionId];
    if (session.mcpTransport) {
      console.log(`Closing MCP transport for session ${sessionId}`);
      await session.mcpTransport.close();
    }
    if (session.testOrxTransport) {
      console.log(`Closing TestOrx transport for session ${sessionId}`);
      await session.testOrxTransport.res.end();
    }
  }
  await mcpService.destroy();
  process.exit(0);
});
