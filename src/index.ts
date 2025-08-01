import express from 'express';
import * as testController from '@/controllers/test';
import { configDotenv } from 'dotenv';
import { firebaseAuthMiddleware } from '@/middleware/firebase-auth.middleware';

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

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// test-orx
app.get('/test-orx/tests', firebaseAuthMiddleware, testController.getEmuTestConfigs);
app.get('/test-orx/tests/:testId', firebaseAuthMiddleware, testController.getEmuTestState);
app.post('/test-orx/setup', firebaseAuthMiddleware, testController.setupTest);
app.post('/test-orx/end', firebaseAuthMiddleware, testController.endTest);
// For agent
app.post('/test-orx/tests/:testId/token-exchange', firebaseAuthMiddleware, testController.attemptTokenExchange);
app.get('/test-orx/tests/:testId/screenshots', firebaseAuthMiddleware, testController.getScreenshots);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
app.listen(PORT, () => {
  console.log(`🪿🛜 emubench-serv listening on port ${PORT}`);
});

process.on('SIGINT', async () => {
  process.exit(0);
});
