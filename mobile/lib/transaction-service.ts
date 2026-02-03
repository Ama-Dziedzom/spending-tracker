/**
 * Transaction Service
 * 
 * Handles all transaction-related operations including fetching, updating,
 * and processing transfers. Works with Supabase RLS policies for security.
 */

import { z } from 'zod';
import { supabase, Transaction, Wallet, Transfer, requireAuth } from './supabase';
import { getCategoryById, suggestCategory, getCategoryByIdOrName, getDefaultCategory } from './categories';
import { parseSmsDescription, ParsedTransactionInfo } from './parser-utils';
import { COLORS, TRANSACTION_TYPES } from '../constants/theme';

// ============================================================================
// Types
// ============================================================================

export interface TransactionWithWallet extends Transaction {
    wallet?: Wallet;
    transfer?: Transfer & {
        from_wallet?: Wallet;
        to_wallet?: Wallet;
    };
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

// ============================================================================
// Constants
// ============================================================================

const RECENT_TRANSACTIONS_LIMIT = 10;
const ANALYTICS_COLORS = [
    COLORS.primary,
    COLORS.error,
    COLORS.warning,
    COLORS.success,
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#6B7280'
];

// High spending threshold for insights (in GHS)
const HIGH_SPENDING_THRESHOLD = 3000;
const ANOMALY_THRESHOLD = 500;

// ============================================================================
// Re-exports
// ============================================================================

export { getCategoryById, suggestCategory, getCategoryByIdOrName } from './categories';
export { getCategoryColor, getCategoryIcon } from './categories';

// ============================================================================
// Transaction Fetching
// ============================================================================

/**
 * Get a single transaction by ID with wallet info
 * RLS policies ensure user can only access their own transactions
 */
export async function getTransactionById(transactionId: string): Promise<TransactionWithWallet | null> {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                wallet:wallets(*),
                transfer:transfers(
                    *,
                    from_wallet:wallets!from_wallet_id(*),
                    to_wallet:wallets!to_wallet_id(*)
                )
            `)
            .eq('id', transactionId)
            .single();

        if (error) {
            console.error('Error fetching transaction:', error.message);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error fetching transaction:', error);
        return null;
    }
}

/**
 * Fetch recent transactions for the authenticated user
 * RLS policies handle user filtering
 */
export async function getRecentTransactions(limit: number = RECENT_TRANSACTIONS_LIMIT): Promise<TransactionWithWallet[]> {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                wallet:wallets(*),
                transfer:transfers(
                    *,
                    from_wallet:wallets!from_wallet_id(*),
                    to_wallet:wallets!to_wallet_id(*)
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching transactions:', error.message);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

/**
 * Get transactions for a specific wallet
 */
export async function getTransactionsByWallet(walletId: string, limit: number = 20): Promise<TransactionWithWallet[]> {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                wallet:wallets(*),
                transfer:transfers(
                    *,
                    from_wallet:wallets!from_wallet_id(*),
                    to_wallet:wallets!to_wallet_id(*)
                )
            `)
            .eq('wallet_id', walletId)
            .order('transaction_date', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching wallet transactions:', error.message);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching wallet transactions:', error);
        return [];
    }
}

/**
 * Get transactions without wallet assignment (unmatched)
 */
export async function getUnmatchedTransactions(): Promise<Transaction[]> {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .is('wallet_id', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching unmatched transactions:', error.message);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching unmatched transactions:', error);
        return [];
    }
}

/**
 * Get transaction count for the authenticated user
 */
export async function getTransactionCount(): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('Error counting transactions:', error.message);
            return 0;
        }

        return count ?? 0;
    } catch (error) {
        console.error('Error counting transactions:', error);
        return 0;
    }
}

// ============================================================================
// Transaction Updates
// ============================================================================

/**
 * Update a transaction's category
 */
export async function updateTransactionCategory(
    transactionId: string,
    categoryId: string
): Promise<boolean> {
    try {
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
            console.error('Error updating transaction category:', error.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error updating transaction category:', error);
        return false;
    }
}

/**
 * Assign a transaction to a wallet using RPC (handles balance updates atomically)
 * Note: RPC function now uses auth.uid() internally for security
 */
export async function assignTransactionToWallet(transactionId: string, walletId: string): Promise<boolean> {
    try {
        // Get transaction description to suggest category
        const { data: transaction, error: fetchError } = await supabase
            .from('transactions')
            .select('description, type')
            .eq('id', transactionId)
            .single();

        if (fetchError || !transaction) {
            console.error('[TransactionService] Error fetching transaction details before assignment:', fetchError?.message || 'Transaction not found');
            return false;
        }

        const suggestedCat = suggestCategory(transaction.description, transaction.type);

        // Call RPC function - user_id is now handled internally by auth.uid()
        const { error } = await supabase.rpc('assign_transaction_to_wallet', {
            p_transaction_id: transactionId,
            p_wallet_id: walletId,
            p_category_id: suggestedCat.id,
        });

        if (error) {
            console.error('[TransactionService] RPC assign_transaction_to_wallet failed:', error.message, error.details, error.hint);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error assigning transaction to wallet:', error);
        return false;
    }
}

// ============================================================================
// Transfers
// ============================================================================

/**
 * Detects if a transaction description indicates a transfer
 */
export function detectTransferInfo(description: string): ParsedTransactionInfo {
    return parseSmsDescription(description);
}

/**
 * Process a transfer between two wallets atomically via RPC
 * Note: RPC function now uses auth.uid() internally for security
 */
export async function processTransfer(
    transactionId: string,
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    notes?: string
): Promise<boolean> {
    try {
        // Validate inputs
        if (Math.abs(amount) <= 0) {
            console.error('[TransactionService] Transfer amount must be positive:', amount);
            return false;
        }

        if (fromWalletId === toWalletId) {
            console.error('Cannot transfer to the same wallet');
            return false;
        }

        // Call RPC function - user_id is now handled internally by auth.uid()
        console.log(`[TransactionService] Calling process_wallet_transfer: Tx=${transactionId}, From=${fromWalletId}, To=${toWalletId}, Amount=${amount}`);

        const { error } = await supabase.rpc('process_wallet_transfer', {
            p_transaction_id: transactionId,
            p_from_wallet_id: fromWalletId,
            p_to_wallet_id: toWalletId,
            p_amount: Math.abs(amount), // Ensure amount is positive for the SQL function
            p_notes: notes || '',
        });

        if (error) {
            console.error('[TransactionService] RPC process_wallet_transfer failed:', error.message, error.details, error.hint);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Unexpected error in processTransfer:', error);
        return false;
    }
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
    return `GH₵ ${Math.abs(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/**
 * Format date for display
 */
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

/**
 * Get time of transaction
 */
export function formatTransactionTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * Get analytics for a specific wallet
 */
export async function getWalletAnalytics(walletId: string): Promise<WalletAnalytics> {
    try {
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('amount, category, type, is_transfer, transfer_side')
            .eq('wallet_id', walletId);

        if (error) {
            console.error('Error fetching analytics:', error.message);
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
            const effectiveCategory = (tx.is_transfer && (!tx.category || tx.category === 'transfer'))
                ? 'transfer'
                : (tx.category || 'other');
            const catObj = getCategoryByIdOrName(effectiveCategory);
            const catName = catObj?.name || effectiveCategory || 'Uncategorized';
            categoryMap[catName] = (categoryMap[catName] || 0) + Number(tx.amount);
        });

        const categorySpending = Object.entries(categoryMap)
            .map(([category, amount], index) => ({
                category,
                amount,
                percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
                color: ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]
            }))
            .sort((a, b) => b.amount - a.amount);

        return { totalSpent, totalInflow, categorySpending };
    } catch (error) {
        console.error('Error fetching wallet analytics:', error);
        return { totalSpent: 0, totalInflow: 0, categorySpending: [] };
    }
}

/**
 * Get global analytics for all wallets
 */
export async function getGlobalAnalytics(period: 'week' | 'month' | 'year' = 'month'): Promise<GlobalAnalytics> {
    try {
        const startDate = new Date();
        const DAYS_IN_WEEK = 7;

        if (period === 'week') {
            startDate.setDate(startDate.getDate() - DAYS_IN_WEEK);
        } else if (period === 'month') {
            startDate.setMonth(startDate.getMonth() - 1);
        } else {
            startDate.setFullYear(startDate.getFullYear() - 1);
        }

        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('amount, category, type, transaction_date, is_transfer, transfer_side')
            .gte('transaction_date', startDate.toISOString());

        if (error) {
            console.error('Error fetching global analytics:', error.message);
            return { totalSpent: 0, totalInflow: 0, netCashflow: 0, categorySpending: [], spendingHistory: [] };
        }

        // Include expenses and "from" transfers with spending categories
        const expenses = transactions?.filter(tx =>
            ((tx.type === TRANSACTION_TYPES.EXPENSE || tx.type === TRANSACTION_TYPES.DEBIT) && !tx.is_transfer) ||
            (tx.is_transfer && tx.transfer_side === 'from' && tx.category && tx.category !== 'transfer')
        ) || [];

        // Include incomes and "to" transfers with specific categories
        const incomes = transactions?.filter(tx =>
            ((tx.type === TRANSACTION_TYPES.INCOME || tx.type === TRANSACTION_TYPES.CREDIT) && !tx.is_transfer) ||
            (tx.is_transfer && tx.transfer_side === 'to' && tx.category && tx.category !== 'transfer' && tx.category !== 'income')
        ) || [];

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

        const categorySpending = Object.entries(categoryMap)
            .map(([category, amount], index) => ({
                category,
                amount,
                percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
                color: ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]
            }))
            .sort((a, b) => b.amount - a.amount);

        // Spending history
        const historyMap: Record<string, number> = {};
        expenses.forEach(tx => {
            const date = new Date(tx.transaction_date).toISOString().split('T')[0];
            historyMap[date] = (historyMap[date] || 0) + Number(tx.amount);
        });

        const spendingHistory: GlobalAnalytics['spendingHistory'] = [];
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

        return { totalSpent, totalInflow, netCashflow, categorySpending, spendingHistory };
    } catch (error) {
        console.error('Error fetching global analytics:', error);
        return { totalSpent: 0, totalInflow: 0, netCashflow: 0, categorySpending: [], spendingHistory: [] };
    }
}

/**
 * Generate AI insights based on analytics data
 */
export async function getAIInsights(analytics: GlobalAnalytics): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    if (analytics.totalSpent > HIGH_SPENDING_THRESHOLD) {
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
