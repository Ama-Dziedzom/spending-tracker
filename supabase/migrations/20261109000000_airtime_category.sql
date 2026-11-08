-- LogIt v1: "Airtime & Data" is its own category (id 'airtime'), as in the
-- design (docs/design-handoff.md §3, cat/airtime). Until now airtime and data
-- bundles were saved as 'bills' (API) or could match 'subscription' (app).
-- This moves those rows. Safe to run more than once.
--
-- Rows that mention home utilities or internet are left alone, so ECG prepaid,
-- water, TV and broadband stay in Bills.

UPDATE transactions
SET category = 'airtime'
WHERE category IN ('bills', 'subscription', 'other')
  AND type IN ('expense', 'debit')
  AND (coalesce(description, '') || ' ' || coalesce(raw_sms, '')) ILIKE ANY (ARRAY[
    '%airtime%', '%bundle%', '%mobile data%', '%top up%', '%top-up%', '%topup%', '%recharge%'
  ])
  AND NOT ((coalesce(description, '') || ' ' || coalesce(raw_sms, '')) ILIKE ANY (ARRAY[
    '%ecg%', '%electricity%', '%gwcl%', '%ghana water%', '%dstv%', '%gotv%', '%startimes%',
    '%broadband%', '%fibre%', '%surfline%', '%nedco%'
  ]));
