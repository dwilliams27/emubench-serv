import { Request, Response } from "express";
import { mcpService } from "../services/mcp.service";

export function mcpMiddleware(req: Request, res: Response, next: () => void) {
  req.mcpService = mcpService;
  next();
}
