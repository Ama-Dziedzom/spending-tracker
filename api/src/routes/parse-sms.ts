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
import { categorizeTransaction } from '../lib/categorize.js';

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
        ? match[fm.description].trim()
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
      /\bsent\b|^payment made|^payment of|^payment for|^your payment|^Cash Out|paid to|withdrawal|transaction was made/i.test(
        cleanSms,
      )
    ) {
      isDebit = true;
    }

    const category = pattern.transfer_type
      ? 'Transfers'
      : categorizeTransaction(description, fm.source, cleanSms);

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
        is_transfer: !!pattern.transfer_type,
        transfer_type: pattern.transfer_type,
        transfer_metadata: transferMetadata,
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
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('parse-sms error:', message);
    res.status(500).json({ error: message });
  }
});
