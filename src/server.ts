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
      'pressButton',
      'Press a button on the gamecube controller',
      {
        actions: z.object({
          buttons: z.object({
            a: z.boolean().optional().describe("Press (true) or release (false) the A button"),
            b: z.boolean().optional().describe("Press (true) or release (false) the B button"),
            x: z.boolean().optional().describe("Press (true) or release (false) the X button"),
            y: z.boolean().optional().describe("Press (true) or release (false) the Y button"),
            z: z.boolean().optional().describe("Press (true) or release (false) the Z button"),
            start: z.boolean().optional().describe("Press (true) or release (false) the Start button"),
            up: z.boolean().optional().describe("Press (true) or release (false) the D-Pad Up button"),
            down: z.boolean().optional().describe("Press (true) or release (false) the D-Pad Down button"),
            left: z.boolean().optional().describe("Press (true) or release (false) the D-Pad Left button"),
            right: z.boolean().optional().describe("Press (true) or release (false) the D-Pad Right button"),
            l: z.boolean().optional().describe("Press (true) or release (false) the L shoulder button"),
            r: z.boolean().optional().describe("Press (true) or release (false) the R shoulder button"),
          }).optional().describe("Specify button states (true for pressed, false for released). Omit buttons to leave them unchanged."),

          mainStick: z.object({
            direction: z.enum(["up", "right", "down", "left"]).optional().describe("The direction to move the stick in (up, right, down, left)."),
          }).optional().describe("Specify main analog stick position. Omit to leave unchanged."),

          cStick: z.object({
            direction: z.enum(["up", "right", "down", "left"]).optional().describe("The direction to move the stick in (up, right, down, left)."),
          }).optional().describe("Specify C-stick position. Omit to leave unchanged."),

          triggers: z.object({
             l: z.number().min(0).max(255).optional().describe("Left trigger pressure (0=released, 255=fully pressed)"),
             r: z.number().min(0).max(255).optional().describe("Right trigger pressure (0=released, 255=fully pressed)"),
          }).optional().describe("Specify analog trigger pressure. Omit to leave unchanged."),

        }).describe("Define the controller actions to perform. Only include the controls you want to change."),
        duration: z.enum(["short", "medium", "long"]).optional().describe("How long to press for; short (5 frames), medium (10 frames), long (20 frames)").default("short"),
      },
      async ({ actions }): Promise<CallToolResult> => {
        console.log('Received request to press button:', actions);
        return {
          content: [
            {
              type: 'text',
              text: `Done!`,
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
