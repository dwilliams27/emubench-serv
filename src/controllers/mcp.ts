import { Request, Response } from 'express';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";


export const getMcpHandler = async (req: Request, res: Response) => {
  console.log('Establishing SSE stream for MCP');

  try {
    const transport = new SSEServerTransport('/messages', res);
    req.dmcpSession.mcpTransport = transport;

    req.dmcpSession.mcpTransport.onclose = () => {
      console.log(`SSE transport closed for session ${req.dmcpSession.mcpTransport?.sessionId}`);
      delete req.dmcpSession.mcpTransport;
    };

    await req.mcpService.server.connect(req.dmcpSession.mcpTransport);
    await req.dmcpSession.mcpTransport.start();

    console.log(`Established SSE stream with session ID: ${req.dmcpSession.mcpTransport?.sessionId}`);
  } catch (error) {
    console.error('Error establishing SSE stream:', error);
    if (!res.headersSent) {
      res.status(500).send('Error establishing SSE stream');
    }
  }
}

export const postMessagesHandler = async (req: Request, res: Response) => {
  console.log('Received POST request to /messages');
  const sessionId = req.query.sessionId as string | undefined;

  if (!sessionId) {
    console.error('No session ID provided in request URL');
    res.status(400).send('Missing sessionId parameter');
    return;
  }

  const transport = req.dmcpSession.mcpTransport;
  if (!transport) {
    console.error(`No active transport found for session ID: ${sessionId}`);
    res.status(404).send('Session not found');
    return;
  }

  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error('Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).send('Error handling request');
    }
  }
}
