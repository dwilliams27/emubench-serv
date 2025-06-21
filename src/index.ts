import express from 'express';
import * as mcpController from '@/controllers/mcp';
import * as testController from '@/controllers/test';
import { mcpService } from '@/services/mcp.service';
import { configDotenv } from 'dotenv';
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

// MCP
app.get('/mcp', supabaseAuthMiddleware, mcpController.getMcpHandler);
app.post('/mcp', supabaseAuthMiddleware, mcpController.postMcpHandler);
app.delete('/mcp', supabaseAuthMiddleware, mcpController.deleteMcpHandler);

// test-orx
app.get('/test-orx/tests', supabaseAuthMiddleware, testController.getEmuTestConfigs);
app.get('/test-orx/tests/:testId', supabaseAuthMiddleware, testController.getEmuTestConfigs);
app.post('/test-orx/setup', supabaseAuthMiddleware, testController.setupTest);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
app.listen(PORT, () => {
  console.log(`🪿🛜 emubench-serv listening on port ${PORT}`);
});

process.on('SIGINT', async () => {
  // TODO: Delete stuff
  await mcpService.destroy();
  process.exit(0);
});
