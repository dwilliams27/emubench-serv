import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Request, Response } from 'express';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

/**
 * TODO: Move off sse
 */
export class DolphinMcpServer {
  server: McpServer;
  transports: Record<string, SSEServerTransport> = {};

  constructor() {
    this.server = new McpServer({
      name: 'dolphin-mcp-serv',
      version: '1.0.0',
    }, { capabilities: { logging: {} } });

    this.setupBasicTools();
  }

  setupBasicTools() {
    this.server.tool(
      'start-notification-stream',
      'Starts sending periodic notifications',
      {
        interval: z.number().describe('Interval in milliseconds between notifications').default(1000),
        count: z.number().describe('Number of notifications to send').default(10),
      },
      async ({ interval, count }, { sendNotification }): Promise<CallToolResult> => {
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        let counter = 0;
    
        // Send the initial notification
        await sendNotification({
          method: "notifications/message",
          params: {
            level: "info",
            data: `Starting notification stream with ${count} messages every ${interval}ms`
          }
        });
    
        // Send periodic notifications
        while (counter < count) {
          counter++;
          await sleep(interval);
    
          try {
            await sendNotification({
              method: "notifications/message",
              params: {
                level: "info",
                data: `Notification #${counter} at ${new Date().toISOString()}`
              }
            });
          }
          catch (error) {
            console.error("Error sending notification:", error);
          }
        }
    
        return {
          content: [
            {
              type: 'text',
              text: `Completed sending ${count} notifications every ${interval}ms`,
            }
          ],
        };
      }
    );
  }

  async getMcpHandler(req: Request, res: Response) {
    console.log('Received GET request to /sse (establishing SSE stream)');

    try {
      const transport = new SSEServerTransport('/messages', res);

      const sessionId = transport.sessionId;
      this.transports[sessionId] = transport;

      transport.onclose = () => {
        console.log(`SSE transport closed for session ${sessionId}`);
        delete this.transports[sessionId];
      };

      await this.server.connect(transport);
      await transport.start();

      console.log(`Established SSE stream with session ID: ${sessionId}`);
    } catch (error) {
      console.error('Error establishing SSE stream:', error);
      if (!res.headersSent) {
        res.status(500).send('Error establishing SSE stream');
      }
    }
  }

  async postMessagesHandler(req: Request, res: Response) {
    console.log('Received POST request to /messages');
    const sessionId = req.query.sessionId as string | undefined;

    if (!sessionId) {
      console.error('No session ID provided in request URL');
      res.status(400).send('Missing sessionId parameter');
      return;
    }

    const transport = this.transports[sessionId];
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

  async destroy() {
    console.log('Shutting down server...');

    for (const sessionId in this.transports) {
      try {
        console.log(`Closing transport for session ${sessionId}`);
        await this.transports[sessionId].close();
        delete this.transports[sessionId];
      } catch (error) {
        console.error(`Error closing transport for session ${sessionId}:`, error);
      }
    }
    await this.server.close();
    console.log('Server shutdown complete');
  }
}
