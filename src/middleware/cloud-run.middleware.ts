import { Request, Response } from "express";
import { cloudRunService } from "../services/cloud-run.service";

export function cloudRunMiddleware(req: Request, res: Response, next: () => void) {
  req.cloudRunService = cloudRunService;
  next();
}
