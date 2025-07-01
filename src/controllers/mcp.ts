import { containerService } from '@/services/container.service';
import { Request, Response } from 'express';

export const postMcpHandler = async (req: Request, res: Response) => {
  console.log(`Request received: ${req.method} ${req.url}`, {body: req.body});

  const originalJson = res.json;
  res.json = function(body) {
    console.log(`Response being sent:`, JSON.stringify(body, null, 2));
    return originalJson.call(this, body);
  };

  try {
    const emuSessionId = req.headers['mcp-session-id'] as string | undefined;

    if (req.mcpSession?.[1]) {
      console.log(`Reusing MCP transport for session: ${emuSessionId}`);
    } else {
      console.error('Invalid request: No valid session ID');
      // Invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }

    console.log(`Handling request for session: ${emuSessionId}`);
    console.log(`Request body:`, JSON.stringify(req.body, null, 2));
    
    console.log(`Calling transport.handleRequest...`);
    const startTime = Date.now();
    await req.mcpSession[1].handleRequest(req, res, req.body);
    const duration = Date.now() - startTime;
    console.log(`Request handling completed in ${duration}ms for session: ${emuSessionId}`);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
}

export const getMcpHandler = async (req: Request, res: Response) => {
  console.log(`GET Request received: ${req.method} ${req.url}`);

  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!req.mcpSession) {
      console.log(`Invalid session ID in GET request: ${sessionId}`);
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    
    // Check for Last-Event-ID header for resumability
    const lastEventId = req.headers['last-event-id'] as string | undefined;
    if (lastEventId) {
      console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
    } else {
      console.log(`Establishing new stream for session ${sessionId}`);
    }
    
    // Set up connection close monitoring
    res.on('close', () => {
      console.log(`Connection closed for session ${sessionId}`);
    });
    
    console.log(`Starting transport.handleRequest for session ${sessionId}...`);
    const startTime = Date.now();
    await req.mcpSession[1].handleRequest(req, res);
    const duration = Date.now() - startTime;
    console.log(`Setup completed in ${duration}ms for session: ${sessionId}`);
  } catch (error) {
    console.error('Error handling GET request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
}

export const deleteMcpHandler = async (req: Request, res: Response) => {
  console.log(`DELETE Request received: ${req.method} ${req.url}`);
  try {
    if (!req.mcpSession) {
      console.log(`Invalid session ID in DELETE request`);
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    console.log(`Received session termination request for session ${req.mcpSession[0]}`);

    // Capture response for logging
    const originalSend = res.send;
    res.send = function(body) {
      console.log(`DELETE response being sent:`, body);
      return originalSend.call(this, body);
    };
    
    console.log(`Processing session termination...`);
    const startTime = Date.now();
    await req.mcpSession[1].handleRequest(req, res);
    const duration = Date.now() - startTime;

    const serviceName = req.mcpSession?.[0].container?.name;
    if (!serviceName) {
      res.status(400).send(`No active service found`);
      return;
    }
    console.log(`Destroying service ${serviceName}`);
    await containerService.destroyGame(serviceName);

    console.log(`Session termination completed in ${duration}ms for session: ${req.mcpSession[0]}`);
  } catch (error) {
    console.error('Error handling DELETE request:', error);
    if (!res.headersSent) {
      res.status(500).send('Error processing session termination');
    }
  }
}
