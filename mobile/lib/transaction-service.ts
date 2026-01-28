import { supabase, Transaction, Wallet, Transfer } from './supabase';
import { getCategoryById, suggestCategory, getCategoryColor, getCategoryIcon, getCategoryByIdOrName } from './categories';

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

// Assign a transaction to a wallet and update the wallet balance
export async function assignTransactionToWallet(transactionId: string, walletId: string): Promise<boolean> {
    // 1. Get the transaction details
    const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

    if (txError || !transaction) {
        console.error('Error fetching transaction for assignment:', txError);
        return false;
    }

    // 2. Get the wallet details
    const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('id', walletId)
        .single();

    if (walletError || !wallet) {
        console.error('Error fetching wallet for assignment:', walletError);
        return false;
    }

    // 3. Calculate new balance
    const amount = Number(transaction.amount);
    const isIncome = transaction.type === 'income' || transaction.type === 'credit';

    // Extract snapshot if not in DB but in description
    const info = detectTransferInfo(transaction.description);
    const snapshot = transaction.balance_snapshot || info.balanceSnapshot;

    let newBalance: number;
    if (snapshot !== null && snapshot !== undefined) {
        newBalance = snapshot;
    } else {
        newBalance = isIncome
            ? Number(wallet.current_balance) + amount
            : Number(wallet.current_balance) - amount;
    }

    // 4. Suggest category if not already set
    const suggestedCat = suggestCategory(transaction.description, transaction.type);

    // 5. Update transaction and wallet in a "transaction"
    const { error: updateTxError } = await supabase
        .from('transactions')
        .update({
            wallet_id: walletId,
            category: transaction.category || suggestedCat.id
        })
        .eq('id', transactionId);

    if (updateTxError) {
        console.error('Error updating transaction:', updateTxError);
        return false;
    }

    const { error: updateWalletError } = await supabase
        .from('wallets')
        .update({ current_balance: newBalance })
        .eq('id', walletId);

    if (updateWalletError) {
        console.error('Error updating wallet balance:', updateWalletError);
        // Warning: This could lead to inconsistency if it fails after tx update. 
        // In a real app, we'd use a database function (RPC) to ensure atomicity.
        return false;
    }

    return true;
}

/**
 * Detects if a transaction description indicates a transfer
 * and attempts to identify source/destination types.
 */
export function detectTransferInfo(description: string) {
    const desc = description.toLowerCase();

    // Patterns for Bank Inflows from MoMo (StanChart example)
    const bankFromMomo = /instant pay: (\d+)|from \d+/i;
    // Patterns for MoMo Inflows from Bank (Emergent example)
    const momoFromBank = /payment received.*from (emergent|bank|transfer)/i;
    // Patterns for MTN to Bank
    const mtnToBank = /transfer.*to (bank|acc|account)/i;

    // Balance extraction patterns
    const momoBalanceRegex = /current balance: ghs\s*([0-9,.]+)/i;
    const bankBalanceRegex = /available balance is now ghs\s*([0-9,.]+)/i;

    const isTransferLikely = bankFromMomo.test(desc) ||
        momoFromBank.test(desc) ||
        mtnToBank.test(desc) ||
        desc.includes('transfer to') ||
        desc.includes('transferred to');

    let suggestedSourceType: Wallet['type'] | null = null;
    let suggestedDestType: Wallet['type'] | null = null;
    let balanceSnapshot: number | null = null;

    if (bankFromMomo.test(desc)) {
        suggestedSourceType = 'momo';
        suggestedDestType = 'bank';
    } else if (momoFromBank.test(desc)) {
        suggestedSourceType = 'bank';
        suggestedDestType = 'momo';
    } else if (mtnToBank.test(desc)) {
        suggestedSourceType = 'momo';
        suggestedDestType = 'bank';
    }

    // Extract balance if present
    const momoMatch = description.match(momoBalanceRegex);
    const bankMatch = description.match(bankBalanceRegex);
    const balanceStr = (momoMatch || bankMatch)?.[1];

    if (balanceStr) {
        balanceSnapshot = parseFloat(balanceStr.replace(/,/g, ''));
    }

    return {
        isTransferLikely,
        suggestedSourceType,
        suggestedDestType,
        balanceSnapshot
    };
}

/**
 * Process a transfer between two wallets
 */
export async function processTransfer(
    transactionId: string,
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    notes?: string
): Promise<boolean> {
    console.log(`Starting processTransfer: ${amount} from ${fromWalletId} to ${toWalletId}`);
    try {
        // 1. Get user id (essential for the transfers table not-null constraint)
        let userId: string | null = null;

        // Try getting session first (often faster/more reliable in mobile)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            userId = session.user.id;
        } else {
            // Fallback to getUser() which is more thorough
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                userId = user.id;
            }
        }

        if (userId) {
            console.log('Using userId for transfer:', userId);
        } else {
            console.warn('No authenticated user found for transfer. The "transfers" table requires a user_id.');
            // If we are in development and can't find a user, we might be in trouble
            // but let's try to proceed. The DB will ultimately decide.
        }

        // 2. Create the Transfer record
        const transferPayload: any = {
            from_wallet_id: fromWalletId,
            to_wallet_id: toWalletId,
            amount: amount,
            status: 'completed' as const,
            notes: notes,
            completed_at: new Date().toISOString()
        };

        if (userId) {
            transferPayload.user_id = userId;
        }

        const { data: transfer, error: transferError } = await supabase
            .from('transfers')
            .insert(transferPayload)
            .select()
            .single();

        if (transferError) {
            console.error('Error creating transfer record:', transferError);

            // Check if it's the specific user_id not-null constraint error
            if (transferError.code === '23502' && transferError.message?.includes('user_id')) {
                console.error('CRITICAL: Cannot create transfer because no user is logged in and the database requires user_id.');
                return false;
            }

            // Try inserting without completed_at if it failed (fallback for older schema)
            if (transferError.message?.includes('completed_at')) {
                console.log('Retrying transfer insert without completed_at...');
                const retryPayload: any = {
                    from_wallet_id: fromWalletId,
                    to_wallet_id: toWalletId,
                    amount: amount,
                    status: 'completed',
                    notes: notes
                };

                if (userId) {
                    retryPayload.user_id = userId;
                }

                const { data: retryData, error: retryError } = await supabase
                    .from('transfers')
                    .insert(retryPayload)
                    .select()
                    .single();

                if (retryError) {
                    console.error('Retry insert also failed:', retryError);
                    return false;
                }

                // If we get here, retryData is what we want
                const actualTransfer = retryData;
                if (!actualTransfer) {
                    console.error('Transfer retried but no data returned');
                    return false;
                }
                console.log('Transfer record created (retry):', actualTransfer.id);

                // Continue with processing
                return await finalizeTransfer(transactionId, fromWalletId, toWalletId, amount, notes, actualTransfer);
            } else {
                return false;
            }
        }

        const actualTransfer = transfer;
        if (!actualTransfer) {
            console.error('Transfer created but no data returned');
            return false;
        }

        console.log('Transfer record created:', actualTransfer.id);
        return await finalizeTransfer(transactionId, fromWalletId, toWalletId, amount, notes, actualTransfer);
    } catch (error) {
        console.error('Unexpected error in processTransfer:', error);
        return false;
    }
}

/**
 * Helper function to finalize the transfer process (updates transactions and balances)
 */
async function finalizeTransfer(
    transactionId: string,
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    notes: string | undefined,
    actualTransfer: any
): Promise<boolean> {
    try {
        // 3. Update the original transaction (the one detected from SMS)
        const { data: existingTx, error: fetchTxError } = await supabase
            .from('transactions')
            .select('wallet_id, type, balance_snapshot, description, transaction_date')
            .eq('id', transactionId)
            .single();

        if (fetchTxError) {
            console.error('Error fetching existing transaction:', fetchTxError);
        }

        // Determine which side of the transfer this transaction represents
        const isOutflow = existingTx?.type === 'expense' || existingTx?.type === 'debit';
        const side: 'from' | 'to' = isOutflow ? 'from' : 'to';

        console.log(`Transaction ${transactionId} identified as ${side} side of transfer`);

        const { error: updateTxError } = await supabase
            .from('transactions')
            .update({
                wallet_id: side === 'from' ? fromWalletId : toWalletId,
                transfer_id: actualTransfer.id,
                transfer_side: side,
                is_transfer: true
            })
            .eq('id', transactionId);

        if (updateTxError) {
            console.error('Error updating original transaction:', updateTxError);
        }

        // 4. Create the "Shadow" transaction for the other side
        const otherSide = side === 'from' ? 'to' : 'from';
        const otherWalletId = side === 'from' ? toWalletId : fromWalletId;
        const otherType = side === 'from' ? 'income' : 'expense';
        const shadowDesc = `Transfer ${side === 'from' ? 'to' : 'from'} ${notes || 'Wallet'}`;

        console.log(`Creating shadow transaction for ${otherSide} side on wallet ${otherWalletId}`);

        const { error: shadowTxError } = await supabase
            .from('transactions')
            .insert({
                description: shadowDesc,
                amount: amount,
                type: otherType,
                wallet_id: otherWalletId,
                transfer_id: actualTransfer.id,
                transfer_side: otherSide,
                is_transfer: true,
                transaction_date: existingTx?.transaction_date || new Date().toISOString(),
                created_at: new Date().toISOString(),
                source: 'transfer' // Required non-null field for shadow transactions
            });

        if (shadowTxError) {
            console.error('Error creating shadow transaction:', shadowTxError);
        }

        // 5. Update Wallet Balances
        // Subtract from source
        const { data: fromWallet } = await supabase.from('wallets').select('current_balance').eq('id', fromWalletId).single();
        if (fromWallet) {
            const newFromBalance = Number(fromWallet.current_balance) - amount;
            await supabase.from('wallets')
                .update({ current_balance: newFromBalance })
                .eq('id', fromWalletId);
            console.log(`Updated source wallet ${fromWalletId} balance to ${newFromBalance}`);
        }

        // Add to destination
        const { data: toWallet } = await supabase.from('wallets').select('current_balance').eq('id', toWalletId).single();
        if (toWallet) {
            const newToBalance = Number(toWallet.current_balance) + amount;
            await supabase.from('wallets')
                .update({ current_balance: newToBalance })
                .eq('id', toWalletId);
            console.log(`Updated destination wallet ${toWalletId} balance to ${newToBalance}`);
        }

        return true;
    } catch (error) {
        console.error('Error finalizing transfer:', error);
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
        .select('amount, category, type')
        .eq('wallet_id', walletId);

    if (error) {
        console.error('Error fetching analytics:', error);
        return { totalSpent: 0, totalInflow: 0, categorySpending: [] };
    }

    const expenses = transactions?.filter(tx => tx.type === 'expense' || tx.type === 'debit') || [];
    const incomes = transactions?.filter(tx => tx.type === 'income' || tx.type === 'credit') || [];

    const totalSpent = expenses.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const totalInflow = incomes.reduce((sum, tx) => sum + Number(tx.amount), 0);

    const categoryMap: Record<string, number> = {};
    expenses.forEach(tx => {
        const catObj = getCategoryByIdOrName(tx.category);
        const catName = catObj?.name || tx.category || 'Uncategorized';
        categoryMap[catName] = (categoryMap[catName] || 0) + Number(tx.amount);
    });

    const categoryColors = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#F43F5E', '#6B7280'];

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
        .select('amount, category, type, transaction_date')
        .gte('transaction_date', startDate.toISOString());

    if (error) {
        console.error('Error fetching global analytics:', error);
        return { totalSpent: 0, totalInflow: 0, netCashflow: 0, categorySpending: [], spendingHistory: [] };
    }

    const expenses = transactions?.filter(tx => tx.type === 'expense' || tx.type === 'debit') || [];
    const incomes = transactions?.filter(tx => tx.type === 'income' || tx.type === 'credit') || [];

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

    const categoryColors = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#F43F5E', '#6B7280'];

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
