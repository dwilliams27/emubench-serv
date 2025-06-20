import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { sessionService } from '@/services/session.service';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

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

        const mcpSessionId = req.headers['mcp-session-id'] as string | undefined;
        const emuSessionId = req.headers['emu-session-id'] as string | undefined;
        
        // TODO: Streamline this mess
        if (mcpSessionId) {
          console.log(`[AUTH] Using existing MCP session ID: ${mcpSessionId}`);
          const existingSession = sessionService.getMcpSession(mcpSessionId);
          if (!existingSession) {
            console.log(`[AUTH] No existing MCP session found for ID: ${mcpSessionId}`);
            return;
          }

          console.log(`[AUTH] Reusing existing MCP session for ID: ${mcpSessionId}`);
          req.mcpSession = existingSession;
        } else if (emuSessionId) {
          const testId = sessionService.getTestIdFromSessionId(req.emuSession, emuSessionId);
          if (!testId) {
            console.log(`[AUTH] No active test found for emu session ID: ${emuSessionId}`);
            res.status(400).json({ error: 'Invalid emu session ID' });
            return;
          }

          console.log(`[AUTH] Creating new MCP session ID: ${mcpSessionId}`);
          const eventStore = new InMemoryEventStore();
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => emuSessionId,
            enableJsonResponse: true,
            eventStore,
          });

          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid) {
              sessionService.destroyMcpSession(sid);
            }
          };

          console.log(`Connecting transport to MCP server...`);
          await req.mcpService.getServer().connect(transport);
          await sessionService.addMcpSession(req.emuSession, emuSessionId, testId, transport);
          console.log(`Transport connected to MCP server successfully`);

          req.mcpSession = sessionService.getMcpSession(emuSessionId);
        }

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
