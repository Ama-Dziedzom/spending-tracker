import { supabase } from './supabase';

/**
 * "Needs review": SMS that LogIt couldn't read automatically (rows in
 * failed_parses). The user can add them manually (pre-filled from the text)
 * or dismiss them if they weren't transactions.
 */

export interface ReviewItem {
    id: string;
    raw_sms: string;
    reason: string;
    created_at: string;
    /** The server's fallback reading of an unfamiliar alert (may be missing) */
    guess?: ServerGuess | null;
}

/** Shape written by api/src/lib/fallback-reader.ts */
export interface ServerGuess {
    amount: number | null;
    direction: 'debit' | 'credit' | null;
    balance: number | null;
    counterparty: string | null;
    reference: string | null;
    provider: string | null;
    confidence: number;
}

export interface ReviewPrefill {
    amount?: string;
    type?: 'expense' | 'income';
    description?: string;
    date?: string; // ISO
}

export async function getPendingReviews(): Promise<ReviewItem[]> {
    let { data, error }: { data: ReviewItem[] | null; error: { message: string } | null } = await supabase
        .from('failed_parses')
        .select('id, raw_sms, reason, created_at, guess')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    // Before the unknown_senders migration there's no guess column
    if (error && /guess/i.test(error.message)) {
        ({ data, error } = await supabase
            .from('failed_parses')
            .select('id, raw_sms, reason, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: false }));
    }
    if (error) {
        // Most likely the "needs_review" migration hasn't been run (no status column)
        console.error('Error fetching review items (has the needs_review migration run?):', error.message);
        return [];
    }
    return (data ?? []) as ReviewItem[];
}

export async function getPendingReviewCount(): Promise<number> {
    const { count, error } = await supabase
        .from('failed_parses')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
    if (error) {
        console.error('Error counting review items (has the needs_review migration run?):', error.message);
        return 0;
    }
    return count ?? 0;
}

export async function dismissReview(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('failed_parses')
        .update({ status: 'dismissed', resolved_at: new Date().toISOString() })
        .eq('id', id);
    return !error;
}

export async function resolveReview(id: string, transactionId?: string): Promise<boolean> {
    const { error } = await supabase
        .from('failed_parses')
        .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            ...(transactionId ? { resolved_transaction_id: transactionId } : {}),
        })
        .eq('id', id);
    return !error;
}

const MONTHS: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Best-effort guesses from the SMS text, to save typing. Always editable. */
export function guessFromSms(sms: string): ReviewPrefill {
    const prefill: ReviewPrefill = {};

    const amount = sms.match(/(?:GHS|GH₵|GHC|¢)\s?([\d,]+(?:\.\d{1,2})?)/i);
    if (amount) prefill.amount = amount[1].replace(/,/g, '');

    if (/\b(received|credited|credit|deposit|cash in|refund|reversal)\b/i.test(sms)) prefill.type = 'income';
    else if (/\b(sent|paid|payment|debited|debit|cash out|withdraw|purchase|bought)\b/i.test(sms)) prefill.type = 'expense';

    const party = sms.match(/\b(?:to|from)\s+([A-Z][A-Za-z0-9&.' -]{2,40}?)(?:[.,]|\s+(?:on|at|ref|reference|current|your)\b)/);
    if (party) prefill.description = party[1].trim();

    const iso = sms.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/);
    const mon = sms.match(/\b(\d{1,2})[-\s]([A-Za-z]{3})[A-Za-z]*[-\s,]+(\d{2,4})/);
    let d: Date | null = null;
    if (iso) d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +iso[4], +iso[5]));
    else if (mon && MONTHS[mon[2].toLowerCase()] !== undefined) {
        const y = mon[3].length === 2 ? 2000 + +mon[3] : +mon[3];
        d = new Date(Date.UTC(y, MONTHS[mon[2].toLowerCase()], +mon[1], 12));
    }
    if (d && !isNaN(d.getTime()) && d.getTime() <= Date.now() + 86400000) prefill.date = d.toISOString();

    return prefill;
}

/**
 * Pre-fill for a Check card: the server's reading when it found something,
 * topped up with the on-device guess (which also reads dates).
 */
export function prefillFor(item: ReviewItem): ReviewPrefill {
    const local = guessFromSms(item.raw_sms);
    const g = item.guess;
    if (!g) return local;
    return {
        amount: g.amount !== null && g.amount !== undefined ? String(g.amount) : local.amount,
        type: g.direction === 'credit' ? 'income' : g.direction === 'debit' ? 'expense' : local.type,
        description: g.counterparty ?? local.description,
        date: local.date,
    };
}

/** "Help LogIt read more banks": share masked message shapes (off by default). */
export async function getShareSamples(): Promise<boolean> {
    const { data } = await supabase.auth.getUser();
    return data.user?.user_metadata?.share_samples === true;
}

export async function setShareSamples(on: boolean): Promise<boolean> {
    const { error } = await supabase.auth.updateUser({ data: { share_samples: on } });
    return !error;
}
