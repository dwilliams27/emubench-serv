import { cloudRunService } from "@/services/cloud-run.service";
import { Request, Response } from "express";

export function cloudRunMiddleware(req: Request, res: Response, next: () => void) {
  req.cloudRunService = cloudRunService;
  next();
}
