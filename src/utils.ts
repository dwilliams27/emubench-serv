import { Request } from "express";

export function directionToStickPosition(direction: string): { x: number; y: number } {
  switch (direction) {
    case "up":
      return { x: 128, y: 255 };
    case "down":
      return { x: 128, y: 0 };
    case "left":
      return { x: 0, y: 128 };
    case "right":
      return { x: 255, y: 128 };
    default:
      throw new Error("Invalid direction");
  }
}

export function durationToFrames(duration: string): number {
  switch (duration) {
    case "short":
      return 5;
    case "medium":
      return 30;
    case "long":
      return 60;
    case "toggle":
      return 0;
    default:
      throw new Error("Invalid duration");
  }
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.slice(7).trim(); // Remove "Bearer " prefix
  return token || null;
}
