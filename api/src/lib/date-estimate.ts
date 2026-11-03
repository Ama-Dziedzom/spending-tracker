/**
 * Estimating when an undated SMS happened from the provider's transaction ID.
 *
 * MTN MoMo numbers every transaction from one shared counter (≈880 IDs per
 * second in Nov 2026), so an ID sits between the IDs of messages whose dates
 * we know. Every dated MTN message any user logs is kept as an "anchor"
 * (only the ID and the time, nothing personal), and undated ones are placed
 * on that timeline.
 */
import { supabaseAdmin } from './supabase.js';

/** Sources whose IDs come from one ordered counter. */
const COUNTER_SOURCES = new Set(['MTN_MoMo']);
const FALLBACK_RATE = 880; // IDs per second, measured 2–3 Nov 2026
const MAX_EXTRAPOLATE_MS = 30 * 24 * 60 * 60 * 1000;

interface Anchor { txn_id: number; occurred_at: string }

export async function recordAnchor(source: string, txnId: string | null, at: Date): Promise<void> {
  if (!txnId || !COUNTER_SOURCES.has(source)) return;
  const { error } = await supabaseAdmin
    .from('sms_id_anchors')
    .upsert({ source, txn_id: Number(txnId), occurred_at: at.toISOString() }, { onConflict: 'source,txn_id' });
  if (error) console.error('Anchor save failed (has the capture migration run?):', error.message);
}

async function nearest(source: string, id: number, dir: 'before' | 'after'): Promise<Anchor | null> {
  const q = supabaseAdmin.from('sms_id_anchors').select('txn_id, occurred_at').eq('source', source);
  const { data, error } = await (dir === 'before'
    ? q.lte('txn_id', id).order('txn_id', { ascending: false })
    : q.gte('txn_id', id).order('txn_id', { ascending: true })
  ).limit(1);
  if (error) return null;
  return (data?.[0] as Anchor | undefined) ?? null;
}

/** IDs per second from the newest anchor and one at least an hour older. */
async function recentRate(source: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('sms_id_anchors')
    .select('txn_id, occurred_at')
    .eq('source', source)
    .order('txn_id', { ascending: false })
    .limit(200);
  const list = (data ?? []) as Anchor[];
  if (list.length < 2) return FALLBACK_RATE;
  const newest = list[0];
  const t0 = new Date(newest.occurred_at).getTime();
  const older = list.find((a) => t0 - new Date(a.occurred_at).getTime() > 60 * 60 * 1000);
  if (!older) return FALLBACK_RATE;
  const rate = (newest.txn_id - older.txn_id) / ((t0 - new Date(older.occurred_at).getTime()) / 1000);
  return rate > 0 ? rate : FALLBACK_RATE;
}

export async function estimateDateFromId(source: string, txnId: string | null, now: Date = new Date()): Promise<Date | null> {
  if (!txnId || !COUNTER_SOURCES.has(source)) return null;
  const id = Number(txnId);
  if (!Number.isFinite(id)) return null;

  const [before, after] = await Promise.all([nearest(source, id, 'before'), nearest(source, id, 'after')]);
  let ms: number | null = null;

  if (before && after && after.txn_id !== before.txn_id) {
    const t1 = new Date(before.occurred_at).getTime();
    const t2 = new Date(after.occurred_at).getTime();
    ms = t1 + ((id - before.txn_id) / (after.txn_id - before.txn_id)) * (t2 - t1);
  } else if (before || after) {
    const a = (before ?? after)!;
    const rate = await recentRate(source);
    const offset = ((id - a.txn_id) / rate) * 1000;
    if (Math.abs(offset) > MAX_EXTRAPOLATE_MS) return null;
    ms = new Date(a.occurred_at).getTime() + offset;
  }

  if (ms === null || !Number.isFinite(ms)) return null;
  return new Date(Math.min(ms, now.getTime()));
}
