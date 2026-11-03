-- LogIt: categories saved by the SMS API used display names ("Utilities & Bills",
-- "Transportation", "Transfers"…) that the app didn't recognise, so they showed
-- as "Other". The API now saves the app's category IDs. This fixes saved rows.
-- Safe to run more than once. Only touches SMS-logged rows for step 2.

-- 1. Old API names → app category IDs
UPDATE transactions SET category = CASE lower(category)
    WHEN 'food & dining'      THEN 'food'
    WHEN 'transportation'     THEN 'transport'
    WHEN 'shopping'           THEN 'shopping'
    WHEN 'utilities & bills'  THEN 'bills'
    WHEN 'entertainment'      THEN 'entertainment'
    WHEN 'health'             THEN 'healthcare'
    WHEN 'education'          THEN 'education'
    WHEN 'income'             THEN 'income'
    WHEN 'church & charity'   THEN 'gifts'
    WHEN 'transfers'          THEN 'transfer'
    WHEN 'cash withdrawal'    THEN 'other'
    WHEN 'fees & charges'     THEN 'other'
    WHEN 'other'              THEN 'other'
    ELSE category
  END
WHERE lower(category) IN (
  'food & dining','transportation','shopping','utilities & bills','entertainment','health',
  'education','income','church & charity','transfers','cash withdrawal','fees & charges','other'
);

-- 2. Re-categorise SMS-logged rows that ended up as "other" (or empty),
--    using the same signals as the API's new categoriser (simplified).
UPDATE transactions t SET category = sub.new_category
FROM (
  SELECT id,
    CASE
      WHEN type IN ('credit', 'income') THEN 'income'
      WHEN raw_sms ILIKE ANY (ARRAY['%cash out%', '%cashout%', '%withdrawal%', '% atm %']) THEN 'other'
      WHEN coalesce(description, '') || ' ' || raw_sms ILIKE ANY (ARRAY['%airtime%', '%bundle%', '%ecg%', '%electricity%', '%prepaid%', '%postpaid%', '%gwcl%', '%ghana water%', '%dstv%', '%gotv%', '%internet%', '%broadband%', '%surfline%']) THEN 'bills'
      WHEN description ILIKE ANY (ARRAY['%uber%', '%bolt%', '%yango%', '%taxi%', '%fuel%', '%goil%', '%shell%', '%total%', '%star oil%', '%transport%', '%stc%']) THEN 'transport'
      WHEN description ILIKE ANY (ARRAY['%restaurant%', '%food%', '%kfc%', '%pizza%', '%chicken%', '%papaye%', '%cafe%', '%coffee%', '%glovo%', '%eatery%', '%kitchen%']) THEN 'food'
      WHEN description ILIKE ANY (ARRAY['%shoprite%', '%melcom%', '%palace%', '%maxmart%', '%mall%', '%market%', '%store%', '%shop%', '%supermarket%', '%jumia%']) THEN 'shopping'
      WHEN description ILIKE ANY (ARRAY['%hospital%', '%clinic%', '%pharmacy%', '%chemist%', '%medical%', '%lab%', '%nhis%']) THEN 'healthcare'
      WHEN description ILIKE ANY (ARRAY['%school%', '%university%', '%college%', '%tuition%', '%fees%', '%academy%']) THEN 'education'
      WHEN description ILIKE ANY (ARRAY['%church%', '%chapel%', '%ministr%', '%tithe%', '%offering%', '%icgc%', '%temple%', '%pentecost%', '%methodist%', '%presby%']) THEN 'gifts'
      WHEN description ILIKE ANY (ARRAY['%netflix%', '%spotify%', '%showmax%', '%cinema%', '%silverbird%', '%betway%', '%sportybet%']) THEN 'entertainment'
      WHEN raw_sms ILIKE ANY (ARRAY['%you have sent%', '%transfer to%', '%sent to%']) THEN 'transfer'
      WHEN description ~ '^[A-Za-z''.-]+( [A-Za-z''.-]+){1,3}$'
       AND description !~* '(ltd|limited|enterprise|ventures|company|services|bank|pay|mtn|telecel|vodafone|ghana|momo|agency|station)' THEN 'transfer'
      ELSE 'other'
    END AS new_category
  FROM transactions
  WHERE raw_sms IS NOT NULL
    AND (category IS NULL OR category = '' OR category = 'other')
) sub
WHERE t.id = sub.id AND sub.new_category <> coalesce(t.category, '');
