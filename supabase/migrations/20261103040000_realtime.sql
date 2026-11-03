-- Live updates in the app (lib/useLiveRefresh.ts): stream changes to these
-- tables over Supabase Realtime. RLS still applies, so each user only receives
-- their own rows. Safe to run more than once.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['transactions', 'wallets', 'failed_parses'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
