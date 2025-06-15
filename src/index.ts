import express from 'express';
import cors from 'cors';
import * as mcpController from '@/controllers/mcp';
import * as testController from '@/controllers/test';
import { mcpService } from '@/services/mcp.service';
import { configDotenv } from 'dotenv';
import { containerMiddleware } from '@/middleware/container.middleware';
import { emulationMiddleware } from '@/middleware/emulation.middleware';
import { mcpMiddleware } from '@/middleware/mcp.middleware';
import { supabaseAuthMiddleware } from '@/middleware/supabase-auth.middleware';

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

app.use(containerMiddleware);
app.use(emulationMiddleware);
app.use(mcpMiddleware);

// MCP
app.get('/mcp', supabaseAuthMiddleware, mcpController.getMcpHandler);
app.post('/mcp', supabaseAuthMiddleware, mcpController.postMcpHandler);
app.delete('/mcp', supabaseAuthMiddleware, mcpController.deleteMcpHandler);

// test-orx
app.get('/test-orx/tests', supabaseAuthMiddleware, testController.getTestConfigs);
app.get('/test-orx/tests/:testId', supabaseAuthMiddleware, testController.getTestConfigs);
app.post('/test-orx/setup', supabaseAuthMiddleware, testController.setupTest);
app.post('/test-orx/start', supabaseAuthMiddleware, testController.startTest);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
app.listen(PORT, () => {
  console.log(`🪿🛜 emubench-serv listening on port ${PORT}`);
});

process.on('SIGINT', async () => {
  // TODO: Delete stuff
  await mcpService.destroy();
  process.exit(0);
});
