import { DmcpSession } from "./session";

declare global {
  namespace Express {
    interface Request {
      dmcpSession: DmcpSession;
    }
  }
}
