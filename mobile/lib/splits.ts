import { supabase } from './supabase';
import type { TransactionWithWallet } from './transaction-service';
import { addEntry } from './add-transaction';
import { categoryStyle } from './category-style';

/**
 * One payment across several categories, e.g. a GHS 1,000 Makola trip that
 * was GHS 600 food and GHS 400 shopping. The parts live on the entry
 * (transactions.splits, migration 20261115000000) and always add up to its
 * amount; category keeps the largest part.
 *
 * Totals by category read parts through expandSplits(); lists keep showing
 * the one entry.
 */

export interface SplitPart {
    category: string;
    amount: number;
}

const cents = (n: number) => Math.round(n * 100);

/** The entry's parts, or null when it isn't split (or the stored parts don't add up). */
export function partsOf(tx: Pick<TransactionWithWallet, 'splits' | 'amount'>): SplitPart[] | null {
    const s = tx.splits;
    if (!Array.isArray(s) || s.length < 2) return null;
    const parts = s
        .map((p) => ({ category: String(p?.category ?? 'other'), amount: Number(p?.amount) }))
        .filter((p) => Number.isFinite(p.amount) && p.amount > 0);
    if (parts.length < 2) return null;
    const total = parts.reduce((t, p) => t + cents(p.amount), 0);
    return total === cents(Number(tx.amount)) ? parts : null;
}

/**
 * Split entries become one row per part (same date, wallet and flow; the
 * part's category and amount). split_parent points back at the real entry,
 * so opening a part opens the whole payment. Other rows pass through.
 */
export function expandSplits<T extends TransactionWithWallet>(txs: T[]): T[] {
    const out: T[] = [];
    for (const t of txs) {
        const parts = partsOf(t);
        if (!parts) { out.push(t); continue; }
        parts.forEach((p, i) => out.push({ ...t, id: `${t.id}:${i}`, category: p.category, amount: p.amount, split_parent: t }));
    }
    return out;
}

/** The real entry behind a part row (or the row itself). */
export function wholeEntry<T extends TransactionWithWallet>(tx: T): T {
    return (tx.split_parent as T | undefined) ?? tx;
}

/** Same rule as partsOf, for the editor: whole parts, ≥ 2, adding up to the amount. */
export function checkParts(parts: SplitPart[], amount: number): string | null {
    if (parts.length < 2) return 'Add at least two categories.';
    if (parts.some((p) => !(p.amount > 0))) return 'Give every category an amount.';
    const diff = cents(amount) - parts.reduce((t, p) => t + cents(p.amount), 0);
    if (diff > 0) return 'The parts don’t add up to the whole amount yet.';
    if (diff < 0) return 'The parts add up to more than the whole amount.';
    return null;
}

/** Same category twice becomes one part. */
function merge(parts: SplitPart[]): SplitPart[] {
    const by = new Map<string, number>();
    for (const p of parts) by.set(p.category, (by.get(p.category) ?? 0) + cents(p.amount));
    return [...by.entries()].map(([category, c]) => ({ category, amount: c / 100 }));
}

/** Saves the parts (or clears them with null). Returns the category the entry now shows. */
export async function saveSplit(tx: TransactionWithWallet, parts: SplitPart[] | null): Promise<{ category: string; splits: SplitPart[] | null }> {
    let splits: SplitPart[] | null = null;
    let category = tx.category ?? 'other';
    if (parts) {
        const merged = merge(parts);
        if (merged.length < 2) {
            // Everything ended up in one category: that's just a category change.
            category = merged[0]?.category ?? category;
        } else {
            const problem = checkParts(merged, Number(tx.amount));
            if (problem) throw new Error(problem);
            splits = merged;
            category = [...merged].sort((a, b) => b.amount - a.amount)[0].category;
        }
    } else {
        const old = partsOf(tx);
        if (old) category = [...old].sort((a, b) => b.amount - a.amount)[0].category;
    }

    const { error } = await supabase
        .from('transactions')
        .update({ splits, category, updated_at: new Date().toISOString() })
        .eq('id', tx.id);
    if (error) {
        console.error('Save split failed:', error.message);
        throw new Error(/splits/i.test(error.message)
            ? 'Splitting isn’t switched on yet. Try again after the next update.'
            : 'Couldn’t save the split. Check your connection and try again.');
    }
    return { category, splits };
}

// ---------------------------------------------------------------------------
// Cash-outs
// ---------------------------------------------------------------------------

/** A cash-out LogIt filed as a move into the Cash wallet (api/src/routes/process-sms.ts). */
export function isCashOutMove(tx: TransactionWithWallet): boolean {
    if (!tx.is_transfer || tx.wallet?.type === 'cash') return false;
    if (tx.type !== 'debit' && tx.type !== 'expense') return false;
    return /^cash out\b/i.test(tx.description ?? '') || /\b(cash[- ]?out|withdrawal|atm)\b/i.test(tx.raw_sms ?? '');
}

/**
 * What a cash-out was spent on, logged as spends from the Cash wallet on the
 * day of the cash-out. Anything left over stays in Cash.
 */
export async function logCashOutParts(tx: TransactionWithWallet, parts: SplitPart[]): Promise<void> {
    const { data: cash, error } = await supabase
        .from('wallets')
        .select('id')
        .eq('type', 'cash')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);
    if (error || !cash?.[0]) throw new Error('Couldn’t find your Cash wallet. Add one from the Wallets tab.');
    const when = new Date(tx.transaction_date || tx.created_at);
    for (const p of merge(parts)) {
        await addEntry({
            kind: 'spent',
            amount: p.amount,
            category: p.category,
            walletId: cash[0].id,
            when,
            description: categoryStyle(p.category).label,
        });
    }
}
