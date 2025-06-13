import { CloudRunService } from "@/services/cloud-run.service";
import { McpService } from "@/services/mcp.service";
import { EmulationService } from "@/services/emulation.service";
import { EmuSession } from "@/types/session";
import { ContainerService } from "@/services/container.service";
import { GoogleAuthService } from "@/services/google-auth.service";

declare global {
  namespace Express {
    interface Request {
      containerService: ContainerService;
      emuSession: EmuSession;
      emulationService: EmulationService;
      mcpService: McpService;
      googleAuthService: GoogleAuthService;
    }
  }
}
