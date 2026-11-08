-- LogIt: reading banks and wallets we have no pattern for yet.
--
-- 1. failed_parses.guess — what the fallback reader thinks an unfamiliar
--    alert says (amount, in/out, balance, who/where, provider, confidence).
--    The Check card is pre-filled from it; nothing is logged without the user.
--
-- 2. pattern_samples — masked templates of unfamiliar alerts, ONLY from users
--    who turned on "Help LogIt read more banks". Every personal detail
--    (amounts, names, numbers, dates, phones, accounts) is replaced with a
--    placeholder before it is stored, so a row looks like:
--      "Payment of GHS {amt} to {name}. Current Balance: GHS {amt}. Ref {id}"
--    Users can't read this table at all; only the service role (the API and
--    you, in the Supabase dashboard) can.
--
-- 3. pattern_sample_groups — the review queue: identical shapes grouped,
--    with how many different people have seen them. Write a pattern for the
--    top rows first.
--
-- Safe to run more than once.

ALTER TABLE failed_parses ADD COLUMN IF NOT EXISTS guess JSONB;

CREATE TABLE IF NOT EXISTS pattern_samples (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  shape          TEXT        NOT NULL,
  template       TEXT        NOT NULL,
  provider_guess TEXT,
  guess          JSONB,
  seen_count     INTEGER     NOT NULL DEFAULT 1,
  first_seen     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  covered        BOOLEAN     NOT NULL DEFAULT false,   -- set true once a pattern handles it
  UNIQUE (user_id, shape)
);

CREATE INDEX IF NOT EXISTS idx_pattern_samples_shape ON pattern_samples (shape) WHERE NOT covered;

ALTER TABLE pattern_samples ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: signed-in users and visitors can't read or write it.
REVOKE ALL ON pattern_samples FROM anon, authenticated;

CREATE OR REPLACE VIEW pattern_sample_groups
WITH (security_invoker = true) AS
SELECT
  shape,
  MIN(template)                    AS template,
  MODE() WITHIN GROUP (ORDER BY provider_guess) AS provider_guess,
  COUNT(DISTINCT user_id)          AS people,
  SUM(seen_count)                  AS messages,
  MAX(last_seen)                   AS last_seen
FROM pattern_samples
WHERE NOT covered
GROUP BY shape
ORDER BY people DESC, messages DESC;

REVOKE ALL ON pattern_sample_groups FROM anon, authenticated;
