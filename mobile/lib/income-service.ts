import { supabase } from './supabase';
import { addEntry } from './add-transaction';
import { deleteTransaction } from './transaction-edits';
import type { TransactionWithWallet } from './transaction-service';

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

/** Salary is its own Received category, so it shows as salary, not just "Income". */
export const SALARY_CATEGORY = 'salary';

/**
 * How long after its due day an unanswered check keeps asking. Long enough
 * that a salary due on the 28th is still asked about on the 1st, short enough
 * that a new expected income doesn't ask about a month before it was set up.
 */
const LOOKBACK_DAYS = 12;

/** The latest due date on or before `now`: this month's, or last month's if this month's hasn't come yet. */
function latestDue(item: ExpectedIncome, now: Date): Date | null {
    const thisMonth = dueDateThisMonth(item.day_of_month, now);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (new Date(thisMonth.getFullYear(), thisMonth.getMonth(), thisMonth.getDate()) <= startOfToday) return thisMonth;
    const lastMonth = dueDateThisMonth(item.day_of_month, new Date(now.getFullYear(), now.getMonth() - 1, 1));
    return (startOfToday.getTime() - lastMonth.getTime()) / 86_400_000 <= LOOKBACK_DAYS ? lastMonth : null;
}

/**
 * Income that's due and not yet logged. Asked every day until it's answered
 * (Figma "Salary check"). If it already came in (a Salary entry, or a credit
 * within 15% into the same wallet), it's marked received quietly instead.
 */
export async function getIncomePrompts(now = new Date()): Promise<IncomePrompt[]> {
    const items = await getExpectedIncome();
    const today = ymd(now);
    const prompts: IncomePrompt[] = [];

    for (const item of items) {
        const due = latestDue(item, now);
        if (!due) continue;
        if (item.last_confirmed_month === monthKey(due)) continue;
        if (item.snoozed_until && item.snoozed_until > today) continue;

        // Already came in? Look from a few days before the due date.
        const from = new Date(due);
        from.setDate(from.getDate() - 5);
        let q = supabase
            .from('transactions')
            .select('id, amount')
            .in('type', ['credit', 'income'])
            .gte('transaction_date', from.toISOString())
            .gte('amount', item.amount * 0.85)
            .lte('amount', item.amount * 1.15)
            .limit(1);
        if (item.wallet_id) q = q.eq('wallet_id', item.wallet_id);
        const { data: match } = await q;
        // A Salary entry counts for an expected salary (not, say, rent from a tenant).
        const { data: salary } = /salary|wage|pay/i.test(item.label)
            ? await supabase.from('transactions').select('id').eq('category', SALARY_CATEGORY).gte('transaction_date', from.toISOString()).limit(1)
            : { data: null };
        if ((match && match.length > 0) || (salary && salary.length > 0)) {
            await markIncomeReceived(item.id, due);
            continue;
        }
        prompts.push({ item, dueDate: due });
    }
    return prompts;
}

/** Marks the month of `forDate` (the due date) as received, so the check stops. */
export async function markIncomeReceived(id: string, forDate = new Date()): Promise<void> {
    await supabase
        .from('expected_income')
        .update({ last_confirmed_month: monthKey(forDate), snoozed_until: null })
        .eq('id', id);
}

/** "Not yet, ask tomorrow". */
export async function snoozeIncome(id: string, days = 1, now = new Date()): Promise<void> {
    const until = new Date(now);
    until.setDate(until.getDate() + days);
    await supabase.from('expected_income').update({ snoozed_until: ymd(until) }).eq('id', id);
}

/** What "Yes" logged, for the confirmation card and Undo. */
export interface LoggedIncome {
    item: ExpectedIncome;
    dueDate: Date;
    txId: string;
    amount: number;
}

/**
 * "Yes": log it as Salary income for the expected amount and add it to the
 * wallet's balance (the same way Add manually does), then stop asking.
 */
export async function logExpectedIncome(prompt: IncomePrompt, now = new Date()): Promise<LoggedIncome | null> {
    const { item, dueDate } = prompt;
    // Today if it's late (that's when it was seen), the due date if confirmed on the day.
    const when = now > dueDate ? now : dueDate;
    try {
        let txId: string;
        if (item.wallet_id) {
            txId = await addEntry({
                kind: 'in', amount: item.amount, category: SALARY_CATEGORY, walletId: item.wallet_id,
                when, description: item.label, remember: false,
            });
        } else {
            // No wallet chosen for it: save the income; there's no balance to change.
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data, error } = await supabase.from('transactions').insert({
                user_id: user.id, amount: item.amount, type: 'credit', category: SALARY_CATEGORY,
                description: item.label, transaction_date: when.toISOString(), source: 'manual', date_source: 'manual',
            }).select('id').single();
            if (error || !data) throw new Error(error?.message ?? 'no row');
            txId = data.id as string;
        }
        await markIncomeReceived(item.id, dueDate);
        return { item, dueDate, txId, amount: item.amount };
    } catch (e) {
        console.error('Logging expected income failed:', e);
        return null;
    }
}

/** Undo on the confirmation card: remove the entry (and its balance change) and ask again. */
export async function undoLoggedIncome(l: LoggedIncome): Promise<boolean> {
    const { data } = await supabase.from('transactions').select('*').eq('id', l.txId).maybeSingle();
    try {
        if (data) await deleteTransaction(data as TransactionWithWallet);
        await supabase.from('expected_income').update({ last_confirmed_month: null, snoozed_until: null }).eq('id', l.item.id);
        return true;
    } catch (e) {
        console.error('Undo income failed:', e);
        return false;
    }
}

/**
 * A Salary entry added by hand (Add · Received · Salary) counts as the
 * expected salary it matches, so the daily check stops: the one into the same
 * wallet, else the closest amount. Also covers a salary that came a few days early.
 */
export async function confirmIncomeFromEntry(amount: number, walletId: string | null, when = new Date()): Promise<void> {
    const items = await getExpectedIncome();
    const ahead = new Date(when); ahead.setDate(ahead.getDate() + 7);
    const open = items
        .map((item) => ({ item, due: latestDue(item, ahead) }))
        .filter((x): x is { item: ExpectedIncome; due: Date } => !!x.due && x.item.last_confirmed_month !== monthKey(x.due));
    if (!open.length) return;
    const pick = open.find((x) => x.item.wallet_id && x.item.wallet_id === walletId)
        ?? [...open].sort((a, b) => Math.abs(a.item.amount - amount) - Math.abs(b.item.amount - amount))[0];
    await markIncomeReceived(pick.item.id, pick.due);
}
