import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Wallet } from './supabase';
import type { TransactionWithWallet } from './transaction-service';

/**
 * The last good Spending load, kept on the phone. Later opens show these
 * numbers instantly (Figma 1014:1948 caption), and offline keeps them on
 * screen with their time (1014:2044). Cleared on sign-out with the session.
 */
const KEY = 'logit.cache.spending.v1';

export interface SpendingCache {
    savedAt: string;
    txs: TransactionWithWallet[];
    wallets: Wallet[];
    name: string | null;
    avatar: string | null;
}

export async function loadSpendingCache(): Promise<SpendingCache | null> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as SpendingCache) : null;
    } catch {
        return null;
    }
}

export async function saveSpendingCache(c: Omit<SpendingCache, 'savedAt'>): Promise<void> {
    try {
        await AsyncStorage.setItem(KEY, JSON.stringify({ ...c, savedAt: new Date().toISOString() }));
    } catch {
        // Storage full or unavailable: the app still works, just without the instant start.
    }
}

export async function clearSpendingCache(): Promise<void> {
    await AsyncStorage.removeItem(KEY).catch(() => {});
}
