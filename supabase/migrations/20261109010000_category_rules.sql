-- LogIt v1: "Always use this for Shoprite" (Figma 1005:911, Change category).
-- One row per user and merchant. The merchant key is the transaction
-- description up to the first comma, lower-cased ("Shoprite, Accra Mall" →
-- "shoprite"), so every branch follows the same rule. The app writes rules;
-- the API applies them to new SMS alerts (api/src/routes/process-sms.ts).
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS category_rules (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  merchant   text NOT NULL CHECK (merchant <> ''),
  category   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, merchant)
);

ALTER TABLE category_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "category_rules owner read" ON category_rules;
DROP POLICY IF EXISTS "category_rules owner insert" ON category_rules;
DROP POLICY IF EXISTS "category_rules owner update" ON category_rules;
DROP POLICY IF EXISTS "category_rules owner delete" ON category_rules;

CREATE POLICY "category_rules owner read" ON category_rules
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "category_rules owner insert" ON category_rules
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "category_rules owner update" ON category_rules
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "category_rules owner delete" ON category_rules
  FOR DELETE USING (user_id = auth.uid());
