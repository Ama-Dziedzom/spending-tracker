-- LogIt: route SMS to wallets, dedupe, and keep balances in order
-- Safe to run more than once.

-- Columns the API now writes (most already exist from the legacy schema)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS balance_snapshot DECIMAL(12, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS raw_sms TEXT;

-- Fast duplicate check: same user + same SMS text
-- (SMS are short, so a plain b-tree on the text is fine)
CREATE INDEX IF NOT EXISTS idx_transactions_user_raw_sms
  ON transactions (user_id, raw_sms)
  WHERE raw_sms IS NOT NULL;

-- Fast "latest balance for this wallet" lookup
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_snapshot_date
  ON transactions (wallet_id, transaction_date DESC)
  WHERE balance_snapshot IS NOT NULL;

-- Wallet matching by provider
CREATE INDEX IF NOT EXISTS idx_wallets_user_type_source
  ON wallets (user_id, type, source_identifier);
