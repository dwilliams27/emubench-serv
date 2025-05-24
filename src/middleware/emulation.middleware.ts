import { emulationService } from "@/services/emulation.service";
import { Request, Response } from "express";

export function emulationMiddleware(req: Request, res: Response, next: () => void) {
  req.emulationService = emulationService;
  next();
}
