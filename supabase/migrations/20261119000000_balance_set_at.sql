-- LogIt v1: remember when someone set a wallet's balance by hand.
--
-- "Balance doesn't look right?" on Wallet detail lets people correct the
-- number (cash most of all: no alerts). The footnote under the balance says
-- where the number came from, so it needs to know whether the last word was
-- an alert or the person. NULL means never set by hand.
-- Safe to run more than once.

ALTER TABLE wallets ADD COLUMN IF NOT EXISTS balance_set_at timestamptz;
