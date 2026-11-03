-- =============================================================================
-- Overdraft (MoMoBoost) and loans (3 Nov 2026)
--  1. Pattern: "GHS13.43 has been used on FRI:…/MM with access fee GHS 0.68 …
--     from MoMoBoost." The overdraft paid part of a payment that is already
--     logged (the payment SMS carries the real balance), so it is logged as
--     borrowing (Loans, not income) without touching the wallet balance.
--     The access fee is saved by the API as a Fees row.
--  2. Loan moves are not income or spending: mark existing Loans rows as
--     transfers so they drop out of the spending/income totals.
-- Safe to run more than once.
-- =============================================================================

INSERT INTO patterns (institution_name, institution_code, regex_pattern, field_map, transfer_type, priority)
SELECT
  'MTN Mobile Money',
  'mtn_momo',
  'GHS\s?([\d,]+\.?\d*)\s+has been used\b.*?\baccess fee',
  '{"amount":1,"description":null,"balance":null,"source":"MTN_MoMo","flags":"i","default_description":"MoMoBoost overdraft","type":"credit","category":"loans","affects_balance":false}',
  NULL,
  44
WHERE NOT EXISTS (
  SELECT 1 FROM patterns WHERE field_map->>'default_description' = 'MoMoBoost overdraft'
);

-- Looser match (the first version needed "used on X with access fee" exactly)
UPDATE patterns
SET regex_pattern = 'GHS\s?([\d,]+\.?\d*)\s+has been used\b.*?\baccess fee'
WHERE field_map->>'default_description' = 'MoMoBoost overdraft';

UPDATE transactions
SET is_transfer = true,
    transfer_type = CASE WHEN type = 'credit' THEN 'transfer_in' ELSE 'transfer_out' END
WHERE category = 'loans'
  AND COALESCE(is_transfer, false) = false;
