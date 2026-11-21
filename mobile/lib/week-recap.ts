import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { TransactionWithWallet } from './transaction-service';
import { flowOf, shortName, startOfWeek } from './spending-service';
import { categoryStyle, type CategoryStyle } from './category-style';
import { expandSplits } from './splits';
import { sameDay, shortDate } from './format';

/**
 * Week recap (Figma "Week recap · sheet", 02 · Spending): the first time the
 * app opens in a new week, a sheet sums up last week. The conclusion comes
 * first (a one-line headline), then the number, then the chart that backs it.
 * Same spent rules as the Spending card (flowOf).
 */

export interface RecapDay {
    letter: string;
    date: Date;
    spent: number;
}

export interface RecapCategory {
    id: string;
    style: CategoryStyle;
    amount: number;
    count: number;
    names: string[];
}

export interface WeekRecap {
    /** Monday 00:00 of last week. */
    start: Date;
    /** Sunday of last week. */
    end: Date;
    spent: number;
    /** The week before last, for the comparison. 0 when nothing was logged. */
    weekBefore: number;
    days: RecapDay[];
    /** Index into days of the biggest day. */
    bigDayIndex: number;
    bigDayNames: string[];
    bigDayStyle: CategoryStyle;
    categories: RecapCategory[];
}

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const SEEN_KEY = 'logit.weekRecap.seenWeek';

const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(d.getDate() + n);
    return x;
};
const total = (txs: TransactionWithWallet[]) => txs.reduce((s, t) => s + Number(t.amount), 0);

/** The key for "this week" (its Monday, local date). */
function weekKey(now: Date): string {
    const m = startOfWeek(now);
    return `${m.getFullYear()}-${m.getMonth() + 1}-${m.getDate()}`;
}

/** True when this week's recap hasn't been shown yet. */
export async function recapDue(now = new Date()): Promise<boolean> {
    const seen = await AsyncStorage.getItem(SEEN_KEY).catch(() => null);
    return seen !== weekKey(now);
}

export async function markRecapSeen(now = new Date()): Promise<void> {
    await AsyncStorage.setItem(SEEN_KEY, weekKey(now)).catch(() => {});
}

/** Last week and the week before it. Null when nothing went out last week. */
export async function fetchWeekRecap(now = new Date()): Promise<WeekRecap | null> {
    const thisWeek = startOfWeek(now);
    const start = addDays(thisWeek, -7);
    const before = addDays(thisWeek, -14);

    const { data, error } = await supabase
        .from('transactions')
        .select('*, wallet:wallets(*)')
        .gte('transaction_date', before.toISOString())
        .lt('transaction_date', thisWeek.toISOString());
    if (error) throw new Error(error.message);

    const spent = ((data ?? []) as TransactionWithWallet[]).filter((t) => flowOf(t) === 'spent');
    const at = (t: TransactionWithWallet) => new Date(t.transaction_date);
    const lastWeek = spent.filter((t) => at(t) >= start);
    const weekBefore = spent.filter((t) => at(t) < start);
    return buildRecap(lastWeek, total(weekBefore), start);
}

export function buildRecap(lastWeek: TransactionWithWallet[], weekBefore: number, start: Date): WeekRecap | null {
    const spent = total(lastWeek);
    if (spent <= 0) return null;
    const at = (t: TransactionWithWallet) => new Date(t.transaction_date);

    const days: RecapDay[] = LETTERS.map((letter, i) => {
        const date = addDays(start, i);
        return { letter, date, spent: total(lastWeek.filter((t) => sameDay(at(t), date))) };
    });
    const bigDayIndex = days.reduce((best, d, i) => (d.spent > days[best].spent ? i : best), 0);
    const bigDayTxs = lastWeek.filter((t) => sameDay(at(t), days[bigDayIndex].date));
    const biggest = [...bigDayTxs].sort((a, b) => Number(b.amount) - Number(a.amount))[0];

    const byCat = new Map<string, TransactionWithWallet[]>();
    for (const t of expandSplits(lastWeek)) {
        const id = t.category ?? 'other';
        byCat.set(id, [...(byCat.get(id) ?? []), t]);
    }
    const categories = [...byCat.entries()]
        .map(([id, list]) => ({ id, style: categoryStyle(id), amount: total(list), count: list.length, names: topNames(list, 2) }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

    return {
        start,
        end: addDays(start, 6),
        spent,
        weekBefore,
        days,
        bigDayIndex,
        bigDayNames: topNames(bigDayTxs, 3),
        bigDayStyle: categoryStyle(biggest?.category),
        categories,
    };
}

/** The one line that says what the week meant, before any numbers. */
export function recapHeadline(r: WeekRecap): string {
    if (r.weekBefore <= 0) return 'Here’s how last week went';
    const ratio = r.spent / r.weekBefore;
    if (ratio <= 0.9) return 'A calmer week than the one before';
    if (ratio >= 1.1) return 'A busier week than the one before';
    return 'About the same as the week before';
}

/** "24–30 Nov", or "29 Sep – 5 Oct" across months. */
export function recapRange(r: WeekRecap): string {
    if (r.start.getMonth() === r.end.getMonth()) return `${r.start.getDate()}–${shortDate(r.end)}`;
    return `${shortDate(r.start)} – ${shortDate(r.end)}`;
}

/** "Shoprite", "Shoprite and Akosua", "Shoprite, Akosua and Uber". */
export function joinNames(names: string[]): string {
    if (names.length <= 1) return names[0] ?? '';
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function topNames(txs: TransactionWithWallet[], n: number): string[] {
    const byName = new Map<string, number>();
    for (const t of txs) {
        const name = shortName(t.description);
        if (name) byName.set(name, (byName.get(name) ?? 0) + Number(t.amount));
    }
    return [...byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}
