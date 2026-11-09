import { Share } from 'react-native';
import { supabase } from './supabase';
import type { AvatarChoice } from '@/components/ui';
import { API_URL } from './sms-api';

/**
 * Settings (Figma section 993:53). Everything here is stored on the account
 * (Supabase user_metadata) so it follows the person to a new phone, except
 * the theme and the Face ID lock, which belong to the device.
 */

export interface NotificationPrefs {
    /** "Spent GHS 10 on airtime · MTN MoMo" */
    logged: boolean;
    /** A message LogIt couldn't read is waiting in Check. */
    needsLook: boolean;
    salaryDay: boolean;
    sundaySummary: boolean;
    newInsights: boolean;
}

export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
    logged: true, needsLook: true, salaryDay: true, sundaySummary: true, newInsights: false,
};

/** handoff §7: hide amounts on widgets, lock screen on by default. */
export interface HideWidgetAmounts {
    lock_screen: boolean;
    home_screen: boolean;
}

export interface Profile {
    name: string | null;
    phone: string | null;
    email: string | null;
    /** True once an email address is confirmed. */
    emailConfirmed: boolean;
    avatar: AvatarChoice;
    notifications: NotificationPrefs;
    hideWidgetAmounts: HideWidgetAmounts;
}

export async function getProfile(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const m = user.user_metadata ?? {};
    const email = user.email || null;
    return {
        name: (m.full_name as string | undefined) ?? null,
        phone: user.phone ? `+${user.phone.replace(/^\+/, '')}` : null,
        email,
        emailConfirmed: !!user.email_confirmed_at && !!email,
        avatar: (m.avatar as AvatarChoice | undefined) ?? 'initials',
        notifications: { ...DEFAULT_NOTIFICATIONS, ...(m.notification_prefs ?? {}) },
        hideWidgetAmounts: { lock_screen: true, home_screen: false, ...(m.hide_widget_amounts ?? {}) },
    };
}

async function updateMeta(data: Record<string, unknown>): Promise<void> {
    const { error } = await supabase.auth.updateUser({ data });
    if (error) throw new Error('Couldn’t save that. Check your connection and try again.');
}

export const setName = (name: string) => updateMeta({ full_name: name.trim() });
export const setAvatar = (avatar: AvatarChoice) => updateMeta({ avatar });
export const setNotificationPrefs = (prefs: NotificationPrefs) => updateMeta({ notification_prefs: prefs });
export const setHideWidgetAmounts = (v: HideWidgetAmounts) => updateMeta({ hide_widget_amounts: v });

/** Adds an email for account recovery. Supabase sends a confirmation link. */
export async function setRecoveryEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    if (error) {
        throw new Error(/already/i.test(error.message)
            ? 'That email is already used by another account.'
            : 'Couldn’t add that email. Check it and try again.');
    }
}

/** "Last alert logged 2 min ago": the newest entry that came from an SMS. */
export async function lastAlertAt(): Promise<Date | null> {
    const { data } = await supabase
        .from('transactions')
        .select('created_at')
        .not('raw_sms', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);
    return data?.[0]?.created_at ? new Date(data[0].created_at) : null;
}

/** Counts for "This deletes everything" (Figma 1013:2101). */
export async function accountCounts(): Promise<{ transactions: number; wallets: number; expected: number }> {
    const [t, w, e] = await Promise.all([
        supabase.from('transactions').select('id', { count: 'exact', head: true }),
        supabase.from('wallets').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('expected_income').select('id', { count: 'exact', head: true }),
    ]);
    return { transactions: t.count ?? 0, wallets: w.count ?? 0, expected: e.count ?? 0 };
}

const csvCell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Export my transactions as CSV, through the share sheet (Mail, Files,
 * WhatsApp…). Returns how many rows were exported.
 */
export async function exportTransactions(): Promise<number> {
    const rows: Record<string, unknown>[] = [];
    const page = 1000;
    for (let from = 0; ; from += page) {
        const { data, error } = await supabase
            .from('transactions')
            .select('transaction_date, description, amount, type, category, is_transfer, source, wallet:wallets(name)')
            .order('transaction_date', { ascending: false })
            .range(from, from + page - 1);
        if (error) throw new Error('Couldn’t export right now. Check your connection and try again.');
        rows.push(...(data ?? []));
        if (!data || data.length < page) break;
    }
    const header = ['Date', 'Description', 'Amount (GHS)', 'Direction', 'Category', 'Wallet', 'Moved between wallets', 'Source'];
    const lines = rows.map((r) => {
        const wallet = (r.wallet as { name?: string } | null)?.name ?? '';
        const out = r.type === 'debit' || r.type === 'expense';
        return [
            new Date(String(r.transaction_date)).toISOString(), r.description, Number(r.amount).toFixed(2),
            out ? 'out' : 'in', r.category ?? '', wallet, r.is_transfer ? 'yes' : 'no', r.source ?? '',
        ].map(csvCell).join(',');
    });
    const csv = [header.join(','), ...lines].join('\n');
    await Share.share({ title: 'LogIt transactions.csv', message: csv });
    return rows.length;
}

/**
 * Delete the account and everything in it. Needs the API's /delete-account
 * (api/src/routes/delete-account.ts), which uses the service role.
 */
export async function deleteAccount(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('You’re signed out. Sign in and try again.');
    let res: Response;
    try {
        res = await fetch(`${API_URL}/delete-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ confirm: 'DELETE' }),
        });
    } catch {
        throw new Error('Couldn’t reach LogIt. Check your connection and try again.');
    }
    if (!res.ok) throw new Error('Couldn’t delete your account. Nothing was removed; try again.');
    await supabase.auth.signOut();
}
