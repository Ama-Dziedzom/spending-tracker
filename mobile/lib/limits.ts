import { supabase } from './supabase';
import type { TransactionWithWallet } from './transaction-service';
import { addDays, between, catOf, spentOf, startOfDay, sum } from './money-window';
import { weeklyTotals } from './insights-engine';

/**
 * Weekly limits (Figma section 1044:5101; table from
 * supabase/migrations/20261110000000_limits.sql). Going over uses
 * status/warn, never danger, and the copy never shames.
 */
export interface Limit {
    id: string;
    category: string;
    amount: number;
    /** ISO weekday the week starts: 1 = Monday … 7 = Sunday. */
    reset_day: number;
    /** 0.8 = warn at 80 %; null = no warning. */
    warn_at: number | null;
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export async function getLimits(): Promise<Limit[]> {
    const { data, error } = await supabase.from('limits').select('id, category, amount, reset_day, warn_at').order('created_at');
    if (error) {
        console.error('limits read failed (has the limits migration run?):', error.message);
        return [];
    }
    return (data ?? []).map((l) => ({ ...l, amount: Number(l.amount), warn_at: l.warn_at === null ? null : Number(l.warn_at) })) as Limit[];
}

export async function saveLimit(l: Omit<Limit, 'id'>): Promise<void> {
    const { error } = await supabase
        .from('limits')
        .upsert({ category: l.category, amount: l.amount, reset_day: l.reset_day, warn_at: l.warn_at, period: 'week', last_warned_week: null }, { onConflict: 'user_id,category' });
    if (error) {
        throw new Error(/relation .*limits/i.test(error.message)
            ? 'Limits aren’t switched on yet. Try again after the next update.'
            : 'Couldn’t save the limit. Check your connection and try again.');
    }
}

export async function removeLimit(id: string): Promise<void> {
    const { error } = await supabase.from('limits').delete().eq('id', id);
    if (error) throw new Error('Couldn’t remove the limit. Try again.');
}

/** Start of the current limit week for a reset day. */
export function limitWeekStart(resetDay: number, now = new Date()): Date {
    const today = startOfDay(now);
    const iso = ((today.getDay() + 6) % 7) + 1; // Mon = 1 … Sun = 7
    return addDays(today, -((iso - resetDay + 7) % 7));
}

export interface LimitStatus {
    spent: number;
    left: number;
    over: number;
    /** 0–1+ of the limit used. */
    used: number;
    /** Days left in the week, including today. */
    daysLeft: number;
    /** "About GHS 5 a day left". */
    perDay: number;
    resetsOn: string;
    warned: boolean;
}

export function limitStatus(l: Limit, txs: TransactionWithWallet[], now = new Date()): LimitStatus {
    const start = limitWeekStart(l.reset_day, now);
    const spent = sum(spentOf(between(txs, start, addDays(start, 7))).filter((t) => catOf(t) === l.category));
    const daysLeft = Math.max(1, 7 - Math.round((startOfDay(now).getTime() - start.getTime()) / 86_400_000));
    const left = Math.max(0, l.amount - spent);
    return {
        spent,
        left,
        over: Math.max(0, spent - l.amount),
        used: spent / l.amount,
        daysLeft,
        perDay: left / daysLeft,
        resetsOn: WEEKDAYS[l.reset_day - 1],
        warned: l.warn_at !== null && spent >= l.amount * l.warn_at,
    };
}

/** What you usually spend in a week on this category: average of recent weeks with spending. */
export function usualWeekly(txs: TransactionWithWallet[], category: string, now = new Date()): number {
    const past = weeklyTotals(txs, category, 7, now).slice(0, -1).filter((w) => w.total > 0);
    return past.length ? past.reduce((s, w) => s + w.total, 0) / past.length : 0;
}
