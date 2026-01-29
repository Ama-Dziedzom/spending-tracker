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

-- Create transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  from_wallet_id UUID REFERENCES wallets(id),
  to_wallet_id UUID REFERENCES wallets(id),
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add missing columns to transactions
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='wallet_id') THEN
    ALTER TABLE transactions ADD COLUMN wallet_id UUID REFERENCES wallets(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='is_transfer') THEN
    ALTER TABLE transactions ADD COLUMN is_transfer BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='transfer_id') THEN
    ALTER TABLE transactions ADD COLUMN transfer_id UUID REFERENCES transfers(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='transfer_side') THEN
    ALTER TABLE transactions ADD COLUMN transfer_side TEXT CHECK (transfer_side IN ('from', 'to', 'fee'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='linked_transaction_id') THEN
    ALTER TABLE transactions ADD COLUMN linked_transaction_id UUID REFERENCES transactions(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='balance_snapshot') THEN
    ALTER TABLE transactions ADD COLUMN balance_snapshot DECIMAL(10, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='source') THEN
    ALTER TABLE transactions ADD COLUMN source TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='user_id') THEN
    ALTER TABLE transactions ADD COLUMN user_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='updated_at') THEN
    ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='created_at') THEN
    ALTER TABLE transactions ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Fix transactions type check constraint
-- This ensures that both banking terms (credit/debit) and app terms (income/expense) are allowed
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'credit', 'debit'));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer ON transactions(transfer_id);
CREATE INDEX IF NOT EXISTS idx_wallets_source ON wallets(source_identifier);

-- RLS Policies
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on wallets" ON wallets FOR ALL USING (true);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on transfers" ON transfers FOR ALL USING (true);

-- RPC Functions
-- Drop existing functions first to avoid parameter conflicts
DROP FUNCTION IF EXISTS process_wallet_transfer(uuid, uuid, uuid, numeric, text, uuid);
DROP FUNCTION IF EXISTS assign_transaction_to_wallet(uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS assign_transaction_to_wallet(uuid, uuid, text);

-- Function to assign a transaction to a wallet and update balance
CREATE OR REPLACE FUNCTION assign_transaction_to_wallet(
  p_transaction_id UUID,
  p_wallet_id UUID,
  p_category_id TEXT,
  p_user_id UUID
)
RETURNS void AS $$
DECLARE
  v_amount DECIMAL;
  v_type TEXT;
BEGIN
  -- Get transaction details
  SELECT amount, type INTO v_amount, v_type
  FROM transactions
  WHERE id = p_transaction_id;

  -- Update transaction
  UPDATE transactions
  SET 
    wallet_id = p_wallet_id,
    category = p_category_id,
    user_id = p_user_id,
    updated_at = NOW()
  WHERE id = p_transaction_id;

  -- Update wallet balance
  -- If it's a debit/expense, decrease balance. If credit/income, increase balance.
  IF v_type IN ('expense', 'debit') THEN
    UPDATE wallets
    SET current_balance = current_balance - v_amount,
        updated_at = NOW()
    WHERE id = p_wallet_id;
  ELSIF v_type IN ('income', 'credit') THEN
    UPDATE wallets
    SET current_balance = current_balance + v_amount,
        updated_at = NOW()
    WHERE id = p_wallet_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process a transfer between two wallets
CREATE OR REPLACE FUNCTION process_wallet_transfer(
  p_transaction_id UUID,
  p_from_wallet_id UUID,
  p_to_wallet_id UUID,
  p_amount NUMERIC,
  p_notes TEXT,
  p_user_id UUID
)
RETURNS void AS $$
DECLARE
  v_transfer_id UUID;
  v_transaction_date TIMESTAMPTZ;
  v_description TEXT;
BEGIN
  -- Get original transaction info
  SELECT transaction_date, description INTO v_transaction_date, v_description
  FROM transactions
  WHERE id = p_transaction_id;

  -- 1. Create the transfer record
  INSERT INTO transfers (
    user_id,
    from_wallet_id,
    to_wallet_id,
    amount,
    notes,
    status,
    completed_at
  ) VALUES (
    p_user_id,
    p_from_wallet_id,
    p_to_wallet_id,
    p_amount,
    p_notes,
    'completed',
    NOW()
  ) RETURNING id INTO v_transfer_id;

  -- 2. Update the original transaction (Source side)
  UPDATE transactions
  SET 
    wallet_id = p_from_wallet_id,
    category = 'transfer',
    is_transfer = true,
    transfer_id = v_transfer_id,
    transfer_side = 'from',
    user_id = p_user_id,
    updated_at = NOW()
  WHERE id = p_transaction_id;

  -- 3. Create the shadow transaction (Destination side)
  INSERT INTO transactions (
    description,
    amount,
    type,
    category,
    wallet_id,
    is_transfer,
    transfer_id,
    transfer_side,
    transaction_date,
    source,
    user_id,
    updated_at
  ) VALUES (
    v_description,
    p_amount,
    'income', -- Transfers are income to the destination wallet
    'transfer', -- matching the category ID
    p_to_wallet_id,
    true,
    v_transfer_id,
    'to',
    v_transaction_date,
    'transfer',
    p_user_id,
    NOW()
  );

  -- 4. Update balances of both wallets
  -- Decrease "from" wallet
  UPDATE wallets
  SET current_balance = current_balance - p_amount,
      updated_at = NOW()
  WHERE id = p_from_wallet_id;

  -- Increase "to" wallet
  UPDATE wallets
  SET current_balance = current_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_to_wallet_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
