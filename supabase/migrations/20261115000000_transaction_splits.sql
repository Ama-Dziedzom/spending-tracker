-- LogIt: one payment, several categories.
--
-- splits holds the parts of a split entry as [{"category": "food", "amount": 600}, …].
-- The parts always add up to the entry's amount. category keeps the largest
-- part, so anything that doesn't read splits still shows something sensible.
-- Null means the entry isn't split.
-- Safe to run more than once.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS splits jsonb;

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_splits_shape;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_splits_shape
  CHECK (splits IS NULL OR (jsonb_typeof(splits) = 'array' AND jsonb_array_length(splits) >= 2));
