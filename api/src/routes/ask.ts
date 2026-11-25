import { Router, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '../lib/supabase.js';
import { extractUser, type AuthenticatedRequest } from '../middleware/auth.js';

/**
 * Ask LogIt, the chat. The phone sends the conversation plus a plain-text
 * summary of the person's money that it builds on-device (totals by month,
 * categories, recent entries; no raw SMS and no phone numbers). Claude
 * answers from that summary only.
 *
 * Needs ANTHROPIC_API_KEY on the server. Without it the route answers 503 and
 * the app falls back to its on-device answers.
 */
export const askRouter = Router();

/** Switch with ASK_MODEL on Railway (claude-sonnet-5-5, claude-opus-5-5) — no code change. */
const MODEL = process.env.ASK_MODEL?.trim() || 'claude-haiku-5-5';
/** Questions per person per Accra day that reach Claude. Phone-answered ones don't count. */
const DAILY_LIMIT = Math.max(1, Number(process.env.ASK_DAILY_LIMIT) || 20);
const MAX_TURNS = 20;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_SNAPSHOT_CHARS = 60_000;
/**
 * Per person, per rolling hour, in memory. Only a short-burst guard against a
 * stuck client: it resets on every deploy/restart. The real cap is the daily
 * count in Supabase (ask_usage).
 */
const HOURLY_LIMIT = 40;

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();
  return client;
}

const recent = new Map<string, number[]>();
function overLimit(userId: string): boolean {
  const now = Date.now();
  const list = (recent.get(userId) ?? []).filter((t) => now - t < 3_600_000);
  if (list.length >= HOURLY_LIMIT) {
    recent.set(userId, list);
    return true;
  }
  list.push(now);
  recent.set(userId, list);
  return false;
}

/** USD per million tokens. Haiku is the ≤100K-input tier. */
const PRICES: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.1 },
  'claude-opus-5-5': { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
};

/** One line per Claude call. No question, summary or money data — only counts and a short hashed id. */
function logUsage(userId: string, model: string, usage: Anthropic.Beta.BetaUsage, stop: string | null) {
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const p = PRICES[model];
  const usd = p
    ? (input * p.input + output * p.output + cacheWrite * p.cacheWrite + cacheRead * p.cacheRead) / 1_000_000
    : null;
  const user = createHash('sha256').update(userId).digest('hex').slice(0, 8);
  console.log(
    `ask_usage model=${model} user=${user} stop=${stop ?? 'none'} input_tokens=${input} output_tokens=${output} ` +
      `cache_creation_input_tokens=${cacheWrite} cache_read_input_tokens=${cacheRead} ` +
      `est_usd=${usd === null ? 'unknown' : usd.toFixed(6)}`,
  );
}

/**
 * Atomically adds one to today's (Africa/Accra) count and returns the new
 * total. Returns null if the table/function isn't there yet, so a missing
 * migration fails open with a warning instead of breaking Ask.
 */
async function bumpDailyCount(userId: string): Promise<number | null> {
  const { data, error } = await supabaseAdmin.rpc('increment_ask_usage', { p_user: userId });
  if (error) {
    console.warn('Ask: daily count unavailable, skipping the cap:', error.message);
    return null;
  }
  return typeof data === 'number' ? data : Number(data);
}

const PERSONA = `You are LogIt, the friendly money companion inside an African spending-tracker app, built in Ghana. People log mobile money (MTN MoMo, Telecel Cash, M-Pesa, OPay, Orange Money and others) and bank alerts, and you help them understand their money and make better choices.

How you talk:
- Warm, plain and very brief, like a sensible friend who is good with money. The app draws your numbers as a card, so the words only carry the point.
- Amounts are in the person's currency, named on the first line of the MONEY SUMMARY. Write them with that label first, like "GHS 1,250", "NGN 45,000" or "FCFA 25,000". Round to whole units unless small amounts matter. Never convert between currencies.
- Speak to their country: local providers, prices and habits from where they live, not Ghana's unless they're in Ghana.
- Plain text only. No markdown, no bullet lists in "sentence".
- Be honest and kind about overspending. Never lecture or shame.
- You can chat about general money topics (budgeting, saving, susu, T-bills, emergency funds), but keep it grounded in their numbers where you can.

Rules about numbers:
- Use only the figures in the MONEY SUMMARY below. Never invent transactions, balances or income.
- "Spent" excludes moves between the person's own wallets. "Came in" is income. "Net" is came in minus spent.
- If the summary does not cover what was asked (for example an older month, or a detail not listed), say what you can see and what is missing. If income looks missing, suggest they log it or add expected income in the app.
- The current month is still in progress; say so when comparing it to full months.
- You can't change anything in the app. If they want to set a limit, log something or fix a category, tell them where to do it in the app (Limits, Paste a message, Wallets, Expected income).

Reply as JSON matching the schema. Pick ONE shape (these match the app's designs):
- "total": a question with one main number ("How much did I spend on food?", "How does this week compare with last week?"). Put the number in "amount" and what it is in "unit" ("spent this week", "on airtime & data"). Use "bars" for the comparison behind it: 2 to 6 periods or items, oldest first, mark the one asked about with current=true, and set "chartTitle" ("Last 3 months", "This week vs last") and "delta" ("−58%", "+GHS 60", or "").
- "verdict": a yes/no or can-I question ("Can I afford…", "Am I overspending?"). "tag" is 1 to 4 words ("Yes", "Yes, but it's tight", "Not yet"), "tagTone" success/warn/neutral. "rows" is the working, 2 to 5 lines: label plus "display" ("GHS 1,421", "− 780"); mark the final line strong=true.
- "ranking": who/what is biggest ("Who did I send most to?", "Where does my money go?"). "rows" are 2 to 6 items, biggest first: label, numeric "value", "display" ("320"), short "meta" ("3 sends"), and "category" (an app category id like food, transport, people, airtime, bills, shopping, fees, or "" for a person or place).
- "note": anything else: greetings, advice, explanations, or when the summary can't answer. Keep it to the "sentence".

"sentence" is the whole written answer: at most 2 short sentences and about 30 words. Lead with the point. Don't repeat numbers that are already in amount, bars or rows. One practical tip only when it really helps, as a short clause. For "note" you may use up to 3 sentences when they asked you to explain or plan.
Unused fields: amount 0, strings "", arrays [].
"suggestions" is 0 to 3 short follow-up questions the person might tap next, in their voice, each under 50 characters.`;
const REPLY_SCHEMA = {
  type: 'object',
  properties: {
    shape: { type: 'string', enum: ['total', 'verdict', 'ranking', 'note'] },
    sentence: { type: 'string' },
    amount: { type: 'number' },
    unit: { type: 'string' },
    tag: { type: 'string' },
    tagTone: { type: 'string', enum: ['success', 'warn', 'neutral'] },
    chartTitle: { type: 'string' },
    delta: { type: 'string' },
    bars: {
      type: 'array',
      items: {
        type: 'object',
        properties: { label: { type: 'string' }, value: { type: 'number' }, current: { type: 'boolean' } },
        required: ['label', 'value', 'current'],
        additionalProperties: false,
      },
    },
    rows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' }, value: { type: 'number' }, display: { type: 'string' },
          meta: { type: 'string' }, category: { type: 'string' }, strong: { type: 'boolean' },
        },
        required: ['label', 'value', 'display', 'meta', 'category', 'strong'],
        additionalProperties: false,
      },
    },
    suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['shape', 'sentence', 'amount', 'unit', 'tag', 'tagTone', 'chartTitle', 'delta', 'bars', 'rows', 'suggestions'],
  additionalProperties: false,
} as const;

/** The structured answer the app draws (Figma "Answer shapes" 1045:5607). */
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

const str = (v: unknown, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Validate the model's card; anything off becomes a plain note. */
function toCard(p: Record<string, unknown>): ChatCard | null {
  const sentence = str(p.sentence, 600);
  if (!sentence) return null;
  const shape = (['total', 'verdict', 'ranking', 'note'] as const).find((s) => s === p.shape) ?? 'note';
  const tagTone = (['success', 'warn', 'neutral'] as const).find((s) => s === p.tagTone) ?? 'neutral';
  const bars = Array.isArray(p.bars) ? p.bars.slice(0, 6).map((b: Record<string, unknown>) => ({ label: str(b?.label, 30), value: Math.max(0, num(b?.value)), current: b?.current === true })).filter((b) => b.label) : [];
  const rows = Array.isArray(p.rows) ? p.rows.slice(0, 6).map((r: Record<string, unknown>) => ({
    label: str(r?.label, 60), value: Math.max(0, num(r?.value)), display: str(r?.display, 30), meta: str(r?.meta, 60), category: str(r?.category, 30), strong: r?.strong === true,
  })).filter((r) => r.label) : [];
  const card: ChatCard = { shape, sentence, amount: num(p.amount), unit: str(p.unit, 60), tag: str(p.tag, 40), tagTone, chartTitle: str(p.chartTitle, 40), delta: str(p.delta, 20), bars, rows };
  // A shape without what it needs falls back to a note, so nothing renders half-empty.
  if (card.shape === 'total' && card.amount <= 0) card.shape = 'note';
  if (card.shape === 'verdict' && (!card.tag || card.rows.length === 0)) card.shape = 'note';
  if (card.shape === 'ranking' && card.rows.length < 2) card.shape = 'note';
  return card;
}

/** Plain text of a card, kept as the reply for the conversation history and Copy. */
function cardText(c: ChatCard, label: string): string {
  const parts: string[] = [];
  if (c.shape === 'total') parts.push(`${label} ${Math.round(c.amount).toLocaleString('en-US')} ${c.unit}.`.replace(/\s+\./, '.'));
  if (c.shape === 'verdict') parts.push(`${c.tag}.`);
  parts.push(c.sentence);
  if (c.shape === 'total' && c.bars.length) parts.push(c.bars.map((b) => `${b.label}: ${label} ${Math.round(b.value).toLocaleString('en-US')}`).join(', '));
  if (c.rows.length && c.shape !== 'total' && c.shape !== 'note') parts.push(c.rows.map((r) => `${r.label}: ${r.display || r.value}`).join(', '));
  return parts.join(' ');
}

interface ChatTurn { role: 'user' | 'assistant'; content: string }

function validTurns(raw: unknown): ChatTurn[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const turns = raw.slice(-MAX_TURNS);
  const out: ChatTurn[] = [];
  for (const t of turns) {
    if (!t || (t.role !== 'user' && t.role !== 'assistant') || typeof t.content !== 'string') return null;
    const content = t.content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!content) continue;
    out.push({ role: t.role, content });
  }
  // The API needs the first turn to be the person's, and we answer the last one.
  while (out.length && out[0].role !== 'user') out.shift();
  if (!out.length || out[out.length - 1].role !== 'user') return null;
  return out;
}

askRouter.post('/ask', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }
  const anthropic = getClient();
  if (!anthropic) {
    res.status(503).json({ error: 'Ask is not set up on this server' });
    return;
  }

  const turns = validTurns(req.body?.messages);
  // The person's currency label, sent by the phone ("GHS", "NGN", "FCFA"…). Only used to write replies.
  const label = typeof req.body?.currency === 'string' && /^[A-Z]{3,4}$/.test(req.body.currency) ? req.body.currency : 'GHS';
  const snapshot = typeof req.body?.snapshot === 'string' ? req.body.snapshot.slice(0, MAX_SNAPSHOT_CHARS) : '';
  if (!turns || !snapshot) {
    res.status(400).json({ error: 'messages and snapshot are required' });
    return;
  }
  if (overLimit(userId)) {
    res.status(429).json({ error: 'Too many questions this hour. Try again a bit later.' });
    return;
  }
  const today = await bumpDailyCount(userId);
  if (today !== null && today > DAILY_LIMIT) {
    res.status(429).json({
      error: `You've asked ${DAILY_LIMIT} questions today. Ask LogIt resets at midnight.`,
      code: 'daily_limit',
    });
    return;
  }

  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      // A ceiling, not a cost: you pay for tokens used. Thinking counts toward it
      // (on by default on every model), so 1,000 cut replies off mid-JSON.
      // No server-side fallback: Haiku doesn't support it, and on Sonnet/Opus it
      // could re-run a refused question on a pricier model. Refusals are handled below.
      max_tokens: 4_000,
      // Everyday chat: low effort keeps replies quick and cheap.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: REPLY_SCHEMA } },
      // Persona first (never changes), then this person's summary. The phone
      // keeps one summary per conversation, so later turns read it from cache.
      system: [
        { type: 'text', text: PERSONA },
        { type: 'text', text: `MONEY SUMMARY\n${snapshot}`, cache_control: { type: 'ephemeral' } },
      ],
      messages: turns,
    });

    logUsage(userId, MODEL, response.usage, response.stop_reason);

    if (response.stop_reason === 'refusal') {
      res.json({ reply: 'I can’t help with that one. Ask me anything about your spending, income or saving.', suggestions: [] });
      return;
    }
    const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text ?? '';
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Cut off or malformed: never show raw JSON. Keep the sentence if it got through.
      const sentence = text.match(/"sentence"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1];
      parsed = sentence
        ? { shape: 'note', sentence: JSON.parse(`"${sentence}"`) }
        : { shape: 'note', sentence: 'Sorry, I lost my train of thought. Could you ask that again?' };
    }
    const card = toCard(parsed);
    const reply = card ? cardText(card, label) : 'Sorry, I lost my train of thought. Could you ask that again?';
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim()).slice(0, 3)
      : [];
    res.json({ reply, suggestions, card });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: 'LogIt is busy right now. Try again in a moment.' });
    } else if (error instanceof Anthropic.APIError) {
      console.error(`Ask: Claude API error ${error.status}:`, error.message);
      res.status(502).json({ error: 'Couldn’t get an answer right now' });
    } else {
      console.error('Ask failed:', error);
      res.status(500).json({ error: 'Couldn’t get an answer right now' });
    }
  }
});
