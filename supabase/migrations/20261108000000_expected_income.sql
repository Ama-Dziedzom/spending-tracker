-- =============================================================================
-- Expected income (8 Nov 2026)
-- Many banks no longer send credit alerts, so salary never arrives by SMS.
-- Users tell LogIt what they expect ("Salary, about GHS 4,500 on the 25th");
-- on that day the app asks "Did it come in?" and logs it with one tap.
-- Safe to run more than once.
-- =============================================================================

CREATE TABLE IF NOT EXISTS expected_income (
  id                   UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID          NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id            UUID          REFERENCES wallets(id) ON DELETE SET NULL,
  label                TEXT          NOT NULL DEFAULT 'Salary',
  amount               NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  day_of_month         INTEGER       NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  is_active            BOOLEAN       NOT NULL DEFAULT true,
  snoozed_until        DATE,
  -- 'YYYY-MM' of the last month it was logged or confirmed, so it asks once a month
  last_confirmed_month TEXT,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expected_income_user ON expected_income(user_id) WHERE is_active;

ALTER TABLE expected_income ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own expected income" ON expected_income;
CREATE POLICY "Users manage own expected income" ON expected_income
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
