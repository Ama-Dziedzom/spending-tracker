-- =============================================================================
-- FIX: User Isolation Security Patch
-- 
-- This script fixes two critical issues:
-- 1. Updates RPC functions to verify transaction ownership before modifying
-- 2. Provides diagnostics to identify cross-user data leakage
--
-- IMPORTANT: Run this AFTER updating the RPC functions in database.sql
-- =============================================================================

-- Step 1: DIAGNOSTIC - Find transactions that may have wrong user_id
-- Run these queries to check for issues:

-- Check for transactions without user_id (orphaned)
SELECT 'Orphaned Transactions (no user_id)' as issue, COUNT(*) as count 
FROM transactions WHERE user_id IS NULL;

-- Check for transactions where user_id doesn't match wallet's user_id
SELECT 'Mismatched user_id (tx vs wallet)' as issue, COUNT(*) as count
FROM transactions t
JOIN wallets w ON t.wallet_id = w.id
WHERE t.user_id != w.user_id;

-- List all users and their transaction counts
SELECT 
    u.email,
    u.id as user_id,
    (SELECT COUNT(*) FROM transactions WHERE user_id = u.id) as transaction_count,
    (SELECT COUNT(*) FROM wallets WHERE user_id = u.id) as wallet_count
FROM auth.users u;

-- =============================================================================
-- Step 2: FIX MISMATCHED TRANSACTIONS
-- These transactions have a wallet assigned but user_id doesn't match
-- =============================================================================

-- Fix transactions to match their wallet's user_id
UPDATE transactions t
SET user_id = w.user_id
FROM wallets w
WHERE t.wallet_id = w.id
  AND t.user_id IS DISTINCT FROM w.user_id
  AND w.user_id IS NOT NULL;

-- =============================================================================
-- Step 3: HANDLE ORPHANED TRANSACTIONS
-- 
-- Transactions with NULL user_id AND NULL wallet_id cannot be auto-assigned.
-- They will remain invisible to all users until manually claimed through 
-- the app's "smart detections" flow (which will now only show orphaned ones).
-- 
-- If you need to DELETE orphaned transactions (optional, data loss warning):
-- DELETE FROM transactions WHERE user_id IS NULL AND wallet_id IS NULL;
-- =============================================================================

-- Verify the fix:
SELECT 
    'Remaining orphaned' as status,
    COUNT(*) as count 
FROM transactions 
WHERE user_id IS NULL;

SELECT 
    'Remaining mismatched' as status,
    COUNT(*) as count
FROM transactions t
JOIN wallets w ON t.wallet_id = w.id
WHERE t.user_id != w.user_id;

-- =============================================================================
-- Step 4: UPDATE RPC FUNCTIONS (if not already done via database.sql)
-- 
-- The key security fix is adding ownership checks:
-- WHERE id = p_transaction_id AND (user_id = v_user_id OR user_id IS NULL)
--
-- This ensures:
-- - Users can only modify their own transactions
-- - Users can claim orphaned transactions (NULL user_id) which sets the user_id
-- - Users CANNOT modify or see other users' transactions
-- =============================================================================
