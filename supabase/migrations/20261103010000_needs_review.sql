-- LogIt: "Needs review" — let users see and resolve SMS the parser couldn't read.
-- Safe to run more than once.

ALTER TABLE failed_parses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE failed_parses ADD COLUMN IF NOT EXISTS resolved_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;
ALTER TABLE failed_parses ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'failed_parses_status_check') THEN
    ALTER TABLE failed_parses
      ADD CONSTRAINT failed_parses_status_check CHECK (status IN ('pending', 'resolved', 'dismissed'));
  END IF;
END $$;

-- Old test failures shouldn't flood the new list: anything older than 30 days
-- when this runs is dismissed (still kept for improving patterns).
UPDATE failed_parses
SET status = 'dismissed', resolved_at = NOW()
WHERE status = 'pending' AND created_at < NOW() - INTERVAL '30 days';

CREATE INDEX IF NOT EXISTS idx_failed_parses_user_status ON failed_parses (user_id, status, created_at DESC);

-- Users can resolve / dismiss their own items
DROP POLICY IF EXISTS "Users update own failed parses" ON failed_parses;
CREATE POLICY "Users update own failed parses" ON failed_parses
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
