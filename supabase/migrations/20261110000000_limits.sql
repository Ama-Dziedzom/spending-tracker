-- LogIt v1: weekly limits per category (docs/design-handoff.md §7,
-- Figma section 1044:5101). Spent-so-far is always computed from
-- transactions; this table only holds the person's choices.
--
-- One warning when spend first crosses warn_at in a period, never repeated:
-- last_warned_week holds the start of the week a warning was last sent.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS limits (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  category         text NOT NULL,
  amount           numeric(12, 2) NOT NULL CHECK (amount > 0),
  period           text NOT NULL DEFAULT 'week' CHECK (period IN ('week')),
  -- ISO weekday the week starts on: 1 = Monday … 7 = Sunday.
  reset_day        smallint NOT NULL DEFAULT 1 CHECK (reset_day BETWEEN 1 AND 7),
  -- Share of the limit that triggers the one warning; null = no warning.
  warn_at          numeric(3, 2) DEFAULT 0.8 CHECK (warn_at IS NULL OR (warn_at > 0 AND warn_at < 1)),
  last_warned_week date,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);

ALTER TABLE limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "limits owner read" ON limits;
DROP POLICY IF EXISTS "limits owner insert" ON limits;
DROP POLICY IF EXISTS "limits owner update" ON limits;
DROP POLICY IF EXISTS "limits owner delete" ON limits;

CREATE POLICY "limits owner read" ON limits FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "limits owner insert" ON limits FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "limits owner update" ON limits FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "limits owner delete" ON limits FOR DELETE USING (user_id = auth.uid());
