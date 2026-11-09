import { supabase, type Wallet } from './supabase';
import { createWallets, getWallets, updateWallet } from './wallet-service';
import { getExpectedIncome, dueDateThisMonth, ordinal } from './income-service';
import type { TransactionWithWallet } from './transaction-service';
import { startOfWeek } from './spending-service';

/**
 * Wallets (Figma 1006:983) and Wallet detail (1006:1096). What you have,
 * wallet by wallet, and what's about to land.
 */

export interface WalletLine {
    wallet: Wallet;
    /** Latest entry in this wallet, if any. */
    lastActivity: Date | null;
    /** Cash that has never been counted or used: shown with a Count button, left out of the total. */
    uncounted: boolean;
}

export interface ComingUp {
    id: string;
    label: string;
    amount: number;
    /** "Usually around the 28th" */
    meta: string;
    due: Date;
    /** Whole days from today. */
    inDays: number;
}

export interface WalletsOverview {
    lines: WalletLine[];
    total: number;
    /** Wallets in the total. */
    counted: number;
    cashUncounted: boolean;
    comingUp: ComingUp[];
}

const dayMs = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export async function fetchWalletsOverview(now = new Date()): Promise<WalletsOverview> {
    const wallets = await getWallets();
    const ids = wallets.map((w) => w.id);

    // Latest entry per wallet: newest 300 rows is plenty to find each wallet's latest.
    const last = new Map<string, Date>();
    if (ids.length) {
        const { data, error } = await supabase
            .from('transactions')
            .select('wallet_id, transaction_date')
            .in('wallet_id', ids)
            .order('transaction_date', { ascending: false })
            .limit(300);
        if (error) throw error;
        for (const r of data ?? []) {
            if (r.wallet_id && !last.has(r.wallet_id)) last.set(r.wallet_id, new Date(r.transaction_date));
        }
    }

    const lines: WalletLine[] = wallets.map((w) => ({
        wallet: w,
        lastActivity: last.get(w.id) ?? null,
        uncounted: w.type === 'cash' && !Number(w.current_balance) && !last.has(w.id),
    }));

    // Cash first-class but last in the list, as in the design.
    lines.sort((a, b) => Number(a.wallet.type === 'cash') - Number(b.wallet.type === 'cash'));

    const inTotal = lines.filter((l) => !l.uncounted);
    let comingUp: ComingUp[] = [];
    try {
        comingUp = await getComingUp(now);
    } catch (e) {
        console.error('Coming up not loaded:', e);
    }

    return {
        lines,
        total: inTotal.reduce((s, l) => s + (Number(l.wallet.current_balance) || 0), 0),
        counted: inTotal.length,
        cashUncounted: lines.some((l) => l.uncounted),
        comingUp,
    };
}

/** Expected income in the next 14 days that hasn't been confirmed yet. */
async function getComingUp(now: Date): Promise<ComingUp[]> {
    const items = await getExpectedIncome();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const today = startOfDay(now);
    const out: ComingUp[] = [];
    for (const item of items) {
        let due = dueDateThisMonth(item.day_of_month, now);
        if (item.last_confirmed_month === monthKey || startOfDay(due) < today) {
            due = dueDateThisMonth(item.day_of_month, new Date(now.getFullYear(), now.getMonth() + 1, 1));
        }
        const inDays = Math.round((startOfDay(due).getTime() - today.getTime()) / dayMs);
        if (inDays > 14) continue;
        out.push({
            id: item.id,
            label: item.label,
            amount: Number(item.amount),
            meta: `Usually around the ${ordinal(item.day_of_month)}`,
            due,
            inDays,
        });
    }
    return out.sort((a, b) => a.inDays - b.inDays);
}

export interface WalletDetail {
    wallet: Wallet;
    inThisWeek: number;
    outThisWeek: number;
    recent: TransactionWithWallet[];
    /** When the balance last came from an alert (or a count, for cash). */
    balanceAt: Date | null;
    balanceFrom: 'alert' | 'count' | 'entries';
}

export async function fetchWalletDetail(walletId: string, now = new Date()): Promise<WalletDetail | null> {
    const { data: wallet, error } = await supabase.from('wallets').select('*').eq('id', walletId).maybeSingle();
    if (error) throw error;
    if (!wallet) return null;

    const weekStart = startOfWeek(now).toISOString();
    const [{ data: week, error: weekError }, { data: recent, error: recentError }, { data: snap }] = await Promise.all([
        supabase.from('transactions').select('amount, type').eq('wallet_id', walletId).gte('transaction_date', weekStart),
        supabase
            .from('transactions')
            .select('*, wallet:wallets(*), transfer:transfers(*, from_wallet:wallets!from_wallet_id(*), to_wallet:wallets!to_wallet_id(*))')
            .eq('wallet_id', walletId)
            .order('transaction_date', { ascending: false })
            .limit(15),
        supabase
            .from('transactions')
            .select('transaction_date')
            .eq('wallet_id', walletId)
            .not('balance_snapshot', 'is', null)
            .order('transaction_date', { ascending: false })
            .limit(1),
    ]);
    if (weekError) throw weekError;
    if (recentError) throw recentError;

    let inThisWeek = 0;
    let outThisWeek = 0;
    for (const t of week ?? []) {
        if (t.type === 'income' || t.type === 'credit') inThisWeek += Number(t.amount);
        else if (t.type === 'expense' || t.type === 'debit') outThisWeek += Number(t.amount);
    }

    const snapAt = snap?.[0]?.transaction_date ? new Date(snap[0].transaction_date) : null;
    return {
        wallet: wallet as Wallet,
        inThisWeek,
        outThisWeek,
        recent: (recent ?? []) as TransactionWithWallet[],
        balanceAt: snapAt ?? (wallet.updated_at ? new Date(wallet.updated_at) : null),
        balanceFrom: snapAt ? 'alert' : wallet.type === 'cash' ? 'count' : 'entries',
    };
}

// ---------------------------------------------------------------------------
// Add wallet (Figma 1006:1209) and Count cash (1006:1283)
// ---------------------------------------------------------------------------

/** Mobile money providers; identifiers match the API (api/src/lib/sms-helpers.ts). */
export const MOMO_PROVIDERS = [
    { id: 'mtn', name: 'MTN MoMo' },
    { id: 'telecel', name: 'Telecel Cash' },
    { id: 'at', name: 'AT Money' },
] as const;

/** Wallet colours are stored data, used by older screens; v1 draws wallets from tokens. */
const STORED_COLOR = { momo: '#1642E5', bank: '#1642E5', cash: '#169E49' } as const;

export async function addWallet(input: { type: 'momo' | 'bank' | 'cash'; name: string; balance: number; provider?: string }): Promise<Wallet> {
    const [w] = await createWallets([{
        name: input.name.trim(),
        type: input.type,
        icon: input.type === 'momo' ? 'wallet-03' : input.type === 'bank' ? 'bank' : 'money-01',
        color: STORED_COLOR[input.type],
        initial_balance: input.balance,
        ...(input.provider ? { source_identifier: input.provider } : {}),
    }]);
    if (!w) throw new Error('Couldn’t add the wallet. Check your connection and try again.');
    return w;
}

/** A starting number for cash. After this, cash-outs top it up and Log cash draws it down. */
export async function countCash(walletId: string, amount: number): Promise<void> {
    // updateWallet's schema doesn't allow balances, so write it directly.
    const { error } = await supabase
        .from('wallets')
        .update({ current_balance: amount, updated_at: new Date().toISOString() })
        .eq('id', walletId);
    if (error) throw new Error('Couldn’t save your count. Try again.');
}

export async function renameWallet(walletId: string, name: string): Promise<void> {
    const updated = await updateWallet(walletId, { name: name.trim() });
    if (!updated) throw new Error('Couldn’t rename it. Try again.');
}
