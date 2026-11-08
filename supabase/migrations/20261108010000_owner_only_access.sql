-- LogIt: every user sees and changes only their own money.
--
-- transactions, wallets and transfers were created in the Supabase dashboard,
-- before migrations lived in this repo, so their row-level security was never
-- written down here. The mobile app reads these tables directly with the
-- user's login, which means these rules are the only thing keeping one
-- person's data away from another's.
--
-- What this does, for each table that exists:
--   1. turns row-level security on
--   2. removes ANY existing policy on it (a single "allow all" policy left
--      over from the dashboard would otherwise still leak data, because
--      policies add up)
--   3. adds four owner-only policies: read / add / change / delete where
--      user_id = the signed-in user
--
-- The API uses the service role, which bypasses these rules; it already
-- filters every query by the caller's user id. Realtime also respects RLS,
-- so live refresh only ever delivers the user's own rows.
--
-- Safe to run more than once.

DO $$
DECLARE
  t   text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY['transactions', 'wallets', 'transfers'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'Table % not found, skipped', t;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id'
    ) THEN
      RAISE EXCEPTION 'Table % has no user_id column; fix that before locking it down', t;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    -- New rows belong to whoever is signed in, even if the app forgets to say
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET DEFAULT auth.uid()', t);

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format('CREATE POLICY "Owner reads" ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "Owner adds" ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "Owner changes" ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "Owner deletes" ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())', t);

    -- Signed-out visitors get nothing at all
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

-- failed_parses already has owner policies; make sure signed-out visitors can't touch it
DO $$ BEGIN
  IF to_regclass('public.failed_parses') IS NOT NULL THEN
    REVOKE ALL ON public.failed_parses FROM anon;
  END IF;
END $$;

-- ── Check it worked ─────────────────────────────────────────────────────
-- Run this afterwards. Every user table should show rls_on = true, and the
-- policy list should only contain owner rules ("user_id = auth.uid()").
--
--   SELECT c.relname AS table, c.relrowsecurity AS rls_on
--   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND c.relkind = 'r'
--   ORDER BY 1;
--
--   SELECT tablename, policyname, cmd, qual, with_check
--   FROM pg_policies WHERE schemaname = 'public' ORDER BY 1, 2;
