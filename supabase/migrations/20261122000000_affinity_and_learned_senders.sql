-- LogIt: (1) Affinity alerts, (2) learning banks from your first confirmation.
-- Safe to run more than once.

-- 1 · Affinity ──────────────────────────────────────────────────────────────
-- "Successful transaction of GHS 31.00 from your acct *******988611 to
--  *******46085. Fee GHS 0.23, e-levy GHS , Bal: GHS 88.87. Ref: MM-VQX…  Affinity"
-- Groups: 1 amount, 2 the other account, 3 balance, 4 reference. The fee and
-- E-levy are read separately (api/src/lib/sms-helpers.ts extractFee).
INSERT INTO patterns (institution_name, institution_code, regex_pattern, field_map, transfer_type, priority)
SELECT 'Affinity', 'affinity',
  'Successful transaction of GHS\s?([\d,]+\.?\d*) from your acct\s*\S+ to\s*(\S+?)\.?\s(?:.*?Bal:?\s*GHS\s?([\d,]+\.?\d*))?(?:.*?Ref:?\s*([A-Z0-9-]{6,}))?',
  '{"amount":1,"description":null,"balance":3,"source":"Affinity","flags":"i","type":"debit","default_description":"Affinity transfer","transfer_metadata":{"reference":4,"phone":null,"recipient":null}}',
  NULL, 40
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE institution_code = 'affinity' AND regex_pattern LIKE '%from your acct%');

-- Money in. Written from the outgoing wording; if Affinity's incoming alert reads
-- differently it simply won't match, and learning (below) picks it up instead.
INSERT INTO patterns (institution_name, institution_code, regex_pattern, field_map, transfer_type, priority)
SELECT 'Affinity', 'affinity',
  'Successful transaction of GHS\s?([\d,]+\.?\d*) (?:to|into) your acct\s*\S+ from\s*(\S+?)\.?\s(?:.*?Bal:?\s*GHS\s?([\d,]+\.?\d*))?(?:.*?Ref:?\s*([A-Z0-9-]{6,}))?',
  '{"amount":1,"description":null,"balance":3,"source":"Affinity","flags":"i","type":"credit","default_description":"Money into Affinity","transfer_metadata":{"reference":4,"phone":null,"recipient":null}}',
  NULL, 41
WHERE NOT EXISTS (SELECT 1 FROM patterns WHERE institution_code = 'affinity' AND regex_pattern LIKE '%your acct%from%');

-- 2 · Learned senders ──────────────────────────────────────────────────────
-- When you confirm an alert LogIt couldn't read (Check), it remembers that
-- alert's SHAPE (the wording with every amount, name, number and date
-- removed) and the wallet you chose. Later alerts with the same shape are
-- logged straight into that wallet. Per person; nobody else sees them.

-- The shape of each unread alert, so Check can learn from it.
ALTER TABLE failed_parses ADD COLUMN IF NOT EXISTS shape TEXT;
ALTER TABLE failed_parses ADD COLUMN IF NOT EXISTS template TEXT;   -- masked wording, no personal details

CREATE TABLE IF NOT EXISTS learned_senders (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shape       TEXT        NOT NULL,
  wallet_id   UUID        NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  direction   TEXT        NOT NULL CHECK (direction IN ('debit', 'credit')),
  category    TEXT,
  label       TEXT,                 -- what you called it when you confirmed ("Affinity transfer")
  template    TEXT,                 -- masked wording, shown in Settings
  uses        INTEGER     NOT NULL DEFAULT 0,
  last_used   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, shape)
);

CREATE INDEX IF NOT EXISTS idx_learned_senders_lookup ON learned_senders (user_id, shape);

ALTER TABLE learned_senders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own learned senders" ON learned_senders;
CREATE POLICY "Own learned senders" ON learned_senders
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
