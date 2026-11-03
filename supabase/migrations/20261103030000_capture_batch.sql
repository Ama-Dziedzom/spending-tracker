-- =============================================================================
-- Capture batch (3 Nov 2026)
--  1. transactions.date_source + provider_txn_id
--  2. sms_id_anchors: dated MTN transaction IDs, used to date undated messages
--  3. Pattern: MTN loan repayment ("An amount 14.17 GHS has been repaid …")
--  4. Backfill: cash-outs → 'cash', loan repayments → 'loans'
-- Safe to run more than once.
-- =============================================================================

-- 1 ─────────────────────────────────────────────────────────────────────────
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS date_source TEXT
  CHECK (date_source IN ('sms', 'estimated', 'received', 'manual'));
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS provider_txn_id TEXT;

COMMENT ON COLUMN transactions.date_source IS
  'sms = date read from the message; estimated = worked out from the provider transaction ID; received = time LogIt got it; manual = entered by the user';

-- 2 ─────────────────────────────────────────────────────────────────────────
-- Only a provider, an ID and a time. No user, amount or text.
CREATE TABLE IF NOT EXISTS sms_id_anchors (
  source      TEXT        NOT NULL,
  txn_id      BIGINT      NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source, txn_id)
);
ALTER TABLE sms_id_anchors ENABLE ROW LEVEL SECURITY;
-- No policies: only the API (service role) reads and writes it.

-- 3 ─────────────────────────────────────────────────────────────────────────
INSERT INTO patterns (institution_name, institution_code, regex_pattern, field_map, transfer_type, priority)
SELECT
  'MTN Mobile Money',
  'mtn_momo',
  'An amount(?: of)?\s+(?:GHS\s?)?([\d,]+\.?\d*)\s*(?:GHS)?\s+has been repaid from your account',
  '{"amount":1,"description":null,"balance":null,"source":"MTN_MoMo","flags":"i","default_description":"Loan repayment"}',
  NULL,
  45
WHERE NOT EXISTS (
  SELECT 1 FROM patterns WHERE regex_pattern LIKE 'An amount(?: of)?%has been repaid%'
);

-- 4 ─────────────────────────────────────────────────────────────────────────
UPDATE transactions
SET category = 'cash'
WHERE raw_sms IS NOT NULL
  AND type = 'debit'
  AND COALESCE(category, 'other') IN ('other', '')
  AND raw_sms ~* '(cash[- ]?out|withdrawal|\matm\M)';

UPDATE transactions
SET category = 'loans', type = 'debit'
WHERE raw_sms IS NOT NULL
  AND raw_sms ~* '(has been repaid|\mrepayment\M)';
