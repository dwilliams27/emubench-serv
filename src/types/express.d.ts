import { CloudRunService } from "@/services/cloud-run.service";
import { McpService } from "@/services/mcp.service";
import { EmulationService } from "@/services/emulation.service";
import { EmuSession } from "@/types/session";
import { ContainerManagerService } from "@/services/container-manager.service";

declare global {
  namespace Express {
    interface Request {
      containerManagerService: ContainerManagerService;
      emuSession: EmuSession;
      emulationService: EmulationService;
      mcpService: McpService;
    }
  }
}
