import { supabase } from './supabase';
import type { ReviewItem } from './review-service';

/**
 * Banks LogIt learned (learned_senders). Confirming an alert in Check that no
 * pattern could read teaches LogIt that alert's shape and the wallet it goes
 * to; the server then logs later alerts with the same shape on its own.
 * See supabase/migrations/20261122000000_affinity_and_learned_senders.sql.
 */
export interface LearnedSender {
    id: string;
    wallet_id: string;
    direction: 'debit' | 'credit';
    label: string | null;
    template: string | null;
    uses: number;
    last_used: string | null;
    wallet?: { name: string } | null;
}

/** After a Check item is added: remember its sender. Quietly does nothing before the migration. */
export async function learnFromReview(review: ReviewItem, transactionId: string): Promise<boolean> {
    if (!review.shape) return false;
    const [{ data: { user } }, { data: tx }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('transactions').select('wallet_id, type, category, description').eq('id', transactionId).maybeSingle(),
    ]);
    if (!user || !tx?.wallet_id) return false;
    const direction = tx.type === 'credit' || tx.type === 'income' ? 'credit' : 'debit';
    const { error } = await supabase.from('learned_senders').upsert(
        {
            user_id: user.id,
            shape: review.shape,
            wallet_id: tx.wallet_id,
            direction,
            category: tx.category ?? null,
            label: tx.description ?? null,
            template: review.template ?? null,
        },
        { onConflict: 'user_id,shape' },
    );
    if (error) console.warn('Couldn’t learn this sender:', error.message);
    return !error;
}

export async function getLearnedSenders(): Promise<LearnedSender[]> {
    const { data, error } = await supabase
        .from('learned_senders')
        .select('id, wallet_id, direction, label, template, uses, last_used, wallet:wallets(name)')
        .order('created_at', { ascending: false });
    if (error) return [];
    return (data ?? []) as unknown as LearnedSender[];
}

export async function forgetSender(id: string): Promise<boolean> {
    const { error } = await supabase.from('learned_senders').delete().eq('id', id);
    return !error;
}
