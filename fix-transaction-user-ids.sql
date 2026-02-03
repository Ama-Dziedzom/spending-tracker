-- =============================================================================
-- FIX: Update existing transactions to have the correct user_id
-- Run this migration on your Supabase database to fix linking failures
-- =============================================================================

-- Step 1: Check current state - run this to see which transactions don't have user_id
-- SELECT id, description, amount, user_id FROM transactions WHERE user_id IS NULL;

-- Step 2: Update transactions with NULL user_id to the first authenticated user
-- This is a safe assumption if you are the only user of the app during development
DO $$ 
DECLARE
    v_user_id UUID;
    v_count INT;
BEGIN
    -- Get the first user (works if you're the only user)
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- Update all transactions that don't have a user_id
        UPDATE transactions 
        SET user_id = v_user_id 
        WHERE user_id IS NULL;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Updated % transactions to user_id: %', v_count, v_user_id;
    ELSE
        RAISE NOTICE 'No users found in auth.users';
    END IF;
END $$;

-- Verify the fix:
-- SELECT id, description, amount, user_id FROM transactions;
