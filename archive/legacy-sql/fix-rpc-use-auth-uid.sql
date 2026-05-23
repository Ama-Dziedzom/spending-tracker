-- =============================================================================
-- FIX: Update RPC functions to use auth.uid() internally
-- This eliminates the need to pass user_id as a parameter and fixes the issue
-- where transactions are created without proper user_id values
-- =============================================================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS process_wallet_transfer(uuid, uuid, uuid, numeric, text, uuid);
DROP FUNCTION IF EXISTS process_wallet_transfer(uuid, uuid, uuid, numeric, text);
DROP FUNCTION IF EXISTS assign_transaction_to_wallet(uuid, uuid, text, uuid);
DROP FUNCTION IF EXISTS assign_transaction_to_wallet(uuid, uuid, text);

-- =============================================================================
-- Function: assign_transaction_to_wallet
-- Now uses auth.uid() internally for security
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
  SELECT amount, type INTO v_amount, v_type
  FROM transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  -- Update transaction with user_id from auth.uid()
  UPDATE transactions
  SET 
    wallet_id = p_wallet_id,
    category = p_category_id,
    user_id = v_user_id,
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

-- =============================================================================
-- Function: process_wallet_transfer
-- Now uses auth.uid() internally for security
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
  SELECT transaction_date, description INTO v_transaction_date, v_description
  FROM transactions
  WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
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
    user_id = v_user_id,
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
-- VERIFICATION: Check the functions were created correctly
-- =============================================================================
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('assign_transaction_to_wallet', 'process_wallet_transfer');
