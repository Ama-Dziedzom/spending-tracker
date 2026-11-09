import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { clearSpendingCache } from './spending-cache';
import { clearPendingAlerts } from './shareSync';

/**
 * Session expired (Figma 1014:2313): when the login lapses on its own, LogIt
 * shows "Log in again" with the last number pre-filled. Logging out on
 * purpose (Profile › Log out, Delete account) goes to Welcome instead.
 */

const LAST_PHONE = 'logit.lastPhone';
let intentional = false;

/** Sign out because the person asked to. */
export async function signOutOnPurpose() {
    intentional = true;
    await clearSpendingCache();
    clearPendingAlerts();
    try {
        return await supabase.auth.signOut();
    } finally {
        // The SIGNED_OUT event fires synchronously inside signOut; reset after.
        setTimeout(() => { intentional = false; }, 1000);
    }
}

export const wasIntentionalSignOut = () => intentional;

export async function rememberPhone(e164: string) {
    await AsyncStorage.setItem(LAST_PHONE, e164).catch(() => {});
}

export async function lastPhone(): Promise<string | null> {
    return AsyncStorage.getItem(LAST_PHONE).catch(() => null);
}

export async function forgetPhone() {
    await AsyncStorage.removeItem(LAST_PHONE).catch(() => {});
}

/** "+233 24 • • • 3456": enough to recognise, not enough to read off a screen. */
export function maskPhone(e164: string): string {
    const m = e164.match(/^\+233(\d{2})(\d{3})(\d{4})$/);
    return m ? `+233 ${m[1]} • • • ${m[3]}` : e164.replace(/\d(?=\d{4})/g, '•');
}
