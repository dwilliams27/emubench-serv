import { emulationService } from "@/services/emulation.service";
import { sessionService } from "@/services/session.service";
import { ActiveTest } from "@/types/session";
import { directionToStickPosition, durationToFrames } from "@/utils/tools";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export class McpService {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'dolphin-mcp-serv',
      version: '1.0.0',
    }, { capabilities: { logging: {} } });

    this.setupBasicTools();
  }

  getServer() {
    return this.server;
  }

  getActiveTest(context: RequestHandlerExtra<any, any>): ActiveTest {
    if (!context.sessionId) {
      throw new Error('No session ID provided in request context');
    }
    const session = sessionService.getMcpSession(context.sessionId);
    if (!session) {
      throw new Error('No session found for ID: ' + context.sessionId);
    }

    return session[0];
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
        duration: z.enum(["short", "medium", "long", "toggle"]).optional().describe("How long to press for; short (5 frames), medium (60 frames), long (120 frames), or toggle").default("short"),
      },
      async ({ actions, duration }, context): Promise<CallToolResult> => {
        console.log('Received request to press button:', actions);

        let activeTest;
        try {
          activeTest = this.getActiveTest(context);
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${(error as any).message}`,
              }
            ],
          };
        }

        const ipcRequest = {
          connected: true,
          ...((actions.buttons || actions.triggers) ? { buttons: { ...actions.buttons, ...actions.triggers } } : {}),
          ...(actions.mainStick?.direction ? { mainStick: directionToStickPosition(actions.mainStick?.direction) } : {}),
          ...(actions.cStick?.direction ? { cStick: directionToStickPosition(actions.cStick?.direction) } : {}),
          frames: durationToFrames(duration),
        }
        
        const inputResponse = await emulationService.postControllerInput(activeTest, ipcRequest);
        if (inputResponse) {
          activeTest.emuTestMemoryState.endStateMemWatchValues = inputResponse.endStateMemWatchValues;
          activeTest.emuTestMemoryState.contextMemWatchValues = inputResponse.contextMemWatchValues;
        } else {
          console.warn('Issue fetching memwatches from input req.')
        }

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
      async (_, context): Promise<CallToolResult> => {
        let activeTest;
        try {
          activeTest = this.getActiveTest(context);
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${(error as any).message}`,
              }
            ],
          };
        }

        const rawData = await emulationService.getScreenshot(activeTest);
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

  async destroy() {
    console.log('Shutting down server...');
    await this.server.close();
    console.log('Server shutdown complete');
  }
}

const mcpService = new McpService();

export { mcpService };
