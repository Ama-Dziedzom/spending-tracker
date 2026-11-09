import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import type { TransactionWithWallet } from './transaction-service';

/**
 * Adds and edits (Figma 1005:804, 1005:1055, 1005:1161): wallet, when,
 * removal, and new manual entries.
 *
 * Wallet balances: when an alert carried the bank's own balance
 * (balance_snapshot), that figure is the truth and is left alone. Other
 * entries that changed the balance by their amount have that change undone
 * when they're moved or removed (see countsTowardBalance).
 */

function signedEffect(tx: Pick<TransactionWithWallet, 'type' | 'amount'>): number {
    const out = tx.type === 'expense' || tx.type === 'debit';
    return out ? -Number(tx.amount) : Number(tx.amount);
}

export async function adjustBalance(walletId: string, delta: number): Promise<void> {
    if (!delta) return;
    const { data, error } = await supabase.from('wallets').select('current_balance').eq('id', walletId).single();
    if (error || !data) throw error ?? new Error('Wallet not found');
    const { error: updateError } = await supabase
        .from('wallets')
        .update({ current_balance: (Number(data.current_balance) || 0) + delta, updated_at: new Date().toISOString() })
        .eq('id', walletId);
    if (updateError) throw updateError;
}

/**
 * Did this entry change its wallet's balance? v1 adds record it in
 * balance_applied. Older rows: SMS entries without the bank's balance did;
 * manual entries didn't (the old add form never touched balances).
 */
function countsTowardBalance(tx: TransactionWithWallet): boolean {
    if (tx.balance_applied !== null && tx.balance_applied !== undefined) return tx.balance_applied;
    if (tx.source === 'manual') return false;
    return tx.balance_snapshot === null || tx.balance_snapshot === undefined;
}

export async function changeWallet(tx: TransactionWithWallet, walletId: string): Promise<void> {
    if (tx.wallet_id === walletId) return;
    const { error } = await supabase
        .from('transactions')
        .update({ wallet_id: walletId, updated_at: new Date().toISOString() })
        .eq('id', tx.id);
    if (error) throw error;
    if (countsTowardBalance(tx)) {
        const effect = signedEffect(tx);
        if (tx.wallet_id) await adjustBalance(tx.wallet_id, -effect);
        await adjustBalance(walletId, effect);
    }
}

export async function changeWhen(tx: TransactionWithWallet, when: Date): Promise<void> {
    const { error } = await supabase
        .from('transactions')
        .update({ transaction_date: when.toISOString(), date_source: 'manual', updated_at: new Date().toISOString() })
        .eq('id', tx.id);
    if (error) throw error;
}

/**
 * Delete an entry for good. A move between your own wallets is two rows and
 * a transfer record; all three go together.
 */
export async function deleteTransaction(tx: TransactionWithWallet): Promise<void> {
    let rows: TransactionWithWallet[] = [tx];
    if (tx.transfer_id) {
        const { data, error } = await supabase.from('transactions').select('*').eq('transfer_id', tx.transfer_id);
        if (error) throw error;
        if (data?.length) rows = data as TransactionWithWallet[];
    }

    const { error } = await supabase.from('transactions').delete().in('id', rows.map((r) => r.id));
    if (error) throw error;

    for (const r of rows) {
        if (r.wallet_id && countsTowardBalance(r)) await adjustBalance(r.wallet_id, -signedEffect(r));
    }
    if (tx.transfer_id) {
        const { error: transferError } = await supabase.from('transfers').delete().eq('id', tx.transfer_id);
        if (transferError) console.error('Transfer record not removed:', transferError.message);
    }
}

// ---------------------------------------------------------------------------
// Remove with Undo (handoff §10: "When something was removed, the toast
// offers Undo"). The row disappears at once; the delete runs when the toast
// has gone, unless Undo was tapped. Pending removals live at module level so
// they still finish if the screen closes.
// ---------------------------------------------------------------------------

const UNDO_MS = 4500;
const pending = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

export function pendingRemovals(): ReadonlySet<string> {
    return new Set(pending.keys());
}

export function onPendingRemovalsChange(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

let version = 0;
const notify = () => { version += 1; listeners.forEach((fn) => fn()); };

/** Ids removed but still inside the Undo window; lists hide these. */
export function usePendingRemovals(): ReadonlySet<string> {
    useSyncExternalStore(onPendingRemovalsChange, () => version);
    return pendingRemovals();
}

/** Returns undo(). onCommitted runs after the delete (ok = false if it failed and the row is back). */
export function scheduleRemoval(tx: TransactionWithWallet, onCommitted: (ok: boolean) => void): () => void {
    const timer = setTimeout(async () => {
        let ok = true;
        try {
            await deleteTransaction(tx);
        } catch (e) {
            console.error('Delete failed:', e);
            ok = false;
        }
        pending.delete(tx.id);
        notify();
        onCommitted(ok);
    }, UNDO_MS);
    pending.set(tx.id, timer);
    notify();

    return () => {
        const t = pending.get(tx.id);
        if (!t) return;
        clearTimeout(t);
        pending.delete(tx.id);
        notify();
    };
}

export const UNDO_WINDOW_MS = UNDO_MS - 500;
