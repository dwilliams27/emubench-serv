import { googleAuthService } from "@/services/google-auth.service";
import { Request, Response } from "express";

export function googleAuthMiddleware(req: Request, res: Response, next: () => void) {
  req.googleAuthService = googleAuthService;
  next();
}
