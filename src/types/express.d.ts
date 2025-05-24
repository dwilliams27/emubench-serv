import { CloudRunService } from "@/services/cloud-run.service";
import { McpService } from "@/services/mcp.service";
import { EmulationService } from "@/services/emulation.service";
import { DmcpSession } from "@/types/session";

declare global {
  namespace Express {
    interface Request {
      cloudRunService: CloudRunService;
      dmcpSession: DmcpSession;
      emulationService: EmulationService;
      mcpService: McpService;
    }
  }
}
