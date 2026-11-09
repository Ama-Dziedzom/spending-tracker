-- LogIt v1: record whether an entry changed its wallet's balance.
--
-- Entries added in the v1 app (Add manually, Log cash) change the wallet's
-- balance, so "GHS 270 cash left after this" stays true (Figma 1005:1161).
-- Entries added by the old app did not. When an entry is moved to another
-- wallet or deleted, the app undoes the balance change only if there was one.
--
-- NULL means "not recorded" (everything saved before this column existed);
-- the app then falls back to the old behaviour: SMS entries without the
-- bank's own balance changed it, manual entries didn't.
-- Safe to run more than once.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS balance_applied boolean;
