-- =============================================================================
-- FIX: Update existing wallets to have the correct user_id
-- Run this migration on your Supabase database to fix wallets not showing
-- =============================================================================

-- Step 1: Check current state - run this to see which wallets don't have user_id
-- SELECT id, name, type, user_id FROM wallets WHERE user_id IS NULL;

-- Step 2: If you're the only user, update all orphan wallets to your user ID
-- First, let's see what users exist:
-- SELECT id, email FROM auth.users;

-- Step 3: Update wallets with NULL user_id to the authenticated user
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users
-- UPDATE wallets SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;

-- Alternative: If you want to automatically assign to all authenticated users based on
-- when the wallet was created (this is the most reliable if you're the only user):
DO $$ 
DECLARE
    v_user_id UUID;
    v_count INT;
BEGIN
    -- Get the first user (works if you're the only user)
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- Update all wallets that don't have a user_id
        UPDATE wallets 
        SET user_id = v_user_id 
        WHERE user_id IS NULL;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE 'Updated % wallets to user_id: %', v_count, v_user_id;
    ELSE
        RAISE NOTICE 'No users found in auth.users';
    END IF;
END $$;

-- Verify the fix:
-- SELECT id, name, type, user_id FROM wallets;
