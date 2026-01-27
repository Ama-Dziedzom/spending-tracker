import { supabase, Transaction, Wallet, Transfer } from './supabase';

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

    // 4. Update transaction and wallet in a "transaction" (using RPC if possible, but let's do sequential for now or use supabase.rpc if it was defined)
    // For now, sequential updates as a simple implementation
    const { error: updateTxError } = await supabase
        .from('transactions')
        .update({ wallet_id: walletId })
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
    try {
        // 1. Get user id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        // 2. Create the Transfer record
        const { data: transfer, error: transferError } = await supabase
            .from('transfers')
            .insert({
                user_id: user.id,
                from_wallet_id: fromWalletId,
                to_wallet_id: toWalletId,
                amount: amount,
                status: 'completed',
                notes: notes,
                completed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (transferError || !transfer) {
            console.error('Error creating transfer record:', transferError);
            return false;
        }

        // 3. Update the original transaction (the one detected from SMS)
        // We assume the original transaction represents one side of the transfer.
        // Let's find out which side it is based on wallets.
        const { data: existingTx } = await supabase
            .from('transactions')
            .select('wallet_id, type, balance_snapshot')
            .eq('id', transactionId)
            .single();

        const side: 'from' | 'to' = (existingTx?.wallet_id === fromWalletId || existingTx?.type === 'expense' || existingTx?.type === 'debit') ? 'from' : 'to';

        const { error: updateTxError } = await supabase
            .from('transactions')
            .update({
                wallet_id: side === 'from' ? fromWalletId : toWalletId,
                transfer_id: transfer.id,
                transfer_side: side,
                is_transfer: true
            })
            .eq('id', transactionId);

        if (updateTxError) {
            console.error('Error updating original transaction:', updateTxError);
            return false;
        }

        // 4. Create the "Shadow" transaction for the other side
        const otherSide = side === 'from' ? 'to' : 'from';
        const otherWalletId = side === 'from' ? toWalletId : fromWalletId;
        const otherType = side === 'from' ? 'income' : 'expense';

        const { error: shadowTxError } = await supabase
            .from('transactions')
            .insert({
                description: `Transfer: ${notes || 'Internal Transfer'}`,
                amount: amount,
                type: otherType,
                wallet_id: otherWalletId,
                transfer_id: transfer.id,
                transfer_side: otherSide,
                is_transfer: true,
                created_at: new Date().toISOString()
            });

        if (shadowTxError) {
            console.error('Error creating shadow transaction:', shadowTxError);
            return false;
        }

        // 5. Update Wallet Balances
        const info = detectTransferInfo(notes || '');
        const snapshot = existingTx?.balance_snapshot || info.balanceSnapshot;

        // Subtract from source
        const { data: fromWallet } = await supabase.from('wallets').select('current_balance').eq('id', fromWalletId).single();
        if (fromWallet) {
            let newFromBalance: number;
            if (side === 'from' && snapshot !== null && snapshot !== undefined) {
                newFromBalance = snapshot;
            } else {
                newFromBalance = Number(fromWallet.current_balance) - amount;
            }

            await supabase.from('wallets')
                .update({ current_balance: newFromBalance })
                .eq('id', fromWalletId);
        }

        // Add to destination
        const { data: toWallet } = await supabase.from('wallets').select('current_balance').eq('id', toWalletId).single();
        if (toWallet) {
            let newToBalance: number;
            if (side === 'to' && snapshot !== null && snapshot !== undefined) {
                newToBalance = snapshot;
            } else {
                newToBalance = Number(toWallet.current_balance) + amount;
            }

            await supabase.from('wallets')
                .update({ current_balance: newToBalance })
                .eq('id', toWalletId);
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
