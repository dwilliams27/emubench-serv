import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { sessionService } from '@/services/session.service';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function supabaseAuthMiddleware(
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
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error) {
        throw error;
      }

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          provider: 'supabase'
        };

        if (!sessionService.isValidSession(user.id)) {
          console.log(`[AUTH] Creating new session for user: ${user.email} under ID: ${user.id}`);
          sessionService.createSession(user.id);
        }

        req.emuSession = sessionService.getSession(user.id)!;

        console.log(`[AUTH] Supabase user authenticated: ${user.email}`);
        next();
      }
      
      return;
    } catch (supabaseError) {
      console.log('[AUTH] Token is not a valid Supabase token');
    }

    res.status(401).json({ error: 'Invalid or expired token' });
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    res.status(500).json({ error: 'Internal authentication error' });
  }
}
