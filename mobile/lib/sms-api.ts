import { supabase } from './supabase';

/**
 * In-app Paste a message (Figma 1005:1279, 1005:1319). Uses the same reader
 * as autopilot: /parse-sms to preview, /process-sms to save.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://spending-tracker-api-production-cea1.up.railway.app';

export interface ReadAlert {
    sms: string;
    /** null when the reader couldn't make sense of it; saving sends it to Check. */
    parsed: {
        amount: number;
        type: 'debit' | 'credit';
        description: string;
        category: string;
        source: string;
        fee: number;
        isTransfer: boolean;
    } | null;
    /** The date written in the message, if any. */
    date: Date | null;
}

/**
 * Several alerts can be pasted at once: they're split on blank lines, or on
 * lines that start a new alert ("Payment for…", "You have received…").
 */
export function splitAlerts(text: string): string[] {
    const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const starts = /^(payment (for|made|of)|your payment|you have (received|sent|paid)|cash (out|in)|transfer|dear customer|your (account|card|visa|mastercard)|debit|credit|confirmed\.?)\b/i;
    return blocks.flatMap((block) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2 || lines.filter((l) => starts.test(l)).length < 2) return [lines.join(' ')];
        const out: string[] = [];
        for (const line of lines) {
            if (starts.test(line) || out.length === 0) out.push(line);
            else out[out.length - 1] += ` ${line}`;
        }
        return out;
    });
}

/** Preview without saving. Throws if the server can't be reached. */
export async function readAlert(sms: string): Promise<ReadAlert> {
    const res = await fetch(`${API_URL}/parse-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawSms: sms }),
    });
    if (!res.ok) throw new Error(`parse-sms ${res.status}`);
    const body = await res.json();
    if (!body.parsed || !body.transaction) return { sms, parsed: null, date: null };
    const t = body.transaction;
    return {
        sms,
        parsed: {
            amount: Number(t.amount),
            type: t.type,
            description: t.description,
            category: t.category ?? 'other',
            source: t.source ?? '',
            fee: Number(t.fee) || 0,
            isTransfer: !!t.is_transfer,
        },
        date: body.smsDate ? new Date(body.smsDate) : null,
    };
}

export type SaveOutcome = 'logged' | 'duplicate' | 'check' | 'failed';

/** Save one alert exactly as autopilot would. Unreadable ones go to Check. */
export async function saveAlert(sms: string): Promise<SaveOutcome> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 'failed';
    try {
        const res = await fetch(`${API_URL}/process-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ rawSms: sms }),
        });
        if (res.status === 400) return 'check';
        if (!res.ok) return 'failed';
        const body = await res.json();
        return body.duplicate ? 'duplicate' : 'logged';
    } catch {
        return 'failed';
    }
}

/** "MTN_MoMo" → "MTN MoMo", "Vodafone_Cash" → "Telecel Cash". */
export function sourceLabel(source: string): string {
    const s = source.toLowerCase();
    if (s.includes('mtn')) return 'MTN MoMo';
    if (s.includes('vodafone') || s.includes('telecel')) return 'Telecel Cash';
    if (s.includes('airteltigo') || s === 'at_money') return 'AT Money';
    if (s.includes('stanchart')) return 'Standard Chartered';
    return source.replace(/_/g, ' ');
}

/** "TROTRO SERVICES" → "Trotro services"; mixed case is left alone. */
export function sentenceCase(s: string): string {
    if (s !== s.toUpperCase()) return s;
    const lower = s.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}
