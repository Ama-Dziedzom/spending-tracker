-- LogIt: the silent side of a move between the user's own accounts.
--
-- Some banks (e.g. Standard Chartered) don't text when you send money to
-- MoMo. When MoMo's alert says "received … from SCB" and it's the user's own
-- name, the API adds the matching entry to the bank wallet so its balance
-- drops too. inferred_from points at the alert it was worked out from; the
-- app labels these "Added by LogIt" and offers Undo (delete). If the bank's
-- own alert arrives later, the API replaces the stand-in with it.
-- Safe to run more than once.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS inferred_from uuid REFERENCES transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS transactions_inferred_from_idx
  ON transactions (inferred_from) WHERE inferred_from IS NOT NULL;
