import { supabase, type Wallet } from './supabase';
import type { TransactionWithWallet } from './transaction-service';
import { getWallets } from './wallet-service';
import { getExpectedIncome, type ExpectedIncome } from './income-service';
import { flowOf } from './spending-service';

/**
 * What Insights and Ask LogIt read: the last ~9 calendar months of entries,
 * wallets and expected income. Kept for a minute so asking a few questions
 * in a row doesn't refetch.
 */
export interface MoneyWindow {
    txs: TransactionWithWallet[];
    wallets: Wallet[];
    expected: ExpectedIncome[];
    /** When the oldest entry ever was logged (for "not enough data"). */
    firstEntryAt: Date | null;
    loadedAt: number;
}

let cache: MoneyWindow | null = null;

export async function loadMoneyWindow(force = false): Promise<MoneyWindow> {
    if (!force && cache && Date.now() - cache.loadedAt < 60_000) return cache;
    const now = new Date();
    // Six months back: Insights can show any of the last 6 months, compared with the months before it.
    const since = new Date(now.getFullYear(), now.getMonth() - 8, 1);

    const [{ data, error }, wallets, expected, { data: first }] = await Promise.all([
        supabase
            .from('transactions')
            .select('*, wallet:wallets(*)')
            .gte('transaction_date', since.toISOString())
            .order('transaction_date', { ascending: false })
            .limit(6000),
        getWallets().catch(() => [] as Wallet[]),
        getExpectedIncome().catch(() => [] as ExpectedIncome[]),
        supabase.from('transactions').select('transaction_date').order('transaction_date', { ascending: true }).limit(1),
    ]);
    if (error) throw error;
    cache = {
        txs: (data ?? []) as TransactionWithWallet[],
        wallets,
        expected,
        firstEntryAt: first?.[0]?.transaction_date ? new Date(first[0].transaction_date) : null,
        loadedAt: Date.now(),
    };
    return cache;
}

export function invalidateMoneyWindow() { cache = null; }

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export const at = (t: TransactionWithWallet) => new Date(t.transaction_date || t.created_at);
export const amt = (t: TransactionWithWallet) => Number(t.amount) || 0;
export const sum = (list: TransactionWithWallet[]) => list.reduce((s, t) => s + amt(t), 0);
export const spentOf = (list: TransactionWithWallet[]) => list.filter((t) => flowOf(t) === 'spent');
export const inOf = (list: TransactionWithWallet[]) => list.filter((t) => flowOf(t) === 'in');
export const between = (list: TransactionWithWallet[], from: Date, to: Date) => list.filter((t) => { const d = at(t); return d >= from && d < to; });

/** The category an entry counts under; money to people is 'transfer'. */
export const catOf = (t: TransactionWithWallet) => t.category || 'other';

export function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
export function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function daysInMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
/** "Sep", "Oct" (three letters, as in Figma; en-GB gives "Sept"). */
export const monthShort = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long' }).slice(0, 3);
export const monthLong = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long' });

/** "Shoprite, Accra Mall" → "Shoprite"; "AKOSUA MENSAH" → "Akosua Mensah". */
export function merchantName(description: string): string {
    const first = (description.split(',')[0] ?? '').trim();
    if (first !== first.toUpperCase()) return first;
    // Keep short all-capital words as acronyms: MTN, KFC, ECG.
    return first.split(/\s+/).map((w) => (w.length <= 3 && /^[A-Z]+$/.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase())).join(' ');
}

/** Whole cedis with grouping: 1840 → "1,840". */
export const cedis = (n: number) => Math.round(Math.abs(n)).toLocaleString('en-US');
