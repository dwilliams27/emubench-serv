import express, { Request, Response } from 'express';
import { DolphinMcpServer } from './server';

const app = express();
app.use(express.json());

const server = new DolphinMcpServer();

app.get('/mcp', async (req: Request, res: Response) => {
  await server.getMcpHandler(req, res);
});

app.post('/messages', async (req: Request, res: Response) => {
  await server.postMessagesHandler(req, res);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🐬🛜 SSE MCP server listening on port ${PORT}`);
});

process.on('SIGINT', async () => {
  server.destroy();
  process.exit(0);
});
