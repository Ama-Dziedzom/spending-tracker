import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NativeModules, Platform } from 'react-native';

// Validate environment variables at startup
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    throw new Error(
        'Missing EXPO_PUBLIC_SUPABASE_URL environment variable. ' +
        'Please check your .env file and ensure it contains EXPO_PUBLIC_SUPABASE_URL.'
    );
}

if (!supabaseAnonKey) {
    throw new Error(
        'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
        'Please check your .env file and ensure it contains EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
}

// ----------------------------------------------------------------------------
// Session hand-off from the iOS Share Extension / Android SMS receiver
// ----------------------------------------------------------------------------
// Both can refresh the session in the background. Supabase rotates refresh
// tokens, so if the app later reused its own (older) refresh token the whole
// session could be revoked and the user logged out. Before supabase-js reads
// the saved session, adopt the newer tokens from shared storage when the
// extension/receiver has flagged them via `tokens_updated_by`.
const sharedReader: { getItem?: (key: string) => Promise<string | null> } | undefined =
    Platform.OS === 'ios' ? NativeModules.AppGroupReader : NativeModules.AppGroupBridge;
const sharedWriter: { removeItem?: (key: string) => void } | undefined = NativeModules.AppGroupBridge;

async function adoptSharedTokens(key: string, stored: string | null): Promise<string | null> {
    if (!stored || !sharedReader?.getItem) return stored;
    const updatedBy = await sharedReader.getItem('tokens_updated_by');
    if (!updatedBy) return stored;

    const [access, refresh] = await Promise.all([
        sharedReader.getItem('auth_token'),
        sharedReader.getItem('refresh_token'),
    ]);
    let session: Record<string, unknown>;
    try {
        session = JSON.parse(stored);
    } catch {
        return stored;
    }
    if (!access || !refresh || typeof session.refresh_token !== 'string') return stored;

    sharedWriter?.removeItem?.('tokens_updated_by');
    if (session.refresh_token === refresh) return stored;

    // Use the newer tokens; mark as expired so supabase-js refreshes with the
    // new refresh token straight away (and never touches the old one).
    const merged = JSON.stringify({
        ...session,
        access_token: access,
        refresh_token: refresh,
        expires_in: 0,
        expires_at: Math.floor(Date.now() / 1000) - 1,
    });
    await AsyncStorage.setItem(key, merged);
    return merged;
}

const authStorage = {
    async getItem(key: string): Promise<string | null> {
        const stored = await AsyncStorage.getItem(key);
        try {
            return await adoptSharedTokens(key, stored);
        } catch {
            return stored;
        }
    },
    setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
    removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Transaction types supported by the system
 */
export type TransactionType = 'expense' | 'income' | 'credit' | 'debit';

/**
 * Wallet types
 */
export type WalletType = 'bank' | 'momo' | 'cash' | 'other';

/**
 * Transfer status
 */
export type TransferStatus = 'pending' | 'completed' | 'cancelled';

/**
 * Transfer side indicator
 */
export type TransferSide = 'from' | 'to' | 'fee';

/**
 * Transaction source
 */
export type TransactionSource = 'sms' | 'manual' | 'transfer';

/**
 * Transaction record from the database
 */
export interface Transaction {
    id: string;
    user_id?: string;
    description: string;
    amount: number;
    type: TransactionType;
    category?: string;
    wallet_id?: string;
    transfer_id?: string;
    transfer_side?: TransferSide;
    balance_snapshot?: number;
    transaction_date: string;
    created_at: string;
    updated_at?: string;
    is_transfer?: boolean;
    source?: TransactionSource;
    /** sms = read from the message, estimated = worked out by LogIt, received = when LogIt got it */
    date_source?: 'sms' | 'estimated' | 'received' | 'manual' | null;
    /** The alert as received, when the entry came from an SMS. */
    raw_sms?: string | null;
    /** Whether this entry changed its wallet's balance (v1 adds). Null on older rows. */
    balance_applied?: boolean | null;
}

/**
 * Transfer record
 */
export interface Transfer {
    id: string;
    user_id: string;
    from_wallet_id: string;
    to_wallet_id: string;
    amount: number;
    status: TransferStatus;
    notes?: string;
    created_at: string;
    completed_at?: string;
}

/**
 * Wallet record
 */
export interface Wallet {
    id: string;
    user_id?: string;
    name: string;
    type: WalletType;
    icon: string;
    color: string;
    initial_balance: number;
    current_balance: number;
    source_identifier?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

/**
 * User profile data from Supabase Auth
 */
export interface UserProfile {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    created_at: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the current authenticated user's ID
 * @returns The user ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        return null;
    }
    return user.id;
}

/**
 * Ensure user is authenticated, throwing an error if not
 * @returns The user ID
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<string> {
    const userId = await getCurrentUserId();
    if (!userId) {
        throw new Error('Authentication required. Please log in.');
    }
    return userId;
}

/**
 * Get the current user's session
 */
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error('Error getting session:', error);
        return null;
    }
    return session;
}

/**
 * Check if user is currently authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
    const session = await getSession();
    return session !== null;
}
