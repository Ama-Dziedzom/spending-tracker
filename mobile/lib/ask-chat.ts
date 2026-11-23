import { supabase } from './supabase';
import { API_URL } from './sms-api';

/** One message in the Ask LogIt chat, as sent to the server. */
export interface ChatTurn { role: 'user' | 'assistant'; content: string }

/** The structured answer from the server (api/src/routes/ask.ts ChatCard). */
export interface ChatCard {
    shape: 'total' | 'verdict' | 'ranking' | 'note';
    sentence: string;
    amount: number;
    unit: string;
    tag: string;
    tagTone: 'success' | 'warn' | 'neutral';
    chartTitle: string;
    delta: string;
    bars: { label: string; value: number; current: boolean }[];
    rows: { label: string; value: number; display: string; meta: string; category: string; strong: boolean }[];
}

/** reply is the plain text (history, Copy); card, when present, is what's drawn. */
export interface ChatReply { reply: string; suggestions: string[]; card?: ChatCard | null }

/**
 * Why a chat reply couldn't be had. 'unavailable' means the server has no
 * chat set up (or isn't reachable in a way we can retry): use the on-device
 * answers instead. 'busy' is a short-burst rate limit with a message to show.
 * 'limit' is the daily cap: show the message as a card, no retry.
 */
export class ChatError extends Error {
    constructor(public kind: 'unavailable' | 'busy' | 'limit' | 'failed', message: string) { super(message); }
}

/**
 * Ask Claude (through our API) with the conversation so far and the money
 * summary built on this phone. Network failures throw as-is so the caller can
 * show the offline bubble.
 */
export async function askChat(messages: ChatTurn[], snapshot: string): Promise<ChatReply> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new ChatError('unavailable', 'Not signed in');
    const res = await fetch(`${API_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages, snapshot }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 503 || res.status === 404) throw new ChatError('unavailable', body.error ?? 'Chat not available');
    if (res.status === 429 && body.code === 'daily_limit') throw new ChatError('limit', body.error ?? "You've reached today's limit. Ask LogIt resets at midnight.");
    if (res.status === 429) throw new ChatError('busy', body.error ?? 'Too many questions. Try again shortly.');
    if (!res.ok || typeof body.reply !== 'string') throw new ChatError('failed', body.error ?? `ask ${res.status}`);
    return { reply: body.reply, suggestions: Array.isArray(body.suggestions) ? body.suggestions : [], card: body.card && typeof body.card === 'object' ? body.card as ChatCard : null };
}
