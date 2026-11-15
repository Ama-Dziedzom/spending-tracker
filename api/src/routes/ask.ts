import { Router, type Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
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

const MODEL = 'claude-opus-5-5';
const MAX_TURNS = 20;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_SNAPSHOT_CHARS = 60_000;
/** Per person, per rolling hour. Keeps a stuck client or a chatty evening from running up the bill. */
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

const PERSONA = `You are LogIt, the friendly money companion inside a Ghanaian spending-tracker app. People log mobile money (MTN MoMo, Telecel Cash, AT Money) and bank alerts, and you help them understand their money and make better choices.

How you talk:
- Warm, plain and brief, like a sensible friend who is good with money. Usually 1 to 4 short sentences. Go longer only when asked to explain or plan.
- Amounts are in Ghana cedis, written "GHS 1,250". Round to whole cedis unless pennies matter.
- Plain text only. No markdown headings, bold or tables. Short "- " bullet lines are fine for lists of 3 or more.
- Lead with the answer, then the one or two numbers behind it. Offer one practical, specific suggestion when it would genuinely help, not every time.
- Be honest and kind about overspending. Never lecture or shame.
- You can chat about general money topics (budgeting, saving, susu, T-bills, emergency funds), but keep it grounded in their numbers where you can.

Rules about numbers:
- Use only the figures in the MONEY SUMMARY below. Never invent transactions, balances or income.
- "Spent" excludes moves between the person's own wallets. "Came in" is income. "Net" is came in minus spent.
- If the summary does not cover what was asked (for example an older month, or a detail not listed), say what you can see and what is missing. If income looks missing, suggest they log it or add expected income in the app.
- The current month is still in progress; say so when comparing it to full months.
- You can't change anything in the app. If they want to set a limit, log something or fix a category, tell them where to do it in the app (Limits, Paste a message, Wallets, Expected income).

Reply as JSON matching the schema: "reply" is your message; "suggestions" is 0 to 3 short follow-up questions the person might tap next, written in their voice (for example "Where can I cut back?"), each under 50 characters.`;

const REPLY_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    suggestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['reply', 'suggestions'],
  additionalProperties: false,
} as const;

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
  const snapshot = typeof req.body?.snapshot === 'string' ? req.body.snapshot.slice(0, MAX_SNAPSHOT_CHARS) : '';
  if (!turns || !snapshot) {
    res.status(400).json({ error: 'messages and snapshot are required' });
    return;
  }
  if (overLimit(userId)) {
    res.status(429).json({ error: 'Too many questions this hour. Try again a bit later.' });
    return;
  }

  try {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 8_000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
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

    if (response.stop_reason === 'refusal') {
      res.json({ reply: 'I can’t help with that one. Ask me anything about your spending, income or saving.', suggestions: [] });
      return;
    }
    const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text ?? '';
    let parsed: { reply?: unknown; suggestions?: unknown };
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { reply: text, suggestions: [] };
    }
    const reply = typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim() : 'Sorry, I lost my train of thought. Could you ask that again?';
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim()).slice(0, 3)
      : [];
    res.json({ reply, suggestions });
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
