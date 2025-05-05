import { DmcpSession } from "./types/session";
import { Response } from "express";

export function createNewSession(res: Response): DmcpSession {
  return {
    started: false,
    finished: false,
    setup: false,
  }
};
