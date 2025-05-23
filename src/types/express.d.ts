import { CloudRunService } from "../services/cloud-run.service";
import { McpService } from "../services/mcp.service";
import { DmcpSession } from "./session";

declare global {
  namespace Express {
    interface Request {
      cloudRunService: CloudRunService;
      dmcpSession: DmcpSession;
      mcpService: McpService;
    }
  }
}
