import { supabase, type Wallet } from './supabase';
import type { TransactionWithWallet } from './transaction-service';
import { getPendingReviews, prefillFor, type ReviewItem, type ReviewPrefill } from './review-service';
import { updateWallet } from './wallet-service';

/**
 * Check (Figma 1007:1175…1456): the short queue of messages LogIt needs you
 * to confirm. Two kinds today:
 *  - account: an entry LogIt read but couldn't place in a wallet ("Which account is this card?")
 *  - unread:  an alert LogIt couldn't read at all (failed_parses)
 */
export type CheckItem =
    | { kind: 'account'; id: string; tx: TransactionWithWallet }
    | { kind: 'unread'; id: string; review: ReviewItem; prefill: ReviewPrefill };

export async function getCheckItems(): Promise<CheckItem[]> {
    const [reviews, { data, error }] = await Promise.all([
        getPendingReviews(),
        supabase
            .from('transactions')
            .select('*')
            .is('wallet_id', null)
            .order('transaction_date', { ascending: false })
            .limit(50),
    ]);
    if (error) throw error;
    const accounts: CheckItem[] = ((data ?? []) as TransactionWithWallet[])
        .filter((t) => !t.transfer_id)
        .map((tx) => ({ kind: 'account', id: `t:${tx.id}`, tx }));
    const unread: CheckItem[] = reviews.map((r) => ({ kind: 'unread', id: `r:${r.id}`, review: r, prefill: prefillFor(r) }));
    return [...accounts, ...unread];
}

/** For the Spending banner: "2 messages to check". */
export async function getCheckCount(): Promise<number> {
    const [{ count: reviews }, { count: unmatched }] = await Promise.all([
        supabase.from('failed_parses').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('transactions').select('id', { count: 'exact', head: true }).is('wallet_id', null).is('transfer_id', null),
    ]);
    return (reviews ?? 0) + (unmatched ?? 0);
}

/** Alert source → provider identifier used by the API's wallet routing (api/src/lib/sms-helpers.ts). */
const SOURCE_IDENTIFIER: Record<string, { id: string; name: string; type: 'momo' | 'bank' }> = {
    MTN_MoMo: { id: 'mtn', name: 'MTN MoMo', type: 'momo' },
    Vodafone_Cash: { id: 'telecel', name: 'Telecel Cash', type: 'momo' },
    AirtelTigo_Money: { id: 'at', name: 'AT Money', type: 'momo' },
    StanChart: { id: 'stanchart', name: 'Standard Chartered', type: 'bank' },
    GCBBank: { id: 'gcb', name: 'GCB Bank', type: 'bank' },
    UBAGHANA: { id: 'uba', name: 'UBA', type: 'bank' },
};

export function providerOf(source?: string | null) {
    return source ? SOURCE_IDENTIFIER[source] ?? null : null;
}

/** The wallet this alert most likely belongs to, best first. */
export function suggestWallets(tx: TransactionWithWallet, wallets: Wallet[]): Wallet[] {
    const p = providerOf(tx.source);
    const score = (w: Wallet) => {
        if (p && (w.source_identifier ?? '').toLowerCase() === p.id) return 3;
        if (p && w.name.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])) return 2;
        if (p && w.type === p.type) return 1;
        return 0;
    };
    return wallets.filter((w) => w.type !== 'cash').sort((a, b) => score(b) - score(a));
}

/**
 * Put the entry in a wallet, keeping the category LogIt already gave it
 * (assign_transaction_to_wallet also moves the balance). With remember on,
 * the wallet takes the alert's provider so future alerts land there.
 */
export async function placeInWallet(tx: TransactionWithWallet, wallet: Wallet, remember: boolean): Promise<{ remembered: boolean }> {
    const { error } = await supabase.rpc('assign_transaction_to_wallet', {
        p_transaction_id: tx.id,
        p_wallet_id: wallet.id,
        p_category_id: tx.category ?? 'other',
    });
    if (error) throw new Error('Couldn’t add it. Check your connection and try again.');

    const p = providerOf(tx.source);
    if (remember && p && (wallet.source_identifier ?? '').toLowerCase() !== p.id) {
        const ok = await updateWallet(wallet.id, { source_identifier: p.id });
        return { remembered: !!ok };
    }
    return { remembered: false };
}

/** Not money: an entry with no wallet never touched a balance, so it can simply go. */
export async function discardUnplaced(tx: TransactionWithWallet): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', tx.id).is('wallet_id', null);
    if (error) throw new Error('Couldn’t skip it. Try again.');
}
