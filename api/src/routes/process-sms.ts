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
import { extractUser, type AuthenticatedRequest } from '../middleware/auth.js';

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
  if (accountId) {
    const { data } = await supabaseAdmin
      .from('wallets')
      .select('id, name')
      .eq('id', accountId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    if (data) return { id: data.id, name: data.name, created: false };
  }

  const provider = PROVIDERS[tx.source];
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
  const next = tx.type === 'debit' ? current - tx.amount : current + tx.amount;
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
      const { rawSms, accountId } = req.body as { rawSms?: unknown; accountId?: string };
      const userId = req.userId!;

      if (typeof rawSms !== 'string' || rawSms.trim().length === 0) {
        res.status(400).json({ error: 'rawSms is required' });
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
        if (!alreadyFailed || alreadyFailed.length === 0) {
          const { error: failInsertError } = await supabaseAdmin.from('failed_parses').insert({
            user_id: userId,
            raw_sms: rawSms,
            reason: parseResult.reason ?? 'no_pattern_matched',
          });
          if (failInsertError) console.error('failed_parses insert failed:', failInsertError.message);
        } else if (alreadyFailed[0].status && alreadyFailed[0].status !== 'pending') {
          // Shared again after being dismissed/resolved: put it back in "Needs review"
          await supabaseAdmin
            .from('failed_parses')
            .update({ status: 'pending', resolved_at: null, created_at: new Date().toISOString() })
            .eq('id', alreadyFailed[0].id);
        }
        console.log(`⚠️ Unparsed SMS saved to Needs review for user ${userId}`);

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
            await applyBalance(linkedWallet.id, transaction, smsDate, prev.id);
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

      // ── Step 3: Route to wallet ─────────────────────────────────────────
      const wallet = await resolveWallet(userId, accountId, transaction);
      const smsDate = extractSmsDate(rawSms);

      // ── Step 4: Insert transaction ──────────────────────────────────────
      const { data, error: insertError } = await supabaseAdmin
        .from('transactions')
        .insert({
          ...transaction,
          raw_sms: rawSms,
          user_id: userId,
          wallet_id: wallet?.id ?? null,
          balance_snapshot: transaction.balance ?? null,
          transaction_date: (smsDate ?? new Date()).toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Database error: ${insertError.message}`);
      }

      // ── Step 5: Update wallet balance ───────────────────────────────────
      const balanceApplied = wallet ? await applyBalance(wallet.id, transaction, smsDate, data.id) : false;

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

      // ── Response ────────────────────────────────────────────────────────
      if (wantsPlainText(req)) {
        const typeEmoji = transaction.type === 'debit' ? '💸' : '💰';
        const typeStr = transaction.type === 'debit' ? 'Debit' : 'Credit';
        let textResponse = `✅ Transaction Logged!\n`;
        textResponse += `${typeEmoji} Amount: GHS ${transaction.amount.toFixed(2)} (${typeStr})\n`;
        textResponse += `👛 Wallet: ${wallet ? wallet.name + (wallet.created ? ' (new)' : '') : 'Not linked'}\n`;
        textResponse += `🏷️ Category: ${transaction.category}\n`;
        textResponse += `💬 Desc: ${transaction.description}`;
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
