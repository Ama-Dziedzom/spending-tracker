import type { Request, Response, NextFunction } from 'express';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '../lib/supabase.js';

// ---------------------------------------------------------------------------
// Shortcut secret validation
// ---------------------------------------------------------------------------

/**
 * Validates the `secret` field in the request body against SHORTCUT_SECRET.
 */
export function validateShortcutSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = req.body?.secret || req.body?.['x-shortcut-secret'] || req.headers?.['x-shortcut-secret'];
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
 * Resolves the user ID. Securely supports two modes:
 *
 * 1. **Shortcut Secret Mode** — If a valid `secret` (or `x-shortcut-secret`) is
 *    provided matching the backend's SHORTCUT_SECRET, uses the configured
 *    `SHORTCUT_USER_ID`. Perfect for single-user self-hosted environments.
 *
 * 2. **JWT Auth Mode** — If no valid secret is provided, validates the Supabase
 *    JWT token in the `Authorization` header to resolve the caller's unique User ID.
 *    Provides complete multi-tenant security for apps downloaded by multiple users.
 */
export async function extractUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const secret = req.body?.secret || req.body?.['x-shortcut-secret'] || req.headers?.['x-shortcut-secret'];
  const SHORTCUT_SECRET = process.env.SHORTCUT_SECRET;
  const SHORTCUT_USER_ID = process.env.SHORTCUT_USER_ID;

  // ── Mode 1: Shortcut Secret Mode (Bypass via secret) ─────────────────
  if (SHORTCUT_SECRET && secret === SHORTCUT_SECRET && SHORTCUT_USER_ID) {
    req.userId = SHORTCUT_USER_ID;
    next();
    return;
  }

  // ── Mode 2: JWT Auth Mode ───────────────────────────────────────────
  const authHeader = req.headers.authorization ?? '';
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

  // ── No valid authentication found ──────────────────────────────────
  res.status(401).json({
    error: 'Unauthorized - No valid authentication provided (invalid secret or expired token)',
  });
}
