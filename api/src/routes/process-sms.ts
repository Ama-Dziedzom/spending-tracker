/**
 * POST /api/process-sms
 *
 * Full SMS processing pipeline:
 *   1. Validate shortcut secret
 *   2. Extract user from auth token
 *   3. Parse SMS via parseSms() (direct call, no HTTP)
 *   4. Insert transaction into DB
 *   5. Update account balance (snapshot or math sync)
 *   6. Match pending transfers
 *   7. Record failed parses
 *
 * Ported from: supabase/functions/process-sms/index.ts
 */

import { Router, type Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { parseSms } from './parse-sms.js';
import {
  validateShortcutSecret,
  extractUser,
  type AuthenticatedRequest,
} from '../middleware/auth.js';

export const processSmsRouter = Router();

processSmsRouter.post(
  '/process-sms',
  extractUser,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { rawSms, accountId } = req.body;
      const userId = req.userId!;

      // ── Step 1: Parse SMS ───────────────────────────────────────────────
      const parseResult = await parseSms(rawSms);

      if (!parseResult.parsed) {
        // Record the failure so the team can improve patterns
        await supabaseAdmin.from('failed_parses').insert({
          user_id: userId,
          raw_sms: rawSms,
          reason: parseResult.reason ?? 'no_pattern_matched',
        });

        const wantsJson = req.query.format === 'json';
        const isShortcut = !!(req.body?.secret || req.body?.['x-shortcut-secret'] || req.headers?.['x-shortcut-secret']);
        const returnText = !wantsJson && isShortcut;

        if (returnText) {
          res.type('text/plain').status(400).send(`⚠️ Could not parse SMS\nNo matching pattern was found for this message.`);
          return;
        }

        res.status(400).json({ error: 'Could not parse SMS', rawSms });
        return;
      }

      const transaction = parseResult.transaction;

      // ── Step 2: Insert transaction ──────────────────────────────────────
      const { data, error: insertError } = await supabaseAdmin
        .from('transactions')
        .insert({
          ...transaction,
          raw_sms: rawSms,
          user_id: userId,
          account_id: accountId,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Database error: ${insertError.message}`);
      }

      // ── Step 3: Update account balance ──────────────────────────────────
      if (accountId && transaction.balance !== null && transaction.balance !== undefined) {
        // Snapshot sync — use the balance from the SMS
        console.log(`✅ Snapshot sync: Account ${accountId} → GHS ${transaction.balance}`);

        const { error: updateError } = await supabaseAdmin
          .from('accounts')
          .update({
            current_balance: transaction.balance,
            last_snapshot_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountId);

        if (updateError) {
          console.error('Error updating account with snapshot:', updateError.message);
        }
      } else if (accountId) {
        // Math sync — no snapshot available, compute from current balance
        console.log(`⚠️ Math sync: Account ${accountId} (no snapshot available)`);

        const { data: accounts, error: fetchError } = await supabaseAdmin
          .from('accounts')
          .select('current_balance')
          .eq('id', accountId);

        if (!fetchError && accounts && accounts.length > 0) {
          const currentBalance = accounts[0].current_balance || 0;
          const isDebit = transaction.type === 'debit';
          const newBalance = isDebit
            ? currentBalance - transaction.amount
            : currentBalance + transaction.amount;

          await supabaseAdmin
            .from('accounts')
            .update({
              current_balance: newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq('id', accountId);
        }
      }

      // ── Step 4: Transfer matching ───────────────────────────────────────
      let transferSuggestions: unknown[] = [];
      if (transaction.is_transfer) {
        const { data: pendingTransfers, error: transferError } = await supabaseAdmin
          .from('transfers')
          .select('*')
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
      const wantsJson = req.query.format === 'json';
      const isShortcut = !!(req.body?.secret || req.body?.['x-shortcut-secret'] || req.headers?.['x-shortcut-secret']);
      const returnText = !wantsJson && isShortcut;

      if (returnText) {
        const typeEmoji = transaction.type === 'debit' ? '💸' : '💰';
        const typeStr = transaction.type === 'debit' ? 'Debit' : 'Credit';
        const formattedAmount = `GHS ${transaction.amount.toFixed(2)}`;
        const formattedBalance = transaction.balance !== null && transaction.balance !== undefined
          ? `GHS ${transaction.balance.toFixed(2)}`
          : null;

        let textResponse = `✅ Transaction Logged!\n`;
        textResponse += `💵 Amount: ${formattedAmount} (${typeStr})\n`;
        textResponse += `📱 Source: ${transaction.source}\n`;
        textResponse += `🏷️ Category: ${transaction.category}\n`;
        textResponse += `💬 Desc: ${transaction.description}`;
        if (formattedBalance) {
          textResponse += `\n💰 Balance: ${formattedBalance}`;
        }
        if (transaction.is_transfer && transaction.transfer_type) {
          textResponse += `\n🔄 Transfer: ${transaction.transfer_type}`;
        }

        res.type('text/plain').send(textResponse);
        return;
      }

      res.json({
        success: true,
        data,
        isTransfer: transaction.is_transfer,
        transferType: transaction.transfer_type,
        transferSuggestions: transferSuggestions.length > 0 ? transferSuggestions : null,
        snapshotUsed: transaction.balance !== null,
        balanceAfter: transaction.balance,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('process-sms error:', message);

      const wantsJson = req.query.format === 'json';
      const isShortcut = !!(req.body?.secret || req.body?.['x-shortcut-secret'] || req.headers?.['x-shortcut-secret']);
      const returnText = !wantsJson && isShortcut;

      if (returnText) {
        res.type('text/plain').status(500).send(`⛔ Error Processing SMS\n${message}`);
        return;
      }

      res.status(500).json({ error: message });
    }
  },
);
