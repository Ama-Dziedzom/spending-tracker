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
// User extraction — supports both JWT and Shortcut (secret + env user ID)
// ---------------------------------------------------------------------------

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * Resolves the user ID. Two modes:
 *
 * 1. **JWT mode** — If an `Authorization` header is present, verifies the
 *    token via Supabase Auth and extracts the user ID.
 *
 * 2. **Shortcut mode** — If no Authorization header but the request already
 *    passed `validateShortcutSecret`, uses `SHORTCUT_USER_ID` from env.
 *    This is for iOS Shortcuts that don't have a Supabase session.
 */
export async function extractUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization ?? '';

  // ── Mode 1: JWT auth ────────────────────────────────────────────────
  if (authHeader) {
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
      return;
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Internal authentication error' });
      return;
    }
  }

  // ── Mode 2: Shortcut mode (secret already validated) ────────────────
  const SHORTCUT_USER_ID = process.env.SHORTCUT_USER_ID;
  if (SHORTCUT_USER_ID) {
    req.userId = SHORTCUT_USER_ID;
    next();
    return;
  }

  res.status(401).json({
    error: 'Unauthorized - No auth token or SHORTCUT_USER_ID configured',
  });
}
