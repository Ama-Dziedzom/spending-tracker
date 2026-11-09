-- LogIt: one payment, two messages.
--
-- Some services send their own notice when they debit your wallet (Hubtel:
-- "Your Mobile Money wallet has been debited directly…", no transaction ID,
-- no balance) alongside the provider's payment SMS ("Payment for GHS…
-- Transaction Id…"). The API keeps the payment and stores the notice's text
-- here instead of logging it as a second spend. Also used to recognise the
-- notice if it's shared again.
-- Safe to run more than once.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notice_sms TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_user_notice_sms
  ON transactions (user_id, notice_sms)
  WHERE notice_sms IS NOT NULL;
