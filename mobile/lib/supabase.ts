import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Types
export interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: 'expense' | 'income';
    category?: string;
    wallet_id?: string;
    created_at: string;
    updated_at?: string;
    is_transfer?: boolean;
}

export interface Wallet {
    id: string;
    name: string;
    type: 'bank' | 'momo' | 'cash' | 'other';
    icon: string;
    color: string;
    initial_balance: number;
    current_balance: number;
    source_identifier?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}
