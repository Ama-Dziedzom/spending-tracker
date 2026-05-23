import type { Request, Response, NextFunction } from 'express';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '../lib/supabase.js';

// ---------------------------------------------------------------------------
// Shortcut secret validation
// ---------------------------------------------------------------------------

/**
 * Validates the `secret` field in the request body against SHORTCUT_SECRET.
 */
export function validateShortcutSecret(req: Request, res: Response, next: NextFunction): void {
  const { secret } = req.body;
  const SHORTCUT_SECRET = process.env.SHORTCUT_SECRET;

  if (!SHORTCUT_SECRET || secret !== SHORTCUT_SECRET) {
    res.status(401).json({ error: 'Unauthorized - Invalid secret' });
    return;
  }

  next();
}

// ---------------------------------------------------------------------------
// User extraction from Authorization header
// ---------------------------------------------------------------------------

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * Resolves the user ID from the Authorization header by calling Supabase Auth.
 * Attaches `userId` to the request object.
 */
export async function extractUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization ?? '';

  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized - Missing Authorization header' });
    return;
  }

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': authHeader,
      },
    });

    if (!userRes.ok) {
      res.status(401).json({ error: 'Unauthorized - Invalid or expired auth token' });
      return;
    }

    const userData = await userRes.json() as { id?: string };
    if (!userData?.id) {
      res.status(401).json({ error: 'Unauthorized - Could not identify user' });
      return;
    }

    req.userId = userData.id;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal authentication error' });
  }
}
