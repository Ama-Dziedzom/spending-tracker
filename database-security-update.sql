-- =============================================================================
-- SECURITY UPDATE: Fix RLS policies and add user_id to wallets
-- Run this migration on your Supabase database
-- =============================================================================

-- 1. Add user_id column to wallets table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallets' AND column_name='user_id') THEN
    ALTER TABLE wallets ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 2. Update existing wallets to have a user_id (if you have existing data)
-- This will assign orphan wallets to the first user found - adjust as needed
-- UPDATE wallets SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;

-- 3. Create index for user_id on wallets
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- 4. Drop overly permissive policies
DROP POLICY IF EXISTS "Allow all operations on wallets" ON wallets;
DROP POLICY IF EXISTS "Allow all operations on transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all operations on transfers" ON transfers;

-- 5. Create proper RLS policies for WALLETS
CREATE POLICY "Users can view their own wallets" 
ON wallets FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets" 
ON wallets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets" 
ON wallets FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallets" 
ON wallets FOR DELETE 
USING (auth.uid() = user_id);

-- 6. Create proper RLS policies for TRANSACTIONS
CREATE POLICY "Users can view their own transactions" 
ON transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" 
ON transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" 
ON transactions FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" 
ON transactions FOR DELETE 
USING (auth.uid() = user_id);

-- 7. Create proper RLS policies for TRANSFERS
CREATE POLICY "Users can view their own transfers" 
ON transfers FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transfers" 
ON transfers FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transfers" 
ON transfers FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transfers" 
ON transfers FOR DELETE 
USING (auth.uid() = user_id);

-- 8. Update RPC functions to use auth.uid() instead of passed user_id for better security
-- Drop existing functions first
DROP FUNCTION IF EXISTS process_wallet_transfer(uuid, uuid, uuid, numeric, text, uuid);
DROP FUNCTION IF EXISTS assign_transaction_to_wallet(uuid, uuid, text, uuid);

-- Recreated function with auth.uid() for security
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
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get transaction details (will fail if not owned by user due to RLS)
  SELECT amount, type INTO v_amount, v_type
  FROM transactions
  WHERE id = p_transaction_id AND user_id = v_user_id;
  
  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'Transaction not found or access denied';
  END IF;

  -- Verify wallet ownership
  IF NOT EXISTS (SELECT 1 FROM wallets WHERE id = p_wallet_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Wallet not found or access denied';
  END IF;

  -- Update transaction
  UPDATE transactions
  SET 
    wallet_id = p_wallet_id,
    category = p_category_id,
    updated_at = NOW()
  WHERE id = p_transaction_id AND user_id = v_user_id;

  -- Update wallet balance
  IF v_type IN ('expense', 'debit') THEN
    UPDATE wallets
    SET current_balance = current_balance - v_amount,
        updated_at = NOW()
    WHERE id = p_wallet_id AND user_id = v_user_id;
  ELSIF v_type IN ('income', 'credit') THEN
    UPDATE wallets
    SET current_balance = current_balance + v_amount,
        updated_at = NOW()
    WHERE id = p_wallet_id AND user_id = v_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreated transfer function with auth.uid() for security
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
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify wallet ownership for both wallets
  IF NOT EXISTS (SELECT 1 FROM wallets WHERE id = p_from_wallet_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Source wallet not found or access denied';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM wallets WHERE id = p_to_wallet_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Destination wallet not found or access denied';
  END IF;

  -- Get original transaction info
  SELECT transaction_date, description INTO v_transaction_date, v_description
  FROM transactions
  WHERE id = p_transaction_id AND user_id = v_user_id;
  
  IF v_transaction_date IS NULL THEN
    RAISE EXCEPTION 'Transaction not found or access denied';
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
  UPDATE transactions
  SET 
    wallet_id = p_from_wallet_id,
    category = 'transfer',
    is_transfer = true,
    transfer_id = v_transfer_id,
    transfer_side = 'from',
    updated_at = NOW()
  WHERE id = p_transaction_id AND user_id = v_user_id;

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
    'income',
    'transfer',
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
  UPDATE wallets
  SET current_balance = current_balance - p_amount,
      updated_at = NOW()
  WHERE id = p_from_wallet_id AND user_id = v_user_id;

  UPDATE wallets
  SET current_balance = current_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_to_wallet_id AND user_id = v_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION assign_transaction_to_wallet(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_wallet_transfer(UUID, UUID, UUID, NUMERIC, TEXT) TO authenticated;
