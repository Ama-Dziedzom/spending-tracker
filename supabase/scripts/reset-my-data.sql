-- ─────────────────────────────────────────────────────────────────────────────
-- Reset ONE user's test data (transactions, transfers, Needs review).
-- Run in the Supabase SQL editor. Nothing here touches other users.
--
-- KEEPS: account + login, wallets, category rules, limits, expected income,
--        sms_id_anchors and pattern_samples (anonymous, shared).
-- BACKS UP everything it deletes into the "backup" schema first.
-- All-or-nothing: if any step fails, nothing is deleted.
--
-- STEP 1 — run this line alone to find your user id, copy it:
--   select id, phone, email, created_at from auth.users order by created_at;
--
-- STEP 2 — paste your id on the marked line, then run the WHOLE block.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  uid   uuid := 'PASTE-YOUR-USER-ID-HERE';   -- ← your id from step 1
  stamp text := to_char(now(), 'YYYYMMDD_HH24MI');
  n_tx int; n_tr int; n_fp int;
begin
  if not exists (select 1 from auth.users where id = uid) then
    raise exception 'User id not found. Paste the id from step 1.';
  end if;

  -- Backup (timestamped, so a second run never overwrites a backup)
  create schema if not exists backup;
  execute format('create table backup.transactions_%s  as select * from public.transactions  where user_id = %L', stamp, uid);
  execute format('create table backup.transfers_%s     as select * from public.transfers     where user_id = %L', stamp, uid);
  execute format('create table backup.failed_parses_%s as select * from public.failed_parses where user_id = %L', stamp, uid);
  execute format('create table backup.wallets_%s       as select * from public.wallets       where user_id = %L', stamp, uid);

  -- Delete: Needs review, then transactions, then transfers
  delete from public.failed_parses where user_id = uid; get diagnostics n_fp = row_count;
  delete from public.transactions  where user_id = uid; get diagnostics n_tx = row_count;
  delete from public.transfers     where user_id = uid; get diagnostics n_tr = row_count;

  raise notice 'Backed up to backup.*_%. Deleted % transactions, % transfers, % needs-review items.', stamp, n_tx, n_tr, n_fp;
end $$;

-- Check (run after): all three should be 0
--   select
--     (select count(*) from public.transactions  where user_id = 'YOUR-ID') as transactions_left,
--     (select count(*) from public.transfers     where user_id = 'YOUR-ID') as transfers_left,
--     (select count(*) from public.failed_parses where user_id = 'YOUR-ID') as needs_review_left;
--
-- OPTIONAL — fix a wallet's balance (MoMo is already right; leave it):
--   select id, name, current_balance from public.wallets where user_id = 'YOUR-ID';
--   update public.wallets set current_balance = 1394.51 where id = 'WALLET-ID';
--
-- UNDO — restore from a backup (use your stamp, e.g. 20261109_0735):
--   insert into public.transfers     select * from backup.transfers_STAMP;
--   insert into public.transactions  select * from backup.transactions_STAMP;
--   insert into public.failed_parses select * from backup.failed_parses_STAMP;
