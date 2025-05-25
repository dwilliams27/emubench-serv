import { CloudRunService } from "@/services/cloud-run.service";
import { McpService } from "@/services/mcp.service";
import { EmulationService } from "@/services/emulation.service";
import { EmuSession } from "@/types/session";

declare global {
  namespace Express {
    interface Request {
      cloudRunService: CloudRunService;
      emuSession: EmuSession;
      emulationService: EmulationService;
      mcpService: McpService;
    }
  }
}
