-- ─────────────────────────────────────────────────────────────────────────────
-- Reset ONE user's test data (transactions, transfers, Needs review).
-- Run in the Supabase SQL editor. Nothing here touches other users.
--
-- KEEPS: account + login, wallets, category rules, limits, expected income,
--        sms_id_anchors and pattern_samples (anonymous, shared).
-- BACKS UP everything it deletes into the "backup" schema first.
--
-- STEP 1 — run this line alone to find your user id, copy it:
--   select id, phone, email, created_at from auth.users order by created_at;
--
-- STEP 2 — paste your id below (once), then run the WHOLE script.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create temp table reset_target on commit drop as
select id from auth.users
where id = 'PASTE-YOUR-USER-ID-HERE';   -- ← your id from step 1

do $$
begin
  if (select count(*) from reset_target) <> 1 then
    raise exception 'User id not found. Paste the id from step 1 into reset_target.';
  end if;
end $$;

-- ── Backup (timestamped, so running it again never overwrites a backup) ─────
create schema if not exists backup;

do $$
declare
  stamp text := to_char(now(), 'YYYYMMDD_HH24MI');
  uid uuid := (select id from reset_target);
begin
  execute format('create table backup.transactions_%s  as select * from public.transactions  where user_id = %L', stamp, uid);
  execute format('create table backup.transfers_%s     as select * from public.transfers     where user_id = %L', stamp, uid);
  execute format('create table backup.failed_parses_%s as select * from public.failed_parses where user_id = %L', stamp, uid);
  execute format('create table backup.wallets_%s       as select * from public.wallets       where user_id = %L', stamp, uid);
  raise notice 'Backed up to backup.*_%', stamp;
end $$;

-- ── Delete (Needs review first, then transactions, then transfers) ──────────
delete from public.failed_parses where user_id = (select id from reset_target);
delete from public.transactions  where user_id = (select id from reset_target);
delete from public.transfers     where user_id = (select id from reset_target);

-- ── Check: all three should be 0 ────────────────────────────────────────────
select
  (select count(*) from public.transactions  where user_id = (select id from reset_target)) as transactions_left,
  (select count(*) from public.transfers     where user_id = (select id from reset_target)) as transfers_left,
  (select count(*) from public.failed_parses where user_id = (select id from reset_target)) as needs_review_left;

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- OPTIONAL — fix a wallet's balance (MoMo is already right; leave it).
-- See your wallets:
--   select id, name, current_balance from public.wallets where user_id = 'YOUR-ID';
-- Set one:
--   update public.wallets set current_balance = 1394.51 where id = 'WALLET-ID';
--
-- UNDO — restore from a backup (replace the stamp with yours):
--   insert into public.transfers     select * from backup.transfers_20261109_0730;
--   insert into public.transactions  select * from backup.transactions_20261109_0730;
--   insert into public.failed_parses select * from backup.failed_parses_20261109_0730;
-- ─────────────────────────────────────────────────────────────────────────────
