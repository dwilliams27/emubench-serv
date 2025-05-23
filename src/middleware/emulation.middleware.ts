import { Request, Response } from "express";
import { emulationService } from "../services/emulation.service";

export function emulationMiddleware(req: Request, res: Response, next: () => void) {
  req.emulationService = emulationService;
  next();
}
