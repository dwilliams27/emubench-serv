import { Request, Response, NextFunction } from 'express';
import { GoogleAuth } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

const googleAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

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

export async function authMiddleware(
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

    // Try to validate as Supabase token
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

    // If we get here, the token is invalid
    res.status(401).json({ error: 'Invalid or expired token' });
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    res.status(500).json({ error: 'Internal authentication error' });
  }
}

// Optional middleware for routes that don't require authentication
export async function optionalAuthMiddleware(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth header, continue without user info
      next();
      return;
    }

    // Try to authenticate, but don't fail if it doesn't work
    await authMiddleware(req, res, (error?: any) => {
      if (error) {
        console.log('[AUTH] Optional auth failed, continuing without user');
      }
      next();
    });
  } catch (error) {
    console.log('[AUTH] Optional auth error, continuing without user');
    next();
  }
}

export type { AuthenticatedRequest };
