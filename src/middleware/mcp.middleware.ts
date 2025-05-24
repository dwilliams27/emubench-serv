import { mcpService } from "@/services/mcp.service";
import { Request, Response } from "express";

export function mcpMiddleware(req: Request, res: Response, next: () => void) {
  req.mcpService = mcpService;
  next();
}
