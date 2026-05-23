-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),  -- User isolation
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
  user_id UUID REFERENCES auth.users(id),  -- User isolation
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

-- Add user_id to wallets if it doesn't exist (for existing databases)
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Fix transactions type check constraint
-- This ensures that both banking terms (credit/debit) and app terms (income/expense) are allowed
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'credit', 'debit'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer ON transactions(transfer_id);
CREATE INDEX IF NOT EXISTS idx_wallets_source ON wallets(source_identifier);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_user ON transfers(user_id);

-- =============================================================================
-- Row Level Security (RLS) - User Isolation
-- Each user can only see/modify their own data
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all operations on wallets" ON wallets;
DROP POLICY IF EXISTS "Allow all operations on transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all operations on transfers" ON transfers;
DROP POLICY IF EXISTS "Users can view their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can insert their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can update their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can delete their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their own transfers" ON transfers;
DROP POLICY IF EXISTS "Users can insert their own transfers" ON transfers;
DROP POLICY IF EXISTS "Users can update their own transfers" ON transfers;
DROP POLICY IF EXISTS "Users can delete their own transfers" ON transfers;

-- Wallets RLS Policies
CREATE POLICY "Users can view their own wallets" ON wallets
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own wallets" ON wallets
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own wallets" ON wallets
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own wallets" ON wallets
  FOR DELETE USING (user_id = auth.uid());

-- Transactions RLS Policies
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE USING (user_id = auth.uid());

-- Transfers RLS Policies
CREATE POLICY "Users can view their own transfers" ON transfers
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own transfers" ON transfers
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own transfers" ON transfers
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own transfers" ON transfers
  FOR DELETE USING (user_id = auth.uid());

-- RPC Functions
-- Drop existing functions first to avoid parameter conflicts
DROP FUNCTION IF EXISTS process_wallet_transfer(uuid, uuid, uuid, numeric, text, uuid);
DROP FUNCTION IF EXISTS process_wallet_transfer(uuid, uuid, uuid, numeric, text);
DROP FUNCTION IF EXISTS assign_transaction_to_wallet(uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS assign_transaction_to_wallet(uuid, uuid, text);

-- =============================================================================
-- Function: assign_transaction_to_wallet
-- Uses auth.uid() internally for security - no user_id parameter needed
-- =============================================================================
CREATE OR REPLACE FUNCTION assign_transaction_to_wallet(
  p_transaction_id UUID,
  p_wallet_id UUID,
  p_category_id TEXT
)
RETURNS void AS $$
DECLARE
  v_amount DECIMAL;
  v_type TEXT;
  v_user_id UUID;
BEGIN
  -- Get the current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: No authenticated user found';
  END IF;

  -- Get transaction details
  -- SECURITY: Only allow if transaction belongs to current user OR has no owner (orphaned)
  SELECT amount, type INTO v_amount, v_type
  FROM transactions
  WHERE id = p_transaction_id
    AND (user_id = v_user_id OR user_id IS NULL);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or access denied: %', p_transaction_id;
  END IF;

  -- Update transaction with user_id from auth.uid()
  -- Only update transactions that belong to current user or are orphaned
  UPDATE transactions
  SET 
    wallet_id = p_wallet_id,
    category = p_category_id,
    user_id = v_user_id,
    updated_at = NOW()
  WHERE id = p_transaction_id
    AND (user_id = v_user_id OR user_id IS NULL);

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

-- =============================================================================
-- Function: process_wallet_transfer
-- Uses auth.uid() internally for security - no user_id parameter needed
-- =============================================================================
CREATE OR REPLACE FUNCTION process_wallet_transfer(
  p_transaction_id UUID,
  p_from_wallet_id UUID,
  p_to_wallet_id UUID,
  p_amount NUMERIC,
  p_notes TEXT
)
RETURNS void AS $$
DECLARE
  v_transfer_id UUID;
  v_transaction_date TIMESTAMPTZ;
  v_description TEXT;
  v_user_id UUID;
BEGIN
  -- Get the current authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: No authenticated user found';
  END IF;

  -- Get original transaction info
  -- SECURITY: Only allow if transaction belongs to current user OR has no owner (orphaned)
  SELECT transaction_date, description INTO v_transaction_date, v_description
  FROM transactions
  WHERE id = p_transaction_id
    AND (user_id = v_user_id OR user_id IS NULL);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or access denied: %', p_transaction_id;
  END IF;

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
    v_user_id,
    p_from_wallet_id,
    p_to_wallet_id,
    p_amount,
    p_notes,
    'completed',
    NOW()
  ) RETURNING id INTO v_transfer_id;

  -- 2. Update the original transaction (Source side)
  -- SECURITY: Only update transactions that belong to current user or are orphaned
  UPDATE transactions
  SET 
    wallet_id = p_from_wallet_id,
    category = 'transfer',
    is_transfer = true,
    transfer_id = v_transfer_id,
    transfer_side = 'from',
    user_id = v_user_id,
    updated_at = NOW()
  WHERE id = p_transaction_id
    AND (user_id = v_user_id OR user_id IS NULL);

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
    v_user_id,
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

-- =============================================================================
-- Function: get_claimable_transactions
-- Returns orphaned transactions (user_id IS NULL) that can be claimed
-- These are transactions imported via SMS that haven't been assigned to any user
-- =============================================================================
DROP FUNCTION IF EXISTS get_claimable_transactions();

CREATE OR REPLACE FUNCTION get_claimable_transactions()
RETURNS TABLE (
  id UUID,
  description TEXT,
  amount DECIMAL,
  type TEXT,
  category TEXT,
  transaction_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  source TEXT
) AS $$
BEGIN
  -- Only return transactions that have no owner (orphaned)
  -- These are safe for any authenticated user to claim
  RETURN QUERY
  SELECT 
    t.id,
    t.description,
    t.amount,
    t.type,
    t.category,
    t.transaction_date,
    t.created_at,
    t.source
  FROM transactions t
  WHERE t.user_id IS NULL
    AND t.wallet_id IS NULL
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
