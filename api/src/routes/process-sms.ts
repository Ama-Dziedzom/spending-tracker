/**
 * POST /api/process-sms
 *
 * Full SMS processing pipeline:
 *   1. Authenticate (JWT, or shortcut secret)
 *   2. Parse SMS via parseSms() (direct call, no HTTP)
 *   3. Skip exact duplicates (same SMS already logged by this user)
 *   4. Route to the user's wallet for that provider (create it if missing)
 *   5. Insert transaction (wallet_id, balance_snapshot, transaction_date from the SMS)
 *   6. Update the wallet balance — only if this SMS is not older than the
 *      latest balance we already have for that wallet
 *   7. Match pending transfers (this user's only)
 *   8. Record failed parses
 */

import { Router, type Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { parseSms } from './parse-sms.js';
import { PROVIDERS, extractSmsDate } from '../lib/sms-helpers.js';
import { recordAnchor, estimateDateFromId } from '../lib/date-estimate.js';
import { extractUser, type AuthenticatedRequest } from '../middleware/auth.js';
import { readUnknownSms, maskSms, shapeOf } from '../lib/fallback-reader.js';

export const processSmsRouter = Router();

interface ParsedTx {
  amount: number;
  type: 'debit' | 'credit';
  source: string;
  description: string;
  balance: number | null;
  category: string;
  is_transfer: boolean;
  transfer_type: string | null;
  fee: number;
  provider_txn_id: string | null;
  affects_balance: boolean;
}

/**
 * The phone's "message arrived at" time (ISO string or epoch ms). Ignored if
 * it is in the future (clock skew beyond 5 min) or older than 60 days.
 */
function parseReceivedAt(value: unknown, now: Date): Date | null {
  if (value === undefined || value === null || value === '') return null;
  const d = typeof value === 'number' ? new Date(value) : typeof value === 'string' ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  if (d.getTime() > now.getTime() + 5 * 60 * 1000) return null;
  if (now.getTime() - d.getTime() > 60 * 24 * 60 * 60 * 1000) return null;
  return d.getTime() > now.getTime() ? now : d;
}

/** An undated message is treated as late when its estimated time is this far before now. */
const LATE_SHARE_MS = 2 * 60 * 60 * 1000;

/**
 * "Help LogIt read more banks" (off unless the user turns it on in
 * Settings): keep a masked template of an alert no pattern could read, so a
 * new pattern can be written for everyone. Only placeholders are stored —
 * never amounts, names, numbers or dates. Never blocks or fails logging.
 */
async function shareMaskedSample(userId: string, rawSms: string, guess: ReturnType<typeof readUnknownSms>): Promise<void> {
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (data.user?.user_metadata?.share_samples !== true) return;
    const template = maskSms(rawSms);
    const shape = shapeOf(template);
    const { data: existing } = await supabaseAdmin
      .from('pattern_samples')
      .select('id, seen_count')
      .eq('user_id', userId)
      .eq('shape', shape)
      .limit(1);
    if (existing && existing.length) {
      await supabaseAdmin
        .from('pattern_samples')
        .update({ seen_count: existing[0].seen_count + 1, last_seen: new Date().toISOString() })
        .eq('id', existing[0].id);
    } else {
      // The guess is kept without its numbers: just which parts were found
      const found = {
        amount: guess.amount !== null, balance: guess.balance !== null, direction: guess.direction,
        counterparty: guess.counterparty !== null, reference: guess.reference !== null, confidence: guess.confidence,
      };
      await supabaseAdmin.from('pattern_samples').insert({ user_id: userId, shape, template, provider_guess: guess.provider, guess: found });
    }
  } catch (e) {
    console.warn('pattern sample not saved:', e instanceof Error ? e.message : e);
  }
}

async function userFullName(userId: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    const name = data.user?.user_metadata?.full_name;
    return typeof name === 'string' && name.trim() ? name.trim() : null;
  } catch {
    return null;
  }
}

/**
 * True when the counterparty is the user themself (moving money between their
 * own accounts), e.g. "Payment received … from Ama Dziedzom Barnor". Needs at
 * least two parts of their name in the payee/payer text.
 */
export function isOwnName(description: string, fullName: string | null): boolean {
  if (!fullName) return false;
  const parts = fullName.toLowerCase().split(/\s+/).filter((p) => p.length >= 3);
  if (parts.length < 2) return false;
  const words = new Set(description.toLowerCase().split(/[^a-z']+/).filter(Boolean));
  return parts.filter((p) => words.has(p)).length >= 2;
}

interface WalletRef {
  id: string;
  name: string;
  created: boolean;
}

/** False for one-time codes and messages that mention no amount of money. */
function looksLikeMoneyMessage(sms: string): boolean {
  const text = sms.toLowerCase();
  if (/\b(otp|one[- ]time (pass(word|code)|pin)|verification code|security code|your code is|do not share (this|your) (code|pin))\b/.test(text)) {
    return false;
  }
  return /(ghs|gh₵|ghc|ghana cedis|¢)\s?[\d,]+(\.\d+)?/.test(text) || /[\d,]+(\.\d+)?\s?(ghs|ghana cedis)/.test(text);
}

/**
 * True when the text reads like an alert from a bank or MoMo provider, not a
 * chat message that happens to mention money ("send me GHS 50"). Used because
 * the iOS automation no longer filters by sender: any message containing
 * "GHS" reaches us. Alerts carry machine phrasing (balances, transaction IDs,
 * card/account endings, fees) that people rarely type to each other.
 */
export function looksLikeProviderAlert(sms: string): boolean {
  const t = sms.toLowerCase().replace(/\s+/g, ' ');
  const signals: RegExp[] = [
    /\b(current|new|available|ledger|closing|actual) balance\b/,
    /\bbal(ance)?\s*(is|:)?\s*(now\s*)?(ghs|gh₵|ghc)\s?[\d,]/,
    /\b(financial )?trans(action)?\.? ?(id|no|number|ref)\b/,
    /\btxn\b|\bref(erence)? ?(no|number)?\s*:\s*\w/,
    /\b(card|acc(ount)?|a\/c) (ending|no\.?|number)\b/,
    /\bhas been (credited|debited|repaid|reversed|completed)\b/,
    /\b(was|were) (credited|debited)\b/,
    /\b(cash[- ]out|cash withdrawal|atm withdrawal) (made|of|for)\b/,
    /\bpayment (received|made) for\b/,
    /\byour payment of\b/,
    /\b(fee charged|transaction fee|e-?levy|fee was)\b/,
    /\bthank you for using\b/,
  ];
  return signals.some((r) => r.test(t));
}

/** First 60 chars for logs, with long digit runs masked (phones, accounts). */
function previewSms(sms: string): string {
  return sms.slice(0, 60).replace(/\d{5,}/g, (m) => '•'.repeat(m.length)).replace(/\s+/g, ' ');
}

/**
 * iOS Shortcuts can hand over a shared message as formatted text (HTML or RTF)
 * instead of plain text, e.g. "GHS&nbsp;5.00". Reduce it to the plain message.
 */
export function toPlainSms(input: string): string {
  let t = input;
  if (/^\s*\{\\rtf/.test(t)) {
    t = t
      .replace(/\\'([0-9a-f]{2})/gi, (_m, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\u(-?\d+)\??/g, (_m, n) => String.fromCharCode((Number(n) + 65536) % 65536))
      .replace(/\{\\(\*|fonttbl|colortbl|stylesheet|info)[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, '')
      .replace(/\\(par|line)\b ?/g, '\n')
      .replace(/\\[a-z]+-?\d* ?/gi, '')
      .replace(/[{}]/g, '');
  }
  if (/<[a-z!/][^>]*>/i.test(t) || /&(#\d+|#x[0-9a-f]+|[a-z]+);/i.test(t)) {
    t = t
      .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>|<\/(p|div)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCharCode(parseInt(h, 16)));
  }
  // Unicode spaces and invisible characters → plain spaces. Plain messages
  // are otherwise left exactly as sent, so duplicate detection still matches
  // copies saved before this existed.
  t = t.replace(/[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g, ' ').replace(/[\u200b\ufeff]/g, '');
  if (t !== input) t = t.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

/**
 * Data, bundles or calls paid for with airtime (MTN, Telecel, AT network
 * messages). The money was already counted when the airtime was bought, so
 * these are not logged. Purchases paid from MoMo carry wallet markers
 * (transaction ID, "Mobile Money", wallet balance) and are not caught here.
 */
export function isPaidWithAirtime(sms: string): boolean {
  const t = sms.toLowerCase();
  const isBundle = /\b(bundle|data|internet|\d+(\.\d+)?\s?(mb|gb)|minutes|mins|sms pack|kokrokoo|zone|social)\b/.test(t);
  const fromAirtime = /\b(airtime|main (account|balance)|credit balance|deducted from your (airtime|account balance))\b/.test(t);
  const fromWallet = /(mobile ?money|\bmomo\b|financial transaction|transaction id|wallet|cash out|payment received)/.test(t);
  return isBundle && fromAirtime && !fromWallet;
}

function isShortcutRequest(req: AuthenticatedRequest): boolean {
  return !!(req.body?.secret || req.body?.['x-shortcut-secret'] || req.headers?.['x-shortcut-secret']);
}

function wantsPlainText(req: AuthenticatedRequest): boolean {
  return req.query.format !== 'json' && isShortcutRequest(req);
}

/**
 * Find the wallet this SMS belongs to.
 * 1. An explicit accountId (wallet id) owned by the user, if one was sent.
 * 2. A wallet whose source_identifier matches the provider (mtn / telecel / at / stanchart …).
 * 3. A wallet of the same type whose name looks like the provider (tags it for next time).
 * 4. Otherwise create the wallet, seeded from the balance in the SMS.
 */
async function resolveWallet(userId: string, accountId: string | undefined, tx: ParsedTx): Promise<WalletRef | null> {
  const provider = PROVIDERS[tx.source];

  // An explicit wallet (the Share Extension's default) only wins when it can
  // belong to the sender: a Standard Chartered alert must not land in MoMo.
  if (accountId) {
    const { data } = await supabaseAdmin
      .from('wallets')
      .select('id, name, type, source_identifier')
      .eq('id', accountId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    const fits =
      !!data &&
      (!provider ||
        (data.type === provider.type &&
          (!data.source_identifier || data.source_identifier.toLowerCase() === provider.identifier)));
    if (data && fits) return { id: data.id, name: data.name, created: false };
  }

  if (!provider) return null;

  const { data: wallets, error } = await supabaseAdmin
    .from('wallets')
    .select('id, name, type, source_identifier')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('type', provider.type);
  if (error) {
    console.error('Wallet lookup failed:', error.message);
    return null;
  }

  const list = wallets ?? [];
  const byIdentifier = list.find((w) => (w.source_identifier ?? '').toLowerCase() === provider.identifier);
  if (byIdentifier) return { id: byIdentifier.id, name: byIdentifier.name, created: false };

  const byName = list.find(
    (w) => !w.source_identifier && provider.nameHints.some((h) => (w.name ?? '').toLowerCase().includes(h)),
  );
  if (byName) {
    await supabaseAdmin.from('wallets').update({ source_identifier: provider.identifier }).eq('id', byName.id);
    return { id: byName.id, name: byName.name, created: false };
  }

  // Create it. Seed the opening balance so that "opening ± this transaction = balance in SMS".
  const opening =
    tx.balance !== null && tx.balance !== undefined
      ? tx.type === 'debit'
        ? tx.balance + tx.amount
        : tx.balance - tx.amount
      : 0;

  const { data: created, error: createError } = await supabaseAdmin
    .from('wallets')
    .insert({
      user_id: userId,
      name: provider.name,
      type: provider.type,
      icon: '💰',
      color: provider.color,
      initial_balance: opening,
      current_balance: opening,
      source_identifier: provider.identifier,
      is_active: true,
    })
    .select('id, name')
    .single();

  if (createError || !created) {
    console.error('Wallet auto-create failed:', createError?.message);
    return null;
  }
  console.log(`🆕 Created wallet "${created.name}" for user ${userId}`);
  return { id: created.id, name: created.name, created: true };
}

/**
 * True when the wallet already has a balance from a message newer than this one,
 * meaning this (older, late-shared) SMS is already reflected in the balance.
 */
async function hasNewerSnapshot(walletId: string, smsDate: Date, excludeTxId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('transactions')
    .select('transaction_date')
    .eq('wallet_id', walletId)
    .not('balance_snapshot', 'is', null)
    .neq('id', excludeTxId)
    .order('transaction_date', { ascending: false })
    .limit(1);
  const latest = data?.[0]?.transaction_date;
  return !!latest && new Date(latest).getTime() > smsDate.getTime();
}

/**
 * Update a wallet's balance for this SMS: use the balance in the SMS when there
 * is one, otherwise adjust by the amount. Skipped when the wallet already has a
 * balance from a newer message (this older one is already reflected in it).
 */
/**
 * Merchant key for category rules: the description up to the first comma,
 * lower-cased. Must match merchantKey() in mobile/lib/category-rules.ts.
 */
export function merchantKey(description: string): string {
  return (description.split(',')[0] ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** The user's saved category for this merchant, if any. Never throws. */
async function ruleCategory(userId: string, description: string): Promise<string | null> {
  const key = merchantKey(description);
  if (!key) return null;
  const { data, error } = await supabaseAdmin
    .from('category_rules')
    .select('category')
    .eq('user_id', userId)
    .eq('merchant', key)
    .maybeSingle();
  if (error) {
    // Most likely the category_rules migration hasn't run yet.
    console.error('category_rules lookup failed:', error.message);
    return null;
  }
  return data?.category ?? null;
}

/**
 * Near limit (Figma 1044:5289): one warning when this week's spending in a
 * category first crosses its warn level, never repeated in that week
 * (limits.last_warned_week). Returns the two notification lines, or null.
 * Amber, not red, and no shame: says what's left and per day.
 */
async function limitWarning(userId: string, category: string | null | undefined, now = new Date()): Promise<string | null> {
  if (!category) return null;
  const { data: limit, error } = await supabaseAdmin
    .from('limits')
    .select('id, amount, reset_day, warn_at, last_warned_week')
    .eq('user_id', userId)
    .eq('category', category)
    .maybeSingle();
  if (error || !limit || limit.warn_at === null) return null;

  // Start of this limit week (reset_day: 1 = Monday … 7 = Sunday).
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const iso = ((today.getUTCDay() + 6) % 7) + 1;
  const start = new Date(today.getTime() - ((iso - limit.reset_day + 7) % 7) * 86_400_000);
  const weekKey = start.toISOString().slice(0, 10);
  if (limit.last_warned_week === weekKey) return null;

  const { data: rows } = await supabaseAdmin
    .from('transactions')
    .select('amount, is_transfer')
    .eq('user_id', userId)
    .eq('category', category)
    .in('type', ['debit', 'expense'])
    .gte('transaction_date', start.toISOString());
  const spent = (rows ?? []).filter((r) => !r.is_transfer).reduce((s, r) => s + Number(r.amount), 0);
  const amount = Number(limit.amount);
  if (spent < amount * Number(limit.warn_at)) return null;

  await supabaseAdmin.from('limits').update({ last_warned_week: weekKey }).eq('id', limit.id);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const resets = days[limit.reset_day - 1];
  const name = category === 'airtime' ? 'Airtime & data' : category.charAt(0).toUpperCase() + category.slice(1);
  const whole = (n: number) => Math.round(n).toLocaleString('en-US');
  const daysLeft = Math.max(1, 7 - Math.round((today.getTime() - start.getTime()) / 86_400_000));
  if (spent > amount) return `${name}: GHS ${whole(spent)} of ${whole(amount)}\nGHS ${whole(spent - amount)} over. It happens; it resets ${resets}.`;
  const left = amount - spent;
  return `${name}: GHS ${whole(spent)} of ${whole(amount)}\nGHS ${whole(left)} left until ${resets}. That’s about GHS ${whole(left / daysLeft)} a day.`;
}

async function applyBalance(walletId: string, tx: ParsedTx, smsDate: Date | null, txId: string): Promise<boolean> {
  if (smsDate && (await hasNewerSnapshot(walletId, smsDate, txId))) {
    console.log(`⏪ Older SMS for wallet ${walletId}: balance already reflects it, not changed`);
    return false;
  }

  if (tx.balance !== null && tx.balance !== undefined) {
    const { error } = await supabaseAdmin
      .from('wallets')
      .update({ current_balance: tx.balance, updated_at: new Date().toISOString() })
      .eq('id', walletId);
    if (error) console.error('Wallet snapshot update failed:', error.message);
    return !error;
  }

  const { data: w } = await supabaseAdmin.from('wallets').select('current_balance').eq('id', walletId).single();
  if (!w) return false;
  const current = Number(w.current_balance) || 0;
  const next = tx.type === 'debit' ? current - tx.amount - (tx.fee || 0) : current + tx.amount;
  const { error } = await supabaseAdmin
    .from('wallets')
    .update({ current_balance: next, updated_at: new Date().toISOString() })
    .eq('id', walletId);
  return !error;
}

processSmsRouter.post(
  '/process-sms',
  extractUser,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { rawSms: rawInput, accountId, receivedAt: receivedAtInput } = req.body as { rawSms?: unknown; accountId?: string; receivedAt?: unknown };
      const rawSms = typeof rawInput === 'string' ? toPlainSms(rawInput) : rawInput;
      const userId = req.userId!;

      if (typeof rawSms !== 'string' || rawSms.trim().length === 0) {
        res.status(400).json({ error: 'rawSms is required' });
        return;
      }

      // ── Step 0a: Autopilot test (onboarding, Figma 1001:281) ────────────
      // "LogIt test: GHS 1.00" proves autopilot works. It never counts toward
      // spending and never shows in Check: it's recorded as an already
      // dismissed failed_parses row the app watches for.
      if (/^\s*logit test\b/i.test(rawSms)) {
        const { error: testError } = await supabaseAdmin.from('failed_parses').insert({
          user_id: userId,
          raw_sms: rawSms,
          reason: 'autopilot_test',
          status: 'dismissed',
        });
        if (testError) console.error('autopilot test not recorded:', testError.message);
        console.log(`🧪 Autopilot test received user=${userId}`);
        if (wantsPlainText(req)) {
          res.type('text/plain').send('✅ Autopilot works\nTests never count toward your spending.');
          return;
        }
        res.json({ success: true, test: true });
        return;
      }

      // ── Step 0: Ignore things that aren't money movements ───────────────
      // One-time codes and messages with no amount never belong in LogIt —
      // not as transactions, not in "Needs review". Applies to every route
      // (Shortcut, iOS share sheet, Android receiver).
      if (!looksLikeMoneyMessage(rawSms)) {
        console.log(`ℹ️ Skipped (no amount/OTP) user=${userId} len=${rawSms.length} preview="${previewSms(rawSms)}"`);
        if (wantsPlainText(req)) {
          res.type('text/plain').send(`ℹ️ Skipped\nThis doesn't look like a transaction, so LogIt ignored it.`);
          return;
        }
        res.json({ success: true, ignored: true, reason: 'not_a_transaction' });
        return;
      }

      // Bundles bought with airtime: already counted when the airtime was bought
      if (isPaidWithAirtime(rawSms)) {
        console.log(`ℹ️ Skipped (paid with airtime) user=${userId} preview="${previewSms(rawSms)}"`);
        if (wantsPlainText(req)) {
          res.type('text/plain').send(`ℹ️ Paid with airtime\nAlready counted when you bought the airtime, so LogIt left it.`);
          return;
        }
        res.json({ success: true, ignored: true, reason: 'paid_with_airtime' });
        return;
      }

      // ── Step 1: Parse SMS ───────────────────────────────────────────────
      const parseResult = await parseSms(rawSms);

      if (!parseResult.parsed && !looksLikeProviderAlert(rawSms)) {
        console.log(`ℹ️ Skipped (not an alert) user=${userId} len=${rawSms.length} preview="${previewSms(rawSms)}"`);
        // A chat message that mentions money ("send me GHS 50"). Not ours to
        // log, and not worth a spot in "Needs review".
        if (wantsPlainText(req)) {
          res.type('text/plain').send(`ℹ️ Skipped\nThis doesn't look like a bank or MoMo alert, so LogIt ignored it.`);
          return;
        }
        res.json({ success: true, ignored: true, reason: 'not_a_provider_alert' });
        return;
      }

      if (!parseResult.parsed) {
        // Record the failure (once per message) so it shows in the user's
        // "Needs review" list and the team can improve patterns.
        const { data: alreadyFailed } = await supabaseAdmin
          .from('failed_parses')
          .select('id, status')
          .eq('user_id', userId)
          .eq('raw_sms', rawSms)
          .limit(1);
        // Best guess at what an unfamiliar alert says; pre-fills the Check card
        const guess = readUnknownSms(rawSms);
        if (!alreadyFailed || alreadyFailed.length === 0) {
          const failRow = {
            user_id: userId,
            raw_sms: rawSms,
            reason: parseResult.reason ?? 'no_pattern_matched',
          };
          let { error: failInsertError } = await supabaseAdmin.from('failed_parses').insert({ ...failRow, guess });
          // Before the unknown_senders migration runs there's no guess column
          if (failInsertError && /guess/i.test(failInsertError.message)) {
            ({ error: failInsertError } = await supabaseAdmin.from('failed_parses').insert(failRow));
          }
          if (failInsertError) console.error('failed_parses insert failed:', failInsertError.message);
        } else if (alreadyFailed[0].status && alreadyFailed[0].status !== 'pending') {
          // Shared again after being dismissed/resolved: put it back in "Needs review"
          await supabaseAdmin
            .from('failed_parses')
            .update({ status: 'pending', resolved_at: null, created_at: new Date().toISOString() })
            .eq('id', alreadyFailed[0].id);
        }
        await shareMaskedSample(userId, rawSms, guess);
        console.log(`⚠️ Unparsed SMS saved to Needs review for user ${userId} len=${rawSms.length} preview="${previewSms(rawSms)}"`);

        if (wantsPlainText(req)) {
          res.type('text/plain').status(400).send(`⚠️ Couldn't read this one\nIt's in Needs review in LogIt, where you can add it in a few taps.`);
          return;
        }
        res.status(400).json({ error: 'Could not parse SMS', rawSms });
        return;
      }

      const transaction = parseResult.transaction as ParsedTx;

      // ── Step 2: Duplicates ──────────────────────────────────────────────
      // Same SMS already saved for this user. If it was saved before wallet
      // routing existed (wallet_id is null), finish the job now: attach it to
      // the right wallet and update the balance. Otherwise just report it.
      const { data: existing } = await supabaseAdmin
        .from('transactions')
        .select('id, wallet_id, created_at, transaction_date')
        .eq('user_id', userId)
        .eq('raw_sms', rawSms)
        .order('created_at', { ascending: true })
        .limit(1);

      if (existing && existing.length > 0) {
        const prev = existing[0];
        let linkedWallet: WalletRef | null = null;
        let existingWalletName: string | null = null;

        if (!prev.wallet_id) {
          linkedWallet = await resolveWallet(userId, accountId, transaction);
          if (linkedWallet) {
            const smsDate = extractSmsDate(rawSms);
            await supabaseAdmin
              .from('transactions')
              .update({
                wallet_id: linkedWallet.id,
                balance_snapshot: transaction.balance ?? null,
                ...(smsDate ? { transaction_date: smsDate.toISOString() } : {}),
              })
              .eq('id', prev.id);
            if (transaction.affects_balance) await applyBalance(linkedWallet.id, transaction, smsDate, prev.id);
          }
        } else {
          const { data: w } = await supabaseAdmin.from('wallets').select('name').eq('id', prev.wallet_id).maybeSingle();
          existingWalletName = w?.name ?? null;
        }

        const loggedOn = new Date(prev.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

        if (wantsPlainText(req)) {
          const text = linkedWallet
            ? `✅ Linked to ${linkedWallet.name}${linkedWallet.created ? ' (new)' : ''}\nThis message was logged on ${loggedOn} but wasn't in a wallet. It is now.`
            : `ℹ️ Already logged\nSaved on ${loggedOn}${existingWalletName ? ` in ${existingWalletName}` : ' (not linked to a wallet)'}.`;
          res.type('text/plain').send(text);
          return;
        }
        res.json({
          success: true,
          duplicate: true,
          linkedNow: !!linkedWallet,
          data: { ...prev, wallet_id: linkedWallet?.id ?? prev.wallet_id },
          walletId: linkedWallet?.id ?? prev.wallet_id ?? null,
          walletName: linkedWallet?.name ?? existingWalletName,
          loggedOn: prev.created_at,
        });
        return;
      }

      // ── Step 3: Own accounts, wallet and date ───────────────────────────
      // Money moved between the user's own accounts is a transfer, not income
      // or spending.
      if (!transaction.is_transfer && isOwnName(transaction.description, await userFullName(userId))) {
        transaction.is_transfer = true;
        transaction.transfer_type = transaction.type === 'credit' ? 'transfer_in' : 'transfer_out';
        transaction.category = 'transfer';
      }

      // The user's own rule ("Always use this for Shoprite") beats the guess.
      if (!transaction.is_transfer) {
        const ruled = await ruleCategory(userId, transaction.description);
        if (ruled) transaction.category = ruled;
      }

      const wallet = await resolveWallet(userId, accountId, transaction);

      // When it happened: the date in the SMS, else an estimate from the
      // provider's transaction ID (only used when the message is clearly
      // being logged late), else now.
      const now = new Date();
      const smsDate = extractSmsDate(rawSms, now);
      // When the phone got the message, sent by the iOS automation and the
      // Android receiver (also kept for alerts queued offline). It's exact,
      // so a live alert is never re-dated by the ID estimate below.
      const receivedAt = parseReceivedAt(receivedAtInput, now);
      let txDate: Date = smsDate ?? receivedAt ?? now;
      let dateSource: 'sms' | 'estimated' | 'received' = smsDate ? 'sms' : 'received';
      if (smsDate) {
        await recordAnchor(transaction.source, transaction.provider_txn_id, smsDate);
      } else if (receivedAt) {
        // Exact arrival time from the phone: nothing to estimate. (Not saved
        // as an anchor: undated alerts may use a different ID series.)
      } else {
        const estimate = await estimateDateFromId(transaction.source, transaction.provider_txn_id, now);
        if (estimate && now.getTime() - estimate.getTime() > LATE_SHARE_MS) {
          txDate = estimate;
          dateSource = 'estimated';
        }
      }
      const knownDate = dateSource === 'received' && !receivedAt ? null : txDate;

      // ── Step 4: Insert transaction (+ a separate row for any fee) ───────
      const { fee, provider_txn_id: providerTxnId, affects_balance: affectsBalance, ...txFields } = transaction;
      const { data, error: insertError } = await supabaseAdmin
        .from('transactions')
        .insert({
          ...txFields,
          raw_sms: rawSms,
          user_id: userId,
          wallet_id: wallet?.id ?? null,
          balance_snapshot: transaction.balance ?? null,
          transaction_date: txDate.toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Database error: ${insertError.message}`);
      }

      // Columns added by the capture migration; written separately so the API
      // keeps working if the migration hasn't run yet.
      const { error: extraError } = await supabaseAdmin
        .from('transactions')
        .update({ date_source: dateSource, provider_txn_id: providerTxnId })
        .eq('id', data.id);
      if (extraError) console.error('date_source/provider_txn_id not saved (run the capture migration):', extraError.message);

      if (fee > 0) {
        const { error: feeError } = await supabaseAdmin.from('transactions').insert({
          user_id: userId,
          wallet_id: wallet?.id ?? null,
          amount: fee,
          type: 'debit',
          category: 'fees',
          description: `Fee · ${transaction.description}`.trim(),
          source: transaction.source,
          is_transfer: false,
          transaction_date: txDate.toISOString(),
        });
        if (feeError) console.error('Fee row insert failed:', feeError.message);
      }

      // This message may have been waiting in "Needs review"
      await supabaseAdmin
        .from('failed_parses')
        .update({ status: 'resolved', resolved_transaction_id: data.id, resolved_at: now.toISOString() })
        .eq('user_id', userId)
        .eq('raw_sms', rawSms)
        .eq('status', 'pending');

      // ── Step 5: Update wallet balance ───────────────────────────────────
      const balanceApplied = wallet && affectsBalance ? await applyBalance(wallet.id, transaction, knownDate, data.id) : false;

      // ── Step 6: Transfer matching (this user's pending transfers only) ──
      let transferSuggestions: unknown[] = [];
      if (transaction.is_transfer) {
        const { data: pendingTransfers, error: transferError } = await supabaseAdmin
          .from('transfers')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'pending');

        if (!transferError && pendingTransfers) {
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          transferSuggestions = pendingTransfers.filter((transfer: { amount: number; created_at: string }) => {
            const amountDiff = Math.abs(transfer.amount - transaction.amount);
            const isRecent = transfer.created_at >= oneDayAgo;
            return amountDiff < 5 && isRecent;
          });
        }
      }

      // ── Near a weekly limit? (one warning a week) ───────────────────────
      let warning: string | null = null;
      if (transaction.type === 'debit' && !transaction.is_transfer) {
        warning = await limitWarning(userId, transaction.category).catch((e) => {
          console.error('limit check failed:', e instanceof Error ? e.message : e);
          return null;
        });
      }

      // ── Response ────────────────────────────────────────────────────────
      if (wantsPlainText(req)) {
        const typeEmoji = transaction.type === 'debit' ? '💸' : '💰';
        const typeStr = transaction.type === 'debit' ? 'Debit' : 'Credit';
        // The Shortcut shows this text as LogIt's notification; a limit warning leads.
        let textResponse = warning ? `${warning}\n\n✅ Transaction Logged!\n` : `✅ Transaction Logged!\n`;
        textResponse += `${typeEmoji} Amount: GHS ${transaction.amount.toFixed(2)} (${typeStr})\n`;
        textResponse += `👛 Wallet: ${wallet ? wallet.name + (wallet.created ? ' (new)' : '') : 'Not linked'}\n`;
        textResponse += `🏷️ Category: ${transaction.category}\n`;
        textResponse += `💬 Desc: ${transaction.description}`;
        if (transaction.fee > 0) textResponse += `\n🧾 Fee: GHS ${transaction.fee.toFixed(2)}`;
        if (dateSource === 'estimated') {
          textResponse += `\n🕒 Date: about ${txDate.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} (estimated)`;
        }
        if (transaction.balance !== null && transaction.balance !== undefined) {
          textResponse += `\n💰 Balance: GHS ${transaction.balance.toFixed(2)}`;
        }
        if (transaction.is_transfer && transaction.transfer_type) {
          textResponse += `\n🔄 Transfer: ${transaction.transfer_type}`;
        }
        res.type('text/plain').send(textResponse);
        return;
      }

      res.json({
        success: true,
        duplicate: false,
        data,
        walletId: wallet?.id ?? null,
        walletName: wallet?.name ?? null,
        walletCreated: wallet?.created ?? false,
        balanceApplied,
        isTransfer: transaction.is_transfer,
        transferType: transaction.transfer_type,
        transferSuggestions: transferSuggestions.length > 0 ? transferSuggestions : null,
        snapshotUsed: transaction.balance !== null,
        balanceAfter: transaction.balance,
        fee: transaction.fee,
        transactionDate: txDate.toISOString(),
        dateSource,
        limitWarning: warning,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('process-sms error:', message);

      if (wantsPlainText(req)) {
        res.type('text/plain').status(500).send(`⛔ Error Processing SMS\n${message}`);
        return;
      }
      res.status(500).json({ error: message });
    }
  },
);
