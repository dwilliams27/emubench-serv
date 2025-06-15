import express from 'express';
import cors from 'cors';
import { sessionMiddleware } from '@/middleware/session.middleware';
import * as mcpController from '@/controllers/mcp';
import * as testController from '@/controllers/test';
import { sessionService } from '@/services/session.service';
import { mcpService } from '@/services/mcp.service';
import { configDotenv } from 'dotenv';
import { containerMiddleware } from '@/middleware/container.middleware';
import { emulationMiddleware } from '@/middleware/emulation.middleware';
import { mcpMiddleware } from '@/middleware/mcp.middleware';
import { supabaseAuthMiddleware } from '@/middleware/supabase-auth.middleware';
import { readdirSync } from 'fs';

configDotenv();

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://emubench.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(sessionMiddleware);
app.use(containerMiddleware);
app.use(emulationMiddleware);
app.use(mcpMiddleware);

app.get('/health', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// MCP
app.get('/mcp', supabaseAuthMiddleware, mcpController.getMcpHandler);
app.post('/messages', supabaseAuthMiddleware, mcpController.postMessagesHandler);

// test-orx
app.get('/test-orx/tests', supabaseAuthMiddleware, testController.getTestConfigs);
app.get('/test-orx/tests/:testId', supabaseAuthMiddleware, testController.getTestConfigs);
app.post('/test-orx/setup', supabaseAuthMiddleware, testController.setupTest);
app.post('/test-orx/start', supabaseAuthMiddleware, testController.startTest);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
app.listen(PORT, () => {
  console.log(`🪿🛜 emubench-serv listening on port ${PORT}`);
  // Log contents of /tmp/gcp/emubench-sessions
  const files = readdirSync('/tmp/gcs/emubench-sessions');
  if (files.length > 0) {
    console.log('🪿🛜 Current session files:');
    files.forEach(file => {
      console.log(`- ${file}`);
    });
  } else {
    console.log('🪿🛜 No session files found.');
  }
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
