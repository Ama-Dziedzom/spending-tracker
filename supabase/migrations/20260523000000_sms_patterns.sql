-- =============================================================================
-- SMS Patterns: dynamic pattern matching + failed parse tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS patterns (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_name TEXT        NOT NULL,
  institution_code TEXT        NOT NULL,
  regex_pattern    TEXT        NOT NULL,
  -- field_map keys: amount (int), balance (int|null), description (int|null),
  --   source (str), flags (str), default_description (str),
  --   transfer_metadata: { reference, phone, recipient } (int|null each)
  field_map        JSONB       NOT NULL DEFAULT '{}',
  transfer_type    TEXT        CHECK (transfer_type IN ('transfer_in', 'transfer_out', 'transfer')),
  priority         INTEGER     NOT NULL DEFAULT 100,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  contributed_by   UUID        REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS failed_parses (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES auth.users(id),
  raw_sms    TEXT        NOT NULL,
  reason     TEXT        NOT NULL DEFAULT 'no_pattern_matched',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patterns_active_priority ON patterns(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_patterns_institution     ON patterns(institution_code);
CREATE INDEX IF NOT EXISTS idx_failed_parses_user       ON failed_parses(user_id);
CREATE INDEX IF NOT EXISTS idx_failed_parses_created    ON failed_parses(created_at DESC);

ALTER TABLE patterns     ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_parses ENABLE ROW LEVEL SECURITY;

-- Patterns are not sensitive — any caller (including anon) can SELECT active rows.
-- Only service role (bypasses RLS) may INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS "Public read active patterns" ON patterns;
CREATE POLICY "Public read active patterns" ON patterns
  FOR SELECT USING (is_active = true);

-- Users see only their own failed parse records.
DROP POLICY IF EXISTS "Users view own failed parses" ON failed_parses;
CREATE POLICY "Users view own failed parses" ON failed_parses
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own failed parse records (e.g. from the mobile app).
DROP POLICY IF EXISTS "Users insert own failed parses" ON failed_parses;
CREATE POLICY "Users insert own failed parses" ON failed_parses
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- Seed: migrate existing hardcoded patterns (priority order matches original)
-- Transfer patterns first (10–17), then regular (50–60).
-- field_map.source must match the source string stored in transactions.source.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM patterns LIMIT 1) THEN
    INSERT INTO patterns
      (institution_name, institution_code, regex_pattern, field_map, transfer_type, priority)
    VALUES

-- ── MTN MoMo ─────────────────────────────────────────────────────────────────

(
  'MTN Mobile Money',
  'mtn_momo',
  'Payment received for\s+GHS\s?([\d,]+\.?\d*)\s+from\s+(Emergent Payments|Instant Pay|STANBIC|GCB|UBA|ABSA|ECOBANK|FIDELITY|CAL BANK).*?Reference:\s*(.+?),(\d{10,12}),(.+?)\s+from.*?Current Balance:\s*GHS\s?([\d,]+\.?\d*)',
  '{"amount":1,"description":2,"balance":6,"source":"MTN_MoMo","flags":"i","transfer_metadata":{"reference":3,"phone":4,"recipient":5}}',
  'transfer_in',
  10
),

(
  'MTN Mobile Money',
  'mtn_momo',
  '(?:Payment made for|Transfer of|Payment for)\s+GHS\s?([\d,]+\.?\d*)\s+to\s+(?:Instant Pay|Bank|Account).*?Current Balance:\s*GHS\s?([\d,]+\.?\d*)',
  '{"amount":1,"description":null,"balance":2,"source":"MTN_MoMo","flags":"i","default_description":"Transfer Out"}',
  'transfer_out',
  11
),

-- ── Standard Chartered ───────────────────────────────────────────────────────

(
  'Standard Chartered Bank',
  'stanchart',
  'GHS\s?([\d,]+\.?\d*)\s+was credited to your (?:Acc|Account).*?(?:being|from)\s+(?:Instant Pay|Mobile Money|MoMo):\s*(\d{12})\s+(.+?)\.\s+Your available balance is now GHS\s?([\d,]+\.?\d*)',
  '{"amount":1,"description":3,"balance":4,"source":"StanChart","flags":"i","transfer_metadata":{"phone":2,"recipient":3}}',
  'transfer_in',
  12
),

(
  'Standard Chartered Bank',
  'stanchart',
  'GHS\s?([\d,]+\.?\d*)\s+was debited from your (?:Acc|Account).*?(?:for|being)\s+(?:Instant Pay|Mobile Money|MoMo):\s*(\d{12})\s+(.+?)\.\s+Your available balance is now GHS\s?([\d,]+\.?\d*)',
  '{"amount":1,"description":3,"balance":4,"source":"StanChart","flags":"i","transfer_metadata":{"phone":2,"recipient":3}}',
  'transfer_out',
  13
),

-- ── Telecel Cash (formerly Vodafone Cash) ─────────────────────────────────────

(
  'Telecel Cash',
  'telecel_cash',
  'Payment.+?GHS\s?([\d,]+\.?\d*)\s+from\s+(Mobile Money|Instant Pay|Bank Transfer).*?Current Balance:\s+GHS\s?([\d,]+\.?\d*)',
  '{"amount":1,"description":2,"balance":3,"source":"Vodafone_Cash","flags":"i"}',
  'transfer_in',
  14
),

-- ── AirtelTigo Money ─────────────────────────────────────────────────────────

(
  'AirtelTigo Money',
  'airteltigo',
  'you have received\s+GHS\s?([\d,]+\.?\d*)\s+from\s+(Bank Transfer|Instant Pay).*?Curr Bal:\s*GH[CS]\s?([\d,]+\.?\d*)',
  '{"amount":1,"description":2,"balance":3,"source":"AirtelTigo_Money","flags":"i"}',
  'transfer_in',
  15
),

-- ── GCB Bank ─────────────────────────────────────────────────────────────────

(
  'GCB Bank',
  'gcb',
  '(?:debited|credited)\s+with\s+amount\s+of\s*:\s*([\d,]+\.?\d*)\s+GHANA CEDIS.+?(?:INSTANT PAY|MOBILE MONEY|MOMO).+?balance\s+is\s+([\d,]+\.?\d*)\s+GHANA CEDIS',
  '{"amount":1,"description":null,"balance":2,"source":"GCBBank","flags":"i","default_description":"Transfer"}',
  'transfer',
  16
),

-- ── UBA Ghana ────────────────────────────────────────────────────────────────

(
  'UBA Ghana',
  'uba',
  'A\/C:.+?(?:CREDIT|DEBIT):GHS\s?([\d,]+\.?\d*)\s+Desc:\s*(?:INSTANT PAY|MOBILE MONEY|MOMO).+?(?:ClrBal|Bal):GHS\s?([\d,]+\.?\d*)',
  '{"amount":1,"description":null,"balance":2,"source":"UBAGHANA","flags":"i","default_description":"Transfer"}',
  'transfer',
  17
),

-- ── Regular (non-transfer) patterns ──────────────────────────────────────────

(
  'MTN Mobile Money',
  'mtn_momo',
  '(?:Cash Out made for|Payment received for|Payment made for|Payment for|Your payment of|You have (?:sent|received|paid))\s+GHS\s?([\d,]+\.?\d*)\s+(?:to|from)\s+(.+?)(?:\.|Current Balance).*?(?:Current Balance|new balance|Balance):\s*GHS\s?([\d,]+\.?\d*)',
  '{"amount":1,"description":2,"balance":3,"source":"MTN_MoMo","flags":"i"}',
  NULL,
  50
),

(
  'Standard Chartered Bank',
  'stanchart',
  'GHS\s?([\d,]+\.?\d*)\s+was debited from your (?:Acc|Account).*?(?:for|to)\s+(?!Instant Pay|Mobile Money|MoMo)(.+?)\.\s+Your available balance is now GHS\s?([\d,]+\.?\d*)',
  '{"amount":1,"description":2,"balance":3,"source":"StanChart","flags":"i"}',
  NULL,
  51
),

(
  'Standard Chartered Bank',
  'stanchart',
  'GHS\s?([\d,]+\.?\d*)\s+was credited to your (?:Acc|Account).*?from\s+(?!Instant Pay|Mobile Money|MoMo)(.+?)\.\s+Your available balance is now GHS\s?([\d,]+\.?\d*)',
  '{"amount":1,"description":2,"balance":3,"source":"StanChart","flags":"i"}',
  NULL,
  52
),

(
  'Standard Chartered Bank',
  'stanchart',
  'GHS\s?([\d,]+\.?\d*)\s+was debited.+?for\s+(?:ATM|Cash Withdrawal).+?at\s+(.+?)\.\s+Your available balance is now GHS\s?([\d,]+\.?\d*)',
  '{"amount":1,"description":2,"balance":3,"source":"StanChart","flags":"i"}',
  NULL,
  53
),

(
  'Standard Chartered Bank',
  'stanchart',
  'GHS\s?([\d,]+\.?\d*)\s+transaction was made on card.+?at\s+(.+?)\s+on',
  '{"amount":1,"description":2,"balance":null,"source":"StanChart","flags":"i"}',
  NULL,
  54
),

(
  'Telecel Cash',
  'telecel_cash',
  '(?:Payment).+?GHS\s?([\d,]+\.?\d*)\s+(?:to|from)\s+(.+?)\s+Current Balance:\s+GHS\s?([\d,]+\.?\d*)\s*\.\s*Available Balance',
  '{"amount":1,"description":2,"balance":3,"source":"Vodafone_Cash","flags":"i"}',
  NULL,
  55
),

(
  'AirtelTigo Money',
  'airteltigo',
  'you have received\s+GHS\s?([\d,]+\.?\d*)\s+from\s+(.+?)\s+in reference to.+?Curr Bal:\s*GH[CS]\s?([\d,]+\.?\d*)',
  '{"amount":1,"description":2,"balance":3,"source":"AirtelTigo_Money","flags":"i"}',
  NULL,
  56
),

(
  'AirtelTigo Money',
  'airteltigo',
  'you have sent\s+GHS\s?([\d,]+\.?\d*)\s+to\s+(.+?)(?:,|mobile money).+?Curr Bal:\s*GH[CS]\s?([\d,]+\.?\d*)',
  '{"amount":1,"description":2,"balance":3,"source":"AirtelTigo_Money","flags":"i"}',
  NULL,
  57
),

(
  'AirtelTigo Money',
  'airteltigo',
  'You have paid\s+GHS\s?([\d,]+\.?\d*)\s+to\s+(.+?)\s+in reference to.+?new balance is\s+GHS\s?([\d,]+\.?\d*)',
  '{"amount":1,"description":2,"balance":3,"source":"AirtelTigo_Money","flags":"i"}',
  NULL,
  58
),

(
  'GCB Bank',
  'gcb',
  '(?:debited|credited)\s+with\s+amount\s+of\s*:\s*([\d,]+\.?\d*)\s+GHANA CEDIS.+?balance\s+is\s+([\d,]+\.?\d*)\s+GHANA CEDIS',
  '{"amount":1,"description":null,"balance":2,"source":"GCBBank","flags":"i","default_description":"Card Transaction"}',
  NULL,
  59
),

(
  'UBA Ghana',
  'uba',
  'A\/C:.+?(?:CREDIT|DEBIT):GHS\s?([\d,]+\.?\d*)\s+Desc:\s*(.+?)\s+(?:ClrBal|Bal):GHS\s?([\d,]+\.?\d*)',
  '{"amount":1,"description":2,"balance":3,"source":"UBAGHANA","flags":"i"}',
  NULL,
  60
);
  END IF;
END $$;
