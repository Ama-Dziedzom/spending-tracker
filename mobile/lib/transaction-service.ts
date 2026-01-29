import { supabase, Transaction, Wallet, Transfer } from './supabase';
import { getCategoryById, suggestCategory, getCategoryByIdOrName } from './categories';
import { COLORS, TRANSACTION_TYPES } from '../constants/theme';

export interface TransactionWithWallet extends Transaction {
    wallet?: Wallet;
}

// Re-export category utilities for convenience
export { getCategoryById, suggestCategory, getCategoryColor, getCategoryIcon, getCategoryByIdOrName } from './categories';

/**
 * Update a transaction's category
 */
export async function updateTransactionCategory(
    transactionId: string,
    categoryId: string
): Promise<boolean> {
    const category = getCategoryById(categoryId);
    if (!category) {
        console.error('Invalid category ID:', categoryId);
        return false;
    }

    const { error } = await supabase
        .from('transactions')
        .update({
            category: category.id,
            updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);

    if (error) {
        console.error('Error updating transaction category:', error);
        return false;
    }

    return true;
}

/**
 * Get a single transaction by ID with wallet info
 */
export async function getTransactionById(transactionId: string): Promise<TransactionWithWallet | null> {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
            *,
            wallet:wallets(*)
        `)
        .eq('id', transactionId)
        .single();

    if (error) {
        console.error('Error fetching transaction:', error);
        return null;
    }

    return data;
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

// Get transactions for a specific wallet
export async function getTransactionsByWallet(walletId: string, limit: number = 20): Promise<TransactionWithWallet[]> {
    const { data, error } = await supabase
        .from('transactions')
        .select(`
            *,
            wallet:wallets(*)
        `)
        .eq('wallet_id', walletId)
        .order('transaction_date', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching wallet transactions:', error);
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

// Assign a transaction to a wallet and update the wallet balance atomically via RPC
export async function assignTransactionToWallet(transactionId: string, walletId: string): Promise<boolean> {
    const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('description, type')
        .eq('id', transactionId)
        .single();

    if (fetchError || !transaction) return false;

    const suggestedCat = suggestCategory(transaction.description, transaction.type);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.rpc('assign_transaction_to_wallet', {
        p_transaction_id: transactionId,
        p_wallet_id: walletId,
        p_category_id: suggestedCat.id,
        p_user_id: user.id
    });

    if (error) {
        console.error('Error in assign_transaction_to_wallet RPC:', JSON.stringify(error, null, 2));
        return false;
    }

    return true;
}

import { parseSmsDescription, ParsedTransactionInfo } from './parser-utils';

/**
 * Detects if a transaction description indicates a transfer
 * and attempts to identify source/destination types.
 */
export function detectTransferInfo(description: string): ParsedTransactionInfo {
    return parseSmsDescription(description);
}

/**
 * Process a transfer between two wallets atomically via RPC
 */
export async function processTransfer(
    transactionId: string,
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    notes?: string
): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error('User must be logged in to process transfers');
            return false;
        }

        const { error } = await supabase.rpc('process_wallet_transfer', {
            p_transaction_id: transactionId,
            p_from_wallet_id: fromWalletId,
            p_to_wallet_id: toWalletId,
            p_amount: amount,
            p_notes: notes || '',
            p_user_id: user.id
        });

        if (error) {
            console.error('Error in process_wallet_transfer RPC:', JSON.stringify(error, null, 2));
            return false;
        }

        return true;
    } catch (error) {
        console.error('Unexpected error in processTransfer:', error);
        return false;
    }
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

export interface WalletAnalytics {
    totalSpent: number;
    totalInflow: number;
    categorySpending: { category: string; amount: number; percentage: number; color: string }[];
}

export interface GlobalAnalytics extends WalletAnalytics {
    netCashflow: number;
    spendingHistory: { date: string; amount: number; label: string }[];
}

export interface AIInsight {
    id: string;
    title: string;
    description: string;
    type: 'warning' | 'positive' | 'info';
    icon: string;
}

// Get analytics for a specific wallet
export async function getWalletAnalytics(walletId: string): Promise<WalletAnalytics> {
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, category, type, is_transfer, transfer_side')
        .eq('wallet_id', walletId);

    if (error) {
        console.error('Error fetching analytics:', error);
        return { totalSpent: 0, totalInflow: 0, categorySpending: [] };
    }

    const expenses = transactions?.filter(tx =>
        tx.type === TRANSACTION_TYPES.EXPENSE ||
        tx.type === TRANSACTION_TYPES.DEBIT ||
        (tx.is_transfer && tx.transfer_side === 'from')
    ) || [];
    const incomes = transactions?.filter(tx =>
        tx.type === TRANSACTION_TYPES.INCOME ||
        tx.type === TRANSACTION_TYPES.CREDIT ||
        (tx.is_transfer && tx.transfer_side === 'to')
    ) || [];

    const totalSpent = expenses.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const totalInflow = incomes.reduce((sum, tx) => sum + Number(tx.amount), 0);

    const categoryMap: Record<string, number> = {};
    expenses.forEach(tx => {
        // Force 'transfer' category if it's a transfer but doesn't have the category set
        const effectiveCategory = (tx.is_transfer) ? 'transfer' : tx.category;
        const catObj = getCategoryByIdOrName(effectiveCategory);
        const catName = catObj?.name || effectiveCategory || 'Uncategorized';
        categoryMap[catName] = (categoryMap[catName] || 0) + Number(tx.amount);
    });

    const categoryColors = [
        COLORS.primary,
        COLORS.error,
        COLORS.warning,
        COLORS.success,
        '#8B5CF6',
        '#EC4899',
        '#06B6D4',
        '#6B7280'
    ];

    const categorySpending = Object.entries(categoryMap).map(([category, amount], index) => ({
        category,
        amount,
        percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
        color: categoryColors[index % categoryColors.length]
    })).sort((a, b) => b.amount - a.amount);

    return {
        totalSpent,
        totalInflow,
        categorySpending
    };
}

// Get global analytics for all wallets
export async function getGlobalAnalytics(period: 'week' | 'month' | 'year' = 'month'): Promise<GlobalAnalytics> {
    const startDate = new Date();
    if (period === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (period === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else if (period === 'year') startDate.setFullYear(startDate.getFullYear() - 1);

    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, category, type, transaction_date, is_transfer, transfer_side')
        .gte('transaction_date', startDate.toISOString());

    if (error) {
        console.error('Error fetching global analytics:', error);
        return { totalSpent: 0, totalInflow: 0, netCashflow: 0, categorySpending: [], spendingHistory: [] };
    }

    const expenses = transactions?.filter(tx => (tx.type === TRANSACTION_TYPES.EXPENSE || tx.type === TRANSACTION_TYPES.DEBIT) && !tx.is_transfer) || [];
    const incomes = transactions?.filter(tx => (tx.type === TRANSACTION_TYPES.INCOME || tx.type === TRANSACTION_TYPES.CREDIT) && !tx.is_transfer) || [];

    const totalSpent = expenses.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const totalInflow = incomes.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const netCashflow = totalInflow - totalSpent;

    // Category breakdown
    const categoryMap: Record<string, number> = {};
    expenses.forEach(tx => {
        const catObj = getCategoryByIdOrName(tx.category);
        const catName = catObj?.name || tx.category || 'Uncategorized';
        categoryMap[catName] = (categoryMap[catName] || 0) + Number(tx.amount);
    });

    const categoryColors = [
        COLORS.primary,
        COLORS.error,
        COLORS.warning,
        COLORS.success,
        '#8B5CF6',
        '#EC4899',
        '#06B6D4',
        '#6B7280'
    ];

    const categorySpending = Object.entries(categoryMap).map(([category, amount], index) => ({
        category,
        amount,
        percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
        color: categoryColors[index % categoryColors.length]
    })).sort((a, b) => b.amount - a.amount);

    // Spending history
    const historyMap: Record<string, number> = {};
    expenses.forEach(tx => {
        const date = new Date(tx.transaction_date).toISOString().split('T')[0];
        historyMap[date] = (historyMap[date] || 0) + Number(tx.amount);
    });

    const spendingHistory: { date: string; amount: number; label: string }[] = [];
    const curr = new Date(startDate);
    const end = new Date();

    while (curr <= end) {
        const d = curr.toISOString().split('T')[0];
        const dateObj = new Date(curr);
        let label = '';

        if (period === 'week') {
            label = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        } else if (period === 'month') {
            label = dateObj.getDate().toString();
        } else {
            label = dateObj.toLocaleDateString('en-US', { month: 'short' });
        }

        spendingHistory.push({
            date: d,
            amount: historyMap[d] || 0,
            label
        });
        curr.setDate(curr.getDate() + 1);
    }

    return {
        totalSpent,
        totalInflow,
        netCashflow,
        categorySpending,
        spendingHistory
    };
}

// Generate mock AI insights for now
export async function getAIInsights(analytics: GlobalAnalytics): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    if (analytics.totalSpent > 3000) {
        insights.push({
            id: '1',
            title: 'High Spending Alert',
            description: 'Your spending this month is 15% higher than last month. Consider reviewing your "Leisure" category.',
            type: 'warning',
            icon: 'alert-circle'
        });
    }

    if (analytics.netCashflow > 0) {
        insights.push({
            id: '2',
            title: 'Savings Opportunity',
            description: `You have a positive cashflow of ${formatCurrency(analytics.netCashflow)}. Great job! Consider moving some to your "Investment" wallet.`,
            type: 'positive',
            icon: 'checkmark-circle'
        });
    }

    insights.push({
        id: '3',
        title: 'Subscription Check',
        description: 'We detected 3 recurring payments this week. Ensure they are all still active.',
        type: 'info',
        icon: 'information-circle'
    });

    return insights;
}
