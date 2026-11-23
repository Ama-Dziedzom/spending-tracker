-- LogIt: daily cap on Ask LogIt questions that reach Claude.
--
-- One row per person per day. The day is the calendar day in Africa/Accra,
-- so the count resets at midnight Ghana time.
--
-- Owner-only, in the same style as 20261108010000_owner_only_access.sql, with
-- one difference: people can READ their own count but not add, change or
-- delete it. Otherwise anyone could reset their own cap with the app's key.
-- Only the API (service role) changes counts, through increment_ask_usage.
--
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS public.ask_usage (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  day     date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Accra')::date,
  count   integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.ask_usage ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ask_usage' LOOP
    EXECUTE format('DROP POLICY %I ON public.ask_usage', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Owner reads" ON public.ask_usage
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Signed-out visitors get nothing; signed-in people can only read
REVOKE ALL ON public.ask_usage FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.ask_usage FROM authenticated;

-- Adds one to today's count in a single statement and returns the new total.
-- Two questions at the same moment can't both read the old number.
CREATE OR REPLACE FUNCTION public.increment_ask_usage(p_user uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.ask_usage AS u (user_id, day, count)
  VALUES (p_user, (now() AT TIME ZONE 'Africa/Accra')::date, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET count = u.count + 1
  RETURNING u.count;
$$;

-- Only the API may call it
REVOKE EXECUTE ON FUNCTION public.increment_ask_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ask_usage(uuid) TO service_role;

-- Check it worked:
--   SELECT public.increment_ask_usage(auth.uid());  -- should fail for app users
--   SELECT * FROM public.ask_usage ORDER BY day DESC LIMIT 10;
