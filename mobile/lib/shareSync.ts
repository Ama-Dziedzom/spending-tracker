import { NativeModules, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

const { AppGroupBridge } = NativeModules;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Writes the current Supabase session into the iOS App Group shared storage so
 * the Share Extension can call the edge functions on the user's behalf.
 *
 * Call this whenever the session changes (login, token refresh, logout).
 * No-op on Android (no Share Extension there).
 */
export function syncSessionToAppGroup(
  session: Session | null,
  defaultAccountId?: string | null,
): void {
  if (Platform.OS !== 'ios' || !AppGroupBridge) return;

  if (session) {
    AppGroupBridge.setItem('auth_token', session.access_token);
    AppGroupBridge.setItem('supabase_url', SUPABASE_URL);
    AppGroupBridge.setItem('supabase_anon_key', SUPABASE_ANON_KEY);
    if (defaultAccountId) {
      AppGroupBridge.setItem('default_account_id', defaultAccountId);
    }
  } else {
    // Clear on sign-out so the extension shows the "open LogIt first" screen
    AppGroupBridge.removeItem('auth_token');
    AppGroupBridge.removeItem('default_account_id');
  }
}
