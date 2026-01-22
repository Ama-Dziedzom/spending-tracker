import { supabase, Transaction, Wallet } from './supabase';

export interface TransactionWithWallet extends Transaction {
    wallet?: Wallet;
}

// Fetch recent transactions
export async function getRecentTransactions(limit: number = 10): Promise<TransactionWithWallet[]> {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
            *,
            wallet:wallets(*)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }

    return data || [];
}

// Fetch all wallets
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

// Check if user has any wallets set up
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

// Get transactions without wallet assignment (unmatched)
export async function getUnmatchedTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .is('wallet_id', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching unmatched transactions:', error);
        return [];
    }

    return data || [];
}

// Get transaction count
export async function getTransactionCount(): Promise<number> {
    const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error counting transactions:', error);
        return 0;
    }

    return count ?? 0;
}

// Format currency
export function formatCurrency(amount: number): string {
    return `GH₵ ${Math.abs(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

// Format date for display
export function formatTransactionDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();

    // Check if today
    if (date.toDateString() === now.toDateString()) {
        return 'Today';
    }

    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }

    // Otherwise, format as "Jan 22"
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

// Get time of transaction
export function formatTransactionTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}
