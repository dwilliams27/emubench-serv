import { Request } from "express";

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.slice(7).trim();
  return token || null;
}
