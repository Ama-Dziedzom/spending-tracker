import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Validate at startup — warn but don't crash so partial functionality still works
if (!SUPABASE_URL) {
  console.error('⛔ SUPABASE_URL is not set — the API will not function.');
}
if (!SUPABASE_ANON_KEY) {
  console.error('⛔ SUPABASE_ANON_KEY is not set — parse-sms will not work.');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY is not set — process-sms will not work.');
  console.warn('   Add it to api/.env to enable full functionality.');
}

/**
 * Public / anon client — used for reading patterns (public SELECT policy).
 */
export const supabaseAnon: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
);

/**
 * Admin / service-role client — bypasses RLS.
 * Used for writing transactions, updating accounts, recording failed parses.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
);

export { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY };

