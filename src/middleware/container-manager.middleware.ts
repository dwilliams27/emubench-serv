import { containerManagerService } from "@/services/container-manager.service";
import { Request, Response } from "express";

export function containerManagerMiddleware(req: Request, res: Response, next: () => void) {
  req.containerManagerService = containerManagerService;
  next();
}
