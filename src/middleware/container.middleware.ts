import { containerService } from "@/services/container.service";
import { Request, Response } from "express";

export function containerMiddleware(req: Request, res: Response, next: () => void) {
  req.containerService = containerService;
  next();
}
