/**
 * POST /api/parse-sms
 *
 * Stateless SMS parser. Loads regex patterns from the `patterns` table,
 * matches against the raw SMS text, and returns structured transaction data.
 *
 * Ported from: supabase/functions/parse-sms/index.ts
 */

import { Router, type Request, type Response } from 'express';
import { supabaseAnon } from '../lib/supabase.js';
import { extractSmsDate } from '../lib/sms-helpers.js';
import { categorizeTransaction } from '../lib/categorize.js';
import { extractFee, extractProviderTxnId } from '../lib/sms-helpers.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldMap {
  amount: number;
  balance: number | null;
  description: number | null;
  source: string;
  flags?: string;
  default_description?: string;
  /** Overrides for messages the generic rules can't read correctly */
  type?: 'debit' | 'credit';
  category?: string;
  /** false when the message doesn't change the wallet balance (e.g. overdraft drawn straight into a payment) */
  affects_balance?: boolean;
  transfer_metadata?: {
    reference?: number | null;
    phone?: number | null;
    recipient?: number | null;
  };
}

interface PatternRow {
  regex_pattern: string;
  field_map: FieldMap;
  transfer_type: string | null;
}

export interface ParsedTransaction {
  transaction_date: string;
  amount: number;
  type: 'debit' | 'credit';
  source: string;
  description: string;
  balance: number | null;
  category: string;
  is_transfer: boolean;
  transfer_type: string | null;
  transfer_metadata: Record<string, string | null> | null;
  /** Provider charges on top of the amount (fee + tax/E-levy); 0 when none */
  fee: number;
  /** Provider's transaction number, used to date undated messages */
  provider_txn_id: string | null;
  /** false: log it, but leave the wallet balance alone */
  affects_balance: boolean;
}

export interface ParseSuccess {
  parsed: true;
  transaction: ParsedTransaction;
}

export interface ParseFailure {
  parsed: false;
  reason: string;
}

export type ParseResult = ParseSuccess | ParseFailure;

// ---------------------------------------------------------------------------
// Core parsing logic (exported for direct use by process-sms)
// ---------------------------------------------------------------------------

/** Trim status text a pattern can drag into the payee, e.g. "MTN AIRTIME has been completed at …". */
function cleanDescription(text: string): string {
  return text
    .replace(/\s+(has been|was|is)\s+(completed|successful|processed|received)\b.*$/i, '')
    .replace(/\s+(at|on)\s+\d{4}-\d{2}-\d{2}.*$/i, '')
    .trim();
}

export async function parseSms(rawSms: string): Promise<ParseResult> {
  // Load active patterns ordered by priority
  const { data: patterns, error } = await supabaseAnon
    .from('patterns')
    .select('regex_pattern, field_map, transfer_type')
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (error) {
    throw new Error(`Failed to load patterns: ${error.message}`);
  }

  const cleanSms = rawSms.replace(/\r\n|\n|\r/g, ' ').replace(/\s+/g, ' ').trim();

  for (const pattern of (patterns as PatternRow[])) {
    const flags = pattern.field_map.flags ?? 'i';
    const regex = new RegExp(pattern.regex_pattern, flags);
    const match = cleanSms.match(regex);

    if (!match) continue;

    const fm = pattern.field_map;

    const amount = parseFloat(match[fm.amount].replace(/,/g, ''));

    const description =
      fm.description && match[fm.description]
        ? cleanDescription(match[fm.description])
        : (fm.default_description ?? 'Transaction');

    const balance =
      fm.balance != null && match[fm.balance]
        ? parseFloat(match[fm.balance].replace(/,/g, ''))
        : null;

    // Build transfer metadata when field_map encodes capture-group indices
    let transferMetadata: Record<string, string | null> | null = null;
    if (pattern.transfer_type && fm.transfer_metadata) {
      const tm = fm.transfer_metadata;
      const meta: Record<string, string | null> = {
        phone_number: tm.phone != null && match[tm.phone] ? match[tm.phone] : null,
        recipient_name: tm.recipient != null && match[tm.recipient] ? match[tm.recipient].trim() : null,
        reference: tm.reference != null && match[tm.reference] ? match[tm.reference].trim() : null,
      };
      if (Object.values(meta).some((v) => v !== null)) {
        transferMetadata = meta;
      }
    }

    // Debit / credit detection
    let isDebit = false;
    if (/\bdebit/i.test(cleanSms) || /\bdebited/i.test(cleanSms)) {
      isDebit = true;
    } else if (
      /\bcredit/i.test(cleanSms) ||
      /\bcredited/i.test(cleanSms) ||
      /received for/i.test(cleanSms)
    ) {
      isDebit = false;
    } else if (
      /\bsent\b|^payment made|^payment of|^payment for|^your payment|^Cash Out|paid to|withdrawal|transaction was made|\brepaid\b|\brepayment\b/i.test(
        cleanSms,
      )
    ) {
      isDebit = true;
    }

    if (fm.type) isDebit = fm.type === 'debit';

    // Category IDs must match the app's (mobile/lib/categories.ts)
    const category =
      fm.category ??
      (pattern.transfer_type
        ? 'transfer'
        : categorizeTransaction(description, fm.source, cleanSms, isDebit ? 'debit' : 'credit'));

    // Borrowing and repaying a loan/overdraft is neither income nor spending;
    // only its fees and interest are a cost (saved as separate Fees rows).
    const isLoanMove = category === 'loans';
    const isTransfer = !!pattern.transfer_type || isLoanMove;
    const transferType = pattern.transfer_type ?? (isLoanMove ? (isDebit ? 'transfer_out' : 'transfer_in') : null);

    return {
      parsed: true,
      transaction: {
        transaction_date: new Date().toISOString(),
        amount,
        type: isDebit ? 'debit' : 'credit',
        source: fm.source,
        description,
        balance,
        category,
        is_transfer: isTransfer,
        transfer_type: transferType,
        transfer_metadata: transferMetadata,
        fee: extractFee(cleanSms),
        provider_txn_id: extractProviderTxnId(cleanSms),
        affects_balance: fm.affects_balance !== false,
      },
    };
  }

  // No pattern matched
  return { parsed: false, reason: 'no_pattern_matched' };
}

// ---------------------------------------------------------------------------
// Express route
// ---------------------------------------------------------------------------

export const parseSmsRouter = Router();

parseSmsRouter.post('/parse-sms', async (req: Request, res: Response) => {
  try {
    const { rawSms } = req.body;

    if (!rawSms || typeof rawSms !== 'string') {
      res.status(400).json({ error: 'rawSms is required' });
      return;
    }

    const result = await parseSms(rawSms);
    // The date written in the message, so the app can preview "Today, 07:40"
    // before anything is saved (Paste · read, Figma 1005:1319).
    const smsDate = result.parsed ? extractSmsDate(rawSms) : null;
    res.json({ ...result, smsDate: smsDate ? smsDate.toISOString() : null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('parse-sms error:', message);
    res.status(500).json({ error: message });
  }
});
