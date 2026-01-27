import { supabase, Wallet } from './supabase';

export interface CreateWalletInput {
    name: string;
    type: 'bank' | 'momo' | 'cash' | 'other';
    icon: string;
    color: string;
    initial_balance: number;
    source_identifier?: string;
    is_income_source?: boolean;
}

// Create a new wallet
export async function createWallet(input: CreateWalletInput): Promise<Wallet | null> {
    const { data, error } = await supabase
        .from('wallets')
        .insert({
            name: input.name,
            type: input.type,
            icon: input.icon,
            color: input.color,
            initial_balance: input.initial_balance,
            current_balance: input.initial_balance, // Start with initial balance
            source_identifier: input.source_identifier,
            is_active: true,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating wallet:', error);
        return null;
    }

    return data;
}

// Create multiple wallets at once
export async function createWallets(inputs: CreateWalletInput[]): Promise<Wallet[]> {
    const wallets = inputs.map(input => ({
        name: input.name,
        type: input.type,
        icon: input.icon,
        color: input.color,
        initial_balance: input.initial_balance,
        current_balance: input.initial_balance,
        source_identifier: input.source_identifier,
        is_active: true,
    }));

    const { data, error } = await supabase
        .from('wallets')
        .insert(wallets)
        .select();

    if (error) {
        console.error('Error creating wallets:', error);
        return [];
    }

    return data || [];
}

// Get all active wallets
export async function getWallets(): Promise<Wallet[]> {
    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching wallets:', error);
        return [];
    }

    return data || [];
}

// Get a single wallet by ID
export async function getWalletById(id: string): Promise<Wallet | null> {
    const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching wallet:', error);
        return null;
    }

    return data;
}

// Update wallet balance
export async function updateWalletBalance(id: string, newBalance: number): Promise<boolean> {
    const { error } = await supabase
        .from('wallets')
        .update({
            current_balance: newBalance,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        console.error('Error updating wallet balance:', error);
        return false;
    }

    return true;
}

// Update wallet details
export async function updateWallet(id: string, updates: Partial<Wallet>): Promise<Wallet | null> {
    const { data, error } = await supabase
        .from('wallets')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating wallet:', error);
        return null;
    }

    return data;
}

// Soft delete wallet (set is_active to false)
export async function deleteWallet(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('wallets')
        .update({
            is_active: false,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        console.error('Error deleting wallet:', error);
        return false;
    }

    return true;
}

// Check if user has any wallets configured
export async function hasWalletsConfigured(): Promise<boolean> {
    const { count, error } = await supabase
        .from('wallets')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

    if (error) {
        console.error('Error checking wallets:', error);
        return false;
    }

    return (count ?? 0) > 0;
}

// Get total balance across all wallets
export async function getTotalBalance(): Promise<number> {
    const { data, error } = await supabase
        .from('wallets')
        .select('current_balance')
        .eq('is_active', true);

    if (error) {
        console.error('Error fetching total balance:', error);
        return 0;
    }

    return data?.reduce((sum, wallet) => sum + (wallet.current_balance || 0), 0) || 0;
}
