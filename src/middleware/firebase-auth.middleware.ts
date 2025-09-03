import { sessionService } from '@/services/session.service';
import { formatError } from '@/shared/utils/error';
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'emubench-459802'
  });
}

export async function firebaseAuthMiddleware(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header missing or invalid' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      req.user = {
        id: decodedToken.uid,
        email: decodedToken.email,
        provider: 'firebase'
      };

      if (!sessionService.isValidSession(decodedToken.uid)) {
        console.log(`[AUTH] Creating new session for user: ${decodedToken.email} under ID: ${decodedToken.uid}`);
        sessionService.createSession(decodedToken.uid);
      }

      req.emuSession = sessionService.getSession(decodedToken.uid)!;

      console.log(`[AUTH] Firebase user authenticated: ${decodedToken.email}`);
      next();
      
    } catch (firebaseError) {
      console.error(`[AUTH] Token is not a valid Firebase token ${formatError(firebaseError)}`);
      res.status(401).json({ error: 'Invalid or expired token' });
    }

  } catch (error) {
    console.error(`[AUTH] Authentication error: ${formatError(error)}`);
    res.status(500).json({ error: 'Internal authentication error' });
  }
}
