import { Router, type Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { extractUser, type AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Delete account and data (Figma 1013:2101). The app confirms by having the
 * person type DELETE; the body must carry it too, so a stray request can't
 * wipe an account. Removes every row the user owns, then the login itself.
 */
export const deleteAccountRouter = Router();

/** Tables with a user_id column, children before parents. Missing tables are skipped. */
const USER_TABLES = [
  'transactions',
  'transfers',
  'failed_parses',
  'expected_income',
  'category_rules',
  'pattern_samples',
  'wallets',
];

deleteAccountRouter.post('/delete-account', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }
  if (req.body?.confirm !== 'DELETE') {
    res.status(400).json({ error: 'Confirmation missing' });
    return;
  }

  try {
    for (const table of USER_TABLES) {
      const { error } = await supabaseAdmin.from(table).delete().eq('user_id', userId);
      // 42P01: table doesn't exist (migration not run); nothing to delete there.
      if (error && error.code !== '42P01' && !/does not exist|schema cache/i.test(error.message)) {
        throw new Error(`${table}: ${error.message}`);
      }
    }
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) throw new Error(`auth: ${authError.message}`);

    console.log(`🗑️ Deleted account ${userId}`);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('delete-account error:', message);
    res.status(500).json({ error: 'Could not delete the account' });
  }
});
