import { supabase } from './supabase';
import type { TransactionWithWallet } from './transaction-service';
import { flowOf, startOfWeek } from './spending-service';
import { dayHeading, sameDay, shortDate } from './format';

/** Filters on Transactions (Figma 1004:617). "Moved" is money between your own wallets. */
export type TxFilter = 'all' | 'spent' | 'in' | 'moved';

export const PAGE_SIZE = 40;

const SELECT = `
    *,
    wallet:wallets(*),
    transfer:transfers(
        *,
        from_wallet:wallets!from_wallet_id(*),
        to_wallet:wallets!to_wallet_id(*)
    )
`;

/**
 * The server narrows each filter roughly; flowOf() then applies the exact
 * spent / in / moved rule, so this list agrees with Spending's totals.
 */
export async function fetchTransactionsPage(filter: TxFilter, page: number): Promise<{ rows: TransactionWithWallet[]; hasMore: boolean }> {
    let q = supabase.from('transactions').select(SELECT);

    if (filter === 'spent') {
        q = q.in('type', ['expense', 'debit'])
            .or('is_transfer.is.null,is_transfer.eq.false,and(transfer_side.eq.from,category.not.is.null,category.neq.transfer)');
    } else if (filter === 'in') {
        q = q.in('type', ['income', 'credit'])
            .or('is_transfer.is.null,is_transfer.eq.false,and(transfer_side.eq.to,category.not.is.null,category.not.in.(transfer,income))');
    } else if (filter === 'moved') {
        q = q.or('is_transfer.eq.true,type.not.in.(expense,debit,income,credit)');
    }

    const from = page * PAGE_SIZE;
    const { data, error } = await q
        .order('transaction_date', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const rows = (data ?? []) as TransactionWithWallet[];
    return {
        rows: filter === 'all' ? rows : rows.filter((t) => flowOf(t) === flowFor(filter)),
        hasMore: rows.length === PAGE_SIZE,
    };
}

function flowFor(filter: Exclude<TxFilter, 'all'>) {
    return filter === 'in' ? 'in' : filter;
}

/** Characters that would break a PostgREST or() filter. */
const UNSAFE = /[,()%*\\]/g;

/**
 * Search names, places and amounts (Figma 1004:853). "45" also matches 45.00;
 * "45.5" matches 45.50.
 */
export async function searchTransactions(query: string): Promise<TransactionWithWallet[]> {
    const term = query.trim().replace(UNSAFE, ' ').trim();
    if (!term) return [];

    const clauses = [`description.ilike.%${term}%`];
    const asNumber = Number(term.replace(/^ghs\s*/i, ''));
    if (term && Number.isFinite(asNumber) && asNumber > 0) clauses.push(`amount.eq.${asNumber}`);

    const { data, error } = await supabase
        .from('transactions')
        .select(SELECT)
        .or(clauses.join(','))
        .order('transaction_date', { ascending: false })
        .limit(100);
    if (error) throw error;
    return dedupeTransfers((data ?? []) as TransactionWithWallet[]);
}

/**
 * A move between two of your wallets is saved as two rows (out of one, into
 * the other). Lists show it once, from the sending side.
 */
export function dedupeTransfers(rows: TransactionWithWallet[]): TransactionWithWallet[] {
    const sending = new Set(
        rows.filter((t) => t.transfer_id && t.transfer_side === 'from' && flowOf(t) === 'moved').map((t) => t.transfer_id),
    );
    return rows.filter((t) => !(t.transfer_id && t.transfer_side === 'to' && flowOf(t) === 'moved' && sending.has(t.transfer_id)));
}

export interface TxGroup {
    key: string;
    title: string;
    /** "251.00 out", "11.76 out · 200.00 in", "2 moves". */
    summary?: string;
    rows: TransactionWithWallet[];
}

const when = (t: TransactionWithWallet) => new Date(t.transaction_date || t.created_at);

/** Days carry their own totals (Figma 1004:617). */
export function groupByDay(rows: TransactionWithWallet[], format: (n: number) => string, now = new Date()): TxGroup[] {
    const groups: TxGroup[] = [];
    for (const t of rows) {
        const d = when(t);
        const last = groups[groups.length - 1];
        if (last && sameDay(when(last.rows[0]), d)) last.rows.push(t);
        else groups.push({ key: d.toDateString(), title: dayHeading(d, now), rows: [t] });
    }
    for (const g of groups) {
        let out = 0;
        let into = 0;
        for (const t of g.rows) {
            const f = flowOf(t);
            if (f === 'spent') out += Number(t.amount);
            else if (f === 'in') into += Number(t.amount);
        }
        g.summary = [out > 0 && `${format(out)} out`, into > 0 && `${format(into)} in`].filter(Boolean).join(' · ') || undefined;
    }
    return groups;
}

/** Moves are few, so the Moved filter groups by week: "This week · 2 moves" (Figma 1004:755). */
export function groupByWeek(rows: TransactionWithWallet[], now = new Date()): TxGroup[] {
    const thisWeek = startOfWeek(now).getTime();
    const lastWeek = thisWeek - 7 * 86_400_000;
    const groups: TxGroup[] = [];
    for (const t of rows) {
        const start = startOfWeek(when(t));
        const key = String(start.getTime());
        const title = start.getTime() === thisWeek ? 'This week'
            : start.getTime() === lastWeek ? 'Last week'
                : `Week of ${shortDate(start)}`;
        const last = groups[groups.length - 1];
        if (last?.key === key) last.rows.push(t);
        else groups.push({ key, title, rows: [t] });
    }
    for (const g of groups) g.summary = `${g.rows.length} ${g.rows.length === 1 ? 'move' : 'moves'}`;
    return groups;
}
