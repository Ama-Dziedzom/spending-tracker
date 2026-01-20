-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'momo', 'cash', 'other')),
  icon TEXT NOT NULL DEFAULT '💰',
  color TEXT NOT NULL DEFAULT '#6B7280',
  initial_balance DECIMAL(10, 2) DEFAULT 0,
  current_balance DECIMAL(10, 2) DEFAULT 0,
  source_identifier TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add wallet_id to transactions (assuming transactions table already exists)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='wallet_id') THEN
    ALTER TABLE transactions ADD COLUMN wallet_id UUID REFERENCES wallets(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='is_transfer') THEN
    ALTER TABLE transactions ADD COLUMN is_transfer BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='linked_transaction_id') THEN
    ALTER TABLE transactions ADD COLUMN linked_transaction_id UUID REFERENCES transactions(id);
  END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallets_source ON wallets(source_identifier);

-- RLS Policies
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on wallets" ON wallets FOR ALL USING (true);
