-- =============================================================================
-- Migration: Add User Isolation via Row Level Security (RLS)
-- Run this in your Supabase SQL Editor
-- =============================================================================
-- This migration ensures that each user can only see their own data:
-- - Wallets
-- - Transactions  
-- - Transfers
-- =============================================================================

-- Step 1: Add user_id column to wallets table if it doesn't exist
-- -----------------------------------------------------------------------------
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Step 2: Create indexes for performance
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_user ON transfers(user_id);

-- Step 3: Drop existing permissive policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all operations on wallets" ON wallets;
DROP POLICY IF EXISTS "Allow all operations on transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all operations on transfers" ON transfers;

-- Also drop any existing user-specific policies to avoid conflicts
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

-- Step 4: Create new RLS policies for WALLETS
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view their own wallets" ON wallets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own wallets" ON wallets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own wallets" ON wallets
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own wallets" ON wallets
  FOR DELETE USING (user_id = auth.uid());

-- Step 5: Create new RLS policies for TRANSACTIONS
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE USING (user_id = auth.uid());

-- Step 6: Create new RLS policies for TRANSFERS
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view their own transfers" ON transfers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own transfers" ON transfers
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own transfers" ON transfers
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own transfers" ON transfers
  FOR DELETE USING (user_id = auth.uid());

-- Step 7: Ensure RLS is enabled on all tables
-- -----------------------------------------------------------------------------
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- IMPORTANT: After running this migration, you need to assign your existing
-- data to your user account. Run the following queries, replacing YOUR_USER_ID
-- with your actual user ID from auth.users:
-- =============================================================================
-- 
-- -- Find your user ID:
-- SELECT id, email FROM auth.users;
-- 
-- -- Update existing wallets:
-- UPDATE wallets SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
-- 
-- -- Update existing transactions:
-- UPDATE transactions SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
-- 
-- -- Update existing transfers:
-- UPDATE transfers SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
-- =============================================================================

-- Alternatively, run this block to auto-assign to the FIRST user in the system:
DO $$
DECLARE
    v_user_id UUID;
    v_wallet_count INT;
    v_tx_count INT;
    v_transfer_count INT;
BEGIN
    -- Get the first user
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- Update wallets
        UPDATE wallets SET user_id = v_user_id WHERE user_id IS NULL;
        GET DIAGNOSTICS v_wallet_count = ROW_COUNT;
        
        -- Update transactions
        UPDATE transactions SET user_id = v_user_id WHERE user_id IS NULL;
        GET DIAGNOSTICS v_tx_count = ROW_COUNT;
        
        -- Update transfers
        UPDATE transfers SET user_id = v_user_id WHERE user_id IS NULL;
        GET DIAGNOSTICS v_transfer_count = ROW_COUNT;
        
        RAISE NOTICE 'Migration complete! Assigned to user: %', v_user_id;
        RAISE NOTICE 'Updated % wallets, % transactions, % transfers', 
            v_wallet_count, v_tx_count, v_transfer_count;
    ELSE
        RAISE NOTICE 'No users found in auth.users. Create a user first.';
    END IF;
END $$;

-- =============================================================================
-- Verification: Run these queries to confirm everything is set up correctly
-- =============================================================================
-- 
-- -- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE tablename IN ('wallets', 'transactions', 'transfers');
-- 
-- -- Check policies exist:
-- SELECT schemaname, tablename, policyname FROM pg_policies 
-- WHERE tablename IN ('wallets', 'transactions', 'transfers');
-- 
-- -- Check user_id is populated:
-- SELECT 'wallets' as table_name, COUNT(*) as null_user_count 
-- FROM wallets WHERE user_id IS NULL
-- UNION ALL
-- SELECT 'transactions', COUNT(*) FROM transactions WHERE user_id IS NULL
-- UNION ALL
-- SELECT 'transfers', COUNT(*) FROM transfers WHERE user_id IS NULL;
-- =============================================================================
