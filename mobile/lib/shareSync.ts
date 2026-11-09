import { NativeModules, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

const { AppGroupBridge } = NativeModules;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const BACKEND_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://spending-tracker-api-production-cea1.up.railway.app';

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
  if (!AppGroupBridge) return;

  if (session) {
    AppGroupBridge.setItem('auth_token', session.access_token);
    AppGroupBridge.setItem('refresh_token', session.refresh_token);
    AppGroupBridge.setItem('supabase_url', SUPABASE_URL);
    AppGroupBridge.setItem('supabase_anon_key', SUPABASE_ANON_KEY);
    AppGroupBridge.setItem('api_url', BACKEND_API_URL);
    if (defaultAccountId) {
      AppGroupBridge.setItem('default_account_id', defaultAccountId);
    }
  } else {
    // Clear on sign-out so the extension/receiver shows signed-out state
    AppGroupBridge.removeItem('auth_token');
    AppGroupBridge.removeItem('refresh_token');
    AppGroupBridge.removeItem('default_account_id');
    AppGroupBridge.removeItem('api_url');
    // Alerts queued offline belong to the account that received them.
    clearPendingAlerts();
  }
}

/** Android: the SMS receiver reads this before doing anything. */
export function setSmsLoggingFlag(on: boolean): void {
  if (!AppGroupBridge) return;
  AppGroupBridge.setItem('sms_auto_logging_enabled', on ? 'true' : 'false');
}

/** Drop alerts saved while offline so they can't land in the next account. */
export function clearPendingAlerts(): void {
  if (!AppGroupBridge) return;
  AppGroupBridge.removeItem('pending_sms');
  AppGroupBridge.removeItem('pending_sms_received_at');
}
