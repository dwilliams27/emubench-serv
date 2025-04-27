import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Request, Response } from 'express';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { directionToStickPosition, durationToFrames } from "./utils";
import { ipcGetScreenshot, ipcPostControllerInput } from "./ipc";

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
      'sendControllerInput',
      'Press buttons, move sticks, or press triggers on the gamecube controller',
      {
        actions: z.object({
          buttons: z.object({
            a: z.boolean().optional().describe("Press/release the A button"),
            b: z.boolean().optional().describe("Press/release the B button"),
            x: z.boolean().optional().describe("Press/release the X button"),
            y: z.boolean().optional().describe("Press/release the Y button"),
            z: z.boolean().optional().describe("Press/release the Z button"),
            start: z.boolean().optional().describe("Press/release the Start button"),
            up: z.boolean().optional().describe("Press/release the D-Pad Up button"),
            down: z.boolean().optional().describe("Press/release the D-Pad Down button"),
            left: z.boolean().optional().describe("Press/release the D-Pad Left button"),
            right: z.boolean().optional().describe("Press/release the D-Pad Right button"),
          }).optional().describe("Specify button states (true=pressed, false=released). Omit buttons to leave them unchanged."),

          mainStick: z.object({
            direction: z.enum(["up", "right", "down", "left"]).optional().describe("The direction to move the stick in (up, right, down, left)."),
          }).optional().describe("Specify main analog stick position. Omit to leave unchanged."),

          cStick: z.object({
            direction: z.enum(["up", "right", "down", "left"]).optional().describe("The direction to move the stick in (up, right, down, left)."),
          }).optional().describe("Specify C-stick position. Omit to leave unchanged."),

          triggers: z.object({
             l: z.boolean().optional().describe("Press/release the Left Trigger"),
             r: z.boolean().optional().describe("Press/release the Right Trigger"),
          }).optional().describe("Specify analog trigger pressure. Omit to leave unchanged."),
        }).describe("Define the controller actions to perform. Only include the controls you want to change."),
        duration: z.enum(["short", "medium", "long", "toggle"]).optional().describe("How long to press for; short (5 frames), medium (20 frames), long (60 frames), or toggle").default("short"),
      },
      async ({ actions, duration }): Promise<CallToolResult> => {
        console.log('Received request to press button:', actions);

        const ipcRequest = {
          connected: true,
          ...(actions.buttons ? { buttons: { ...actions.buttons, ...actions.triggers } } : {}),
          ...(actions.mainStick?.direction ? { mainStick: directionToStickPosition(actions.mainStick?.direction) } : {}),
          ...(actions.cStick?.direction ? { cStick: directionToStickPosition(actions.cStick?.direction) } : {}),
          frames: durationToFrames(duration),
        }

        await ipcPostControllerInput(ipcRequest);

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

    this.server.tool(
      'viewScreen',
      'Gives a screenshot of the game',
      {},
      async (): Promise<CallToolResult> => {
        const rawData = await ipcGetScreenshot();
        if (!rawData) {
          return {
            content: [
              {
                type: "text",
                text: "Failed to get screenshot",
              }
            ],
          };
        }
        return {
          content: [
            {
              type: "image",
              data: rawData,
              mimeType: "image/png",
            },
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
