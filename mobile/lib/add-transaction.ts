import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, type Wallet } from './supabase';
import { createWallets } from './wallet-service';
import { processTransfer } from './transaction-service';
import { adjustBalance } from './transaction-edits';

/**
 * Saving new entries from Add manually and Log cash (Figma 1005:1055,
 * 1005:1161). Amount first; everything else has a sensible default, so most
 * adds are two taps.
 */

export interface NewEntry {
    kind: 'spent' | 'in';
    amount: number;
    category: string;
    walletId: string;
    when: Date;
    /** Shown as the entry's name; falls back to the category label. */
    description: string;
    /** When the entry comes from an alert (Check, Paste · Edit first). */
    rawSms?: string;
}

/** Returns the new entry's id. Throws with a user-facing message on failure. */
export async function addEntry(e: NewEntry): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You’re signed out. Sign in and try again.');

    const row = {
        user_id: user.id,
        description: e.description.trim(),
        amount: e.amount,
        type: e.kind === 'spent' ? 'debit' : 'credit',
        category: e.category,
        wallet_id: e.walletId,
        transaction_date: e.when.toISOString(),
        source: 'manual',
        date_source: 'manual',
        ...(e.rawSms ? { raw_sms: e.rawSms } : {}),
    };

    // balance_applied needs migration 20261109020000. Without it, save the
    // entry the old way and leave the balance alone, so a later delete can't
    // undo a change that never happened.
    let applied = true;
    let { data, error } = await supabase.from('transactions').insert({ ...row, balance_applied: true }).select('id').single();
    if (error && /balance_applied/i.test(error.message)) {
        applied = false;
        ({ data, error } = await supabase.from('transactions').insert(row).select('id').single());
    }
    if (error || !data) {
        console.error('Add entry failed:', error?.message);
        throw new Error('Couldn’t save it. Check your connection and try again.');
    }

    if (applied) {
        try {
            await adjustBalance(e.walletId, e.kind === 'spent' ? -e.amount : e.amount);
        } catch (err) {
            // The entry is saved; mark it so removing it later doesn't undo a change that didn't happen.
            console.error('Balance not updated:', err);
            await supabase.from('transactions').update({ balance_applied: false }).eq('id', data.id);
        }
    }

    remember({ walletId: e.walletId, ...(e.kind === 'spent' ? { spentCategory: e.category } : {}) });
    return data.id as string;
}

/** Money between two of your wallets. Not spending, so it's left out of totals. */
export async function addMove(m: { amount: number; fromId: string; toId: string; when: Date; note: string }): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You’re signed out. Sign in and try again.');
    const { data, error } = await supabase
        .from('transactions')
        .insert({
            user_id: user.id,
            description: m.note.trim() || 'Moved between wallets',
            amount: m.amount,
            type: 'debit',
            category: 'transfer',
            wallet_id: m.fromId,
            transaction_date: m.when.toISOString(),
            source: 'manual',
            date_source: 'manual',
        })
        .select('id')
        .single();
    if (error || !data) throw new Error('Couldn’t save it. Check your connection and try again.');

    // process_wallet_transfer links both sides and moves the balances.
    const ok = await processTransfer(data.id, m.fromId, m.toId, m.amount, m.note.trim());
    if (!ok) {
        await supabase.from('transactions').delete().eq('id', data.id);
        throw new Error('Couldn’t move the money between wallets. Try again.');
    }
    return data.id as string;
}

/** First cash log with no cash wallet yet: start one at zero. */
export async function createCashWallet(): Promise<Wallet> {
    const [w] = await createWallets([{ name: 'Cash', type: 'cash', icon: 'money-01', color: '#169E49', initial_balance: 0 }]);
    if (!w) throw new Error('Couldn’t start your Cash wallet. Try again.');
    return w;
}

// ---------------------------------------------------------------------------
// Sensible defaults: the wallet and spending category you used last.
// ---------------------------------------------------------------------------

const KEY = 'logit.addDefaults';

export interface AddDefaults {
    walletId?: string;
    spentCategory?: string;
}

export async function getAddDefaults(): Promise<AddDefaults> {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as AddDefaults) : {};
    } catch {
        return {};
    }
}

function remember(patch: AddDefaults) {
    getAddDefaults()
        .then((cur) => AsyncStorage.setItem(KEY, JSON.stringify({ ...cur, ...patch })))
        .catch(() => {});
}
