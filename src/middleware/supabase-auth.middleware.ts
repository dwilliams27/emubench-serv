import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    provider: 'google' | 'supabase';
  };
}

export async function supabaseAuthMiddleware(
  req: AuthenticatedRequest, 
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
        console.log(`[AUTH] Supabase user authenticated: ${user.email}`);
        next();
        return;
      }
    } catch (supabaseError) {
      console.log('[AUTH] Token is not a valid Supabase token');
    }

    res.status(401).json({ error: 'Invalid or expired token' });
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    res.status(500).json({ error: 'Internal authentication error' });
  }
}

export type { AuthenticatedRequest };
