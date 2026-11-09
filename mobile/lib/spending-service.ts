import { supabase } from './supabase';
import type { TransactionWithWallet } from './transaction-service';
import { categoryStyle, type CategoryStyle } from './category-style';
import { sameDay } from './format';

/**
 * Numbers for the v1 Spending screen. One fetch, then pure functions, so the
 * same rules can feed Insights and widgets later (handoff §13: every screen
 * agrees). The spent / in / moved rules match getGlobalAnalytics.
 */

export type Flow = 'spent' | 'in' | 'moved';

/** Same rules as getGlobalAnalytics in transaction-service.ts. */
export function flowOf(tx: Pick<TransactionWithWallet, 'type' | 'is_transfer' | 'transfer_side' | 'category'>): Flow {
    const out = tx.type === 'expense' || tx.type === 'debit';
    const into = tx.type === 'income' || tx.type === 'credit';
    if (!tx.is_transfer) return out ? 'spent' : into ? 'in' : 'moved';
    // Transfers count only when they were given a spending/income category.
    if (tx.transfer_side === 'from' && tx.category && tx.category !== 'transfer') return 'spent';
    if (tx.transfer_side === 'to' && tx.category && tx.category !== 'transfer' && tx.category !== 'income') return 'in';
    return 'moved';
}

/** Monday 00:00 of the week containing d. */
export function startOfWeek(d: Date): Date {
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dow = (s.getDay() + 6) % 7; // Mon = 0
    s.setDate(s.getDate() - dow);
    return s;
}

export function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Everything Spending needs: from the earlier of last Monday-week or the 1st of the month. */
export async function fetchSpendingWindow(now = new Date()): Promise<TransactionWithWallet[]> {
    const lastWeek = startOfWeek(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const from = new Date(Math.min(lastWeek.getTime(), startOfMonth(now).getTime()));

    const { data, error } = await supabase
        .from('transactions')
        .select('*, wallet:wallets(*)')
        .gte('transaction_date', from.toISOString())
        .order('transaction_date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as TransactionWithWallet[];
}

const sum = (txs: TransactionWithWallet[]) => txs.reduce((s, t) => s + Number(t.amount), 0);

export interface DayTotal {
    date: Date;
    /** "M", "T", … */
    letter: string;
    /** null for days after today. */
    spent: number | null;
    isToday: boolean;
}

export interface CategoryTotal {
    id: string;
    style: CategoryStyle;
    amount: number;
    count: number;
    /** Up to two distinct places/people, for the meta line ("Shoprite, Melcom"). */
    names: string[];
}

export interface SpendingSummary {
    week: {
        spent: number;
        /** Same days of last week (Mon → today's weekday), so the comparison is fair. */
        lastWeekSameSpan: number;
        days: DayTotal[];
        /** The biggest day so far, if it's clearly bigger than the rest. */
        bigDay: { date: Date; names: string[]; style: CategoryStyle } | null;
        /** The three biggest payments this week, largest first. */
        top: TransactionWithWallet[];
        cameIn: number;
        moved: number;
    };
    today: {
        spent: number;
        /** Spent and received entries today, newest first (moved left out). */
        entries: TransactionWithWallet[];
        payments: number;
    };
    month: {
        spent: number;
        cameIn: number;
        categories: CategoryTotal[];
    };
    /** True when nothing at all is logged in the window (first-run state). */
    empty: boolean;
}

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function summarise(txs: TransactionWithWallet[], now = new Date()): SpendingSummary {
    const weekStart = startOfWeek(now);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);
    const lastWeekSpanEnd = new Date(now);
    lastWeekSpanEnd.setDate(now.getDate() - 7);
    const monthStart = startOfMonth(now);

    const at = (t: TransactionWithWallet) => new Date(t.transaction_date);
    const inRange = (t: TransactionWithWallet, a: Date, b: Date) => {
        const d = at(t);
        return d >= a && d <= b;
    };

    const spent = txs.filter((t) => flowOf(t) === 'spent');
    const received = txs.filter((t) => flowOf(t) === 'in');
    const moved = txs.filter((t) => flowOf(t) === 'moved');

    // Week
    const weekSpent = spent.filter((t) => inRange(t, weekStart, now));
    const days: DayTotal[] = LETTERS.map((letter, i) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const future = date > now && !sameDay(date, now);
        return {
            date,
            letter,
            spent: future ? null : sum(weekSpent.filter((t) => sameDay(at(t), date))),
            isToday: sameDay(date, now),
        };
    });
    const ranked = days.filter((d) => (d.spent ?? 0) > 0).sort((a, b) => (b.spent ?? 0) - (a.spent ?? 0));
    let bigDay: SpendingSummary['week']['bigDay'] = null;
    if (ranked.length >= 2 && (ranked[0].spent ?? 0) >= 2 * (ranked[1].spent ?? 0)) {
        const dayTxs = weekSpent.filter((t) => sameDay(at(t), ranked[0].date));
        const biggest = [...dayTxs].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
        bigDay = { date: ranked[0].date, names: topNames(dayTxs, 3), style: categoryStyle(biggest?.category) };
    }

    // Today
    const todaysEntries = txs.filter((t) => sameDay(at(t), now) && flowOf(t) !== 'moved');
    const todaySpent = todaysEntries.filter((t) => flowOf(t) === 'spent');

    // Month
    const monthSpent = spent.filter((t) => inRange(t, monthStart, now));
    const byCat = new Map<string, TransactionWithWallet[]>();
    for (const t of monthSpent) {
        const id = t.category ?? 'other';
        byCat.set(id, [...(byCat.get(id) ?? []), t]);
    }
    const categories: CategoryTotal[] = [...byCat.entries()]
        .map(([id, list]) => ({ id, style: categoryStyle(id), amount: sum(list), count: list.length, names: topNames(list, 2) }))
        .sort((a, b) => b.amount - a.amount);

    return {
        week: {
            spent: sum(weekSpent),
            lastWeekSameSpan: sum(spent.filter((t) => inRange(t, lastWeekStart, lastWeekSpanEnd))),
            days,
            bigDay,
            top: [...weekSpent].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3),
            cameIn: sum(received.filter((t) => inRange(t, weekStart, now))),
            moved: sum(moved.filter((t) => inRange(t, weekStart, now))),
        },
        today: { spent: sum(todaySpent), entries: todaysEntries, payments: todaySpent.length },
        month: {
            spent: sum(monthSpent),
            cameIn: sum(received.filter((t) => inRange(t, monthStart, now))),
            categories,
        },
        empty: txs.length === 0,
    };
}

/** Distinct descriptions by amount, e.g. ["Akosua", "Shoprite", "airtime"]. */
function topNames(txs: TransactionWithWallet[], n: number): string[] {
    const byName = new Map<string, number>();
    for (const t of txs) {
        const name = shortName(t.description);
        if (name) byName.set(name, (byName.get(name) ?? 0) + Number(t.amount));
    }
    return [...byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

/** "Shoprite, Accra Mall" → "Shoprite"; "Akosua Mensah" → "Akosua". */
export function shortName(description?: string | null): string {
    const d = (description ?? '').trim();
    if (!d) return '';
    return d.split(',')[0].split(/\s+/)[0];
}
