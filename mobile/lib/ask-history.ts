import { supabase } from './supabase';

/**
 * Ask LogIt history (handoff §7): recent questions per user, so History can
 * re-run them against today's numbers. Question text only, never answers.
 * Kept on the account (user_metadata.ask_history), newest first, 20 at most.
 */
export interface PastQuestion { q: string; at: string }

const MAX = 20;

export async function getAskHistory(): Promise<PastQuestion[]> {
    const { data } = await supabase.auth.getUser();
    const list = data.user?.user_metadata?.ask_history;
    return Array.isArray(list) ? (list as PastQuestion[]) : [];
}

export async function addToAskHistory(q: string): Promise<void> {
    const text = q.trim();
    if (!text) return;
    const current = await getAskHistory().catch(() => []);
    const next = [{ q: text, at: new Date().toISOString() }, ...current.filter((p) => p.q.toLowerCase() !== text.toLowerCase())].slice(0, MAX);
    await supabase.auth.updateUser({ data: { ask_history: next } }).catch(() => {});
}
