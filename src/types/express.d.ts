import { CloudRunService } from "@/services/cloud-run.service";
import { McpService } from "@/services/mcp.service";
import { EmulationService } from "@/services/emulation.service";
import { ActiveTest, EmuSession } from "@/types/session";
import { ContainerService } from "@/services/container.service";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

declare global {
  namespace Express {
    interface Request {
      emuSession: EmuSession;
      mcpSession?: [ActiveTest, StreamableHTTPServerTransport];
      user?: {
        id: string;
        email?: string;
        provider: 'firebase';
      }
    }
  }
}
