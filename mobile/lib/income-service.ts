import { supabase } from './supabase';

/**
 * Expected income: money the user knows is coming (salary, allowance, rent
 * received) even when their bank sends no credit alert. Table: expected_income
 * (migration 20261108000000_expected_income.sql).
 */
export interface ExpectedIncome {
    id: string;
    wallet_id: string | null;
    label: string;
    amount: number;
    day_of_month: number;
    is_active: boolean;
    snoozed_until: string | null;
    last_confirmed_month: string | null;
}

export interface IncomeInput {
    label: string;
    amount: number;
    day_of_month: number;
    wallet_id: string | null;
}

/** A prompt to show on Home: "Did your Salary come in?" */
export interface IncomePrompt {
    item: ExpectedIncome;
    dueDate: Date;
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const ymd = (d: Date) => `${monthKey(d)}-${String(d.getDate()).padStart(2, '0')}`;

/** The day it's due this month (the 31st becomes the 30th in a 30-day month). */
export function dueDateThisMonth(day: number, now = new Date()): Date {
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return new Date(now.getFullYear(), now.getMonth(), Math.min(day, last), 9, 0, 0);
}

export function ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export async function getExpectedIncome(): Promise<ExpectedIncome[]> {
    const { data, error } = await supabase
        .from('expected_income')
        .select('*')
        .eq('is_active', true)
        .order('day_of_month', { ascending: true });
    if (error) {
        console.warn('expected_income not available (run migration 20261108000000_expected_income.sql):', error.message);
        return [];
    }
    return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as ExpectedIncome[];
}

export async function saveExpectedIncome(input: IncomeInput, id?: string): Promise<boolean> {
    const row = { ...input, updated_at: new Date().toISOString() };
    const { error } = id
        ? await supabase.from('expected_income').update(row).eq('id', id)
        : await supabase.from('expected_income').insert(row);
    if (error) console.error('Saving expected income failed:', error.message);
    return !error;
}

export async function removeExpectedIncome(id: string): Promise<boolean> {
    const { error } = await supabase.from('expected_income').update({ is_active: false }).eq('id', id);
    return !error;
}

/**
 * Income that's due (on or after its day this month) and not yet logged.
 * If a matching credit already arrived (amount within 15%, same wallet), it
 * is marked as received quietly instead of asking.
 */
export async function getIncomePrompts(now = new Date()): Promise<IncomePrompt[]> {
    const items = await getExpectedIncome();
    const key = monthKey(now);
    const today = ymd(now);
    const prompts: IncomePrompt[] = [];

    for (const item of items) {
        const due = dueDateThisMonth(item.day_of_month, now);
        if (now < new Date(due.getFullYear(), due.getMonth(), due.getDate())) continue;
        if (item.last_confirmed_month === key) continue;
        if (item.snoozed_until && item.snoozed_until > today) continue;

        // Already came in? Look from a few days before the due date.
        const from = new Date(due);
        from.setDate(from.getDate() - 5);
        let q = supabase
            .from('transactions')
            .select('id, amount')
            .eq('type', 'credit')
            .gte('transaction_date', from.toISOString())
            .gte('amount', item.amount * 0.85)
            .lte('amount', item.amount * 1.15)
            .limit(1);
        if (item.wallet_id) q = q.eq('wallet_id', item.wallet_id);
        const { data: match } = await q;
        if (match && match.length > 0) {
            await markIncomeReceived(item.id, now);
            continue;
        }
        prompts.push({ item, dueDate: due });
    }
    return prompts;
}

export async function markIncomeReceived(id: string, now = new Date()): Promise<void> {
    await supabase
        .from('expected_income')
        .update({ last_confirmed_month: monthKey(now), snoozed_until: null })
        .eq('id', id);
}

/** "Not yet": ask again in a couple of days. */
export async function snoozeIncome(id: string, days = 2, now = new Date()): Promise<void> {
    const until = new Date(now);
    until.setDate(until.getDate() + days);
    await supabase.from('expected_income').update({ snoozed_until: ymd(until) }).eq('id', id);
}

/** "Yes": log it as income on its due date, for the expected amount. */
export async function logExpectedIncome(prompt: IncomePrompt): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { item, dueDate } = prompt;
    const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        wallet_id: item.wallet_id,
        amount: item.amount,
        type: 'credit',
        category: 'income',
        description: item.label,
        transaction_date: dueDate.toISOString(),
        source: 'manual',
    });
    if (error) {
        console.error('Logging expected income failed:', error.message);
        return false;
    }
    await markIncomeReceived(item.id);
    return true;
}
