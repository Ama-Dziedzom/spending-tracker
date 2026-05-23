import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FieldMap {
  amount: number
  balance: number | null
  description: number | null
  source: string
  flags?: string
  default_description?: string
  transfer_metadata?: {
    reference?: number | null
    phone?: number | null
    recipient?: number | null
  }
}

interface PatternRow {
  regex_pattern: string
  field_map: FieldMap
  transfer_type: string | null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { rawSms } = await req.json()

    if (!rawSms || typeof rawSms !== 'string') {
      return new Response(
        JSON.stringify({ error: 'rawSms is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const SUPABASE_URL = Deno.env.get('MY_SUPABASE_URL')
    const ANON_KEY = Deno.env.get('MY_ANON_KEY')

    if (!SUPABASE_URL || !ANON_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Load active patterns ordered by priority from DB (no service role needed — public SELECT policy)
    const patternsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/patterns?is_active=eq.true&order=priority.asc&select=regex_pattern,field_map,transfer_type`,
      {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
        },
      }
    )

    if (!patternsRes.ok) {
      const err = await patternsRes.text()
      throw new Error(`Failed to load patterns: ${err}`)
    }

    const patterns: PatternRow[] = await patternsRes.json()

    const cleanSms = rawSms.replace(/\r\n|\n|\r/g, ' ').replace(/\s+/g, ' ').trim()

    for (const pattern of patterns) {
      const flags = pattern.field_map.flags ?? 'i'
      const regex = new RegExp(pattern.regex_pattern, flags)
      const match = cleanSms.match(regex)

      if (!match) continue

      const fm = pattern.field_map

      const amount = parseFloat(match[fm.amount].replace(/,/g, ''))

      let description =
        fm.description && match[fm.description]
          ? match[fm.description].trim()
          : (fm.default_description ?? 'Transaction')

      const balance =
        fm.balance != null && match[fm.balance]
          ? parseFloat(match[fm.balance].replace(/,/g, ''))
          : null

      // Build transfer metadata when field_map encodes capture-group indices
      let transferMetadata: Record<string, string | null> | null = null
      if (pattern.transfer_type && fm.transfer_metadata) {
        const tm = fm.transfer_metadata
        const meta: Record<string, string | null> = {
          phone_number: tm.phone != null && match[tm.phone] ? match[tm.phone] : null,
          recipient_name: tm.recipient != null && match[tm.recipient] ? match[tm.recipient].trim() : null,
          reference: tm.reference != null && match[tm.reference] ? match[tm.reference].trim() : null,
        }
        if (Object.values(meta).some((v) => v !== null)) {
          transferMetadata = meta
        }
      }

      // Debit / credit detection — same heuristic as the original function
      let isDebit = false
      if (/\bdebit/i.test(cleanSms) || /\bdebited/i.test(cleanSms)) {
        isDebit = true
      } else if (
        /\bcredit/i.test(cleanSms) ||
        /\bcredited/i.test(cleanSms) ||
        /received for/i.test(cleanSms)
      ) {
        isDebit = false
      } else if (
        /\bsent\b|^payment made|^payment of|^payment for|^your payment|^Cash Out|paid to|withdrawal|transaction was made/i.test(
          cleanSms
        )
      ) {
        isDebit = true
      }

      const category = pattern.transfer_type
        ? 'Transfers'
        : categorizeTransaction(description, fm.source, cleanSms)

      return new Response(
        JSON.stringify({
          parsed: true,
          transaction: {
            transaction_date: new Date().toISOString(),
            amount,
            type: isDebit ? 'debit' : 'credit',
            source: fm.source,
            description,
            balance,
            category,
            is_transfer: !!pattern.transfer_type,
            transfer_type: pattern.transfer_type,
            transfer_metadata: transferMetadata,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No pattern matched
    return new Response(
      JSON.stringify({ parsed: false, reason: 'no_pattern_matched' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function categorizeTransaction(description: string, source: string, fullSms: string): string {
  const desc = description.toLowerCase()
  const sms = fullSms.toLowerCase()

  if (
    desc.includes('church') || desc.includes('offering') ||
    desc.includes('tithe') || desc.includes('donation') ||
    desc.includes('baptist') || desc.includes('chapel') ||
    desc.includes('calvary') || desc.includes('methodist')
  ) return 'Church & Charity'

  if (
    desc.includes('restaurant') || desc.includes('cafe') ||
    desc.includes('pizza') || desc.includes('kfc') ||
    desc.includes('food') || desc.includes('eatery')
  ) return 'Food & Dining'

  if (
    desc.includes('uber') || desc.includes('bolt') ||
    desc.includes('taxi') || desc.includes('fuel') ||
    desc.includes('transport') || desc.includes('yango')
  ) return 'Transportation'

  if (
    desc.includes('shop') || desc.includes('mall') ||
    desc.includes('store') || desc.includes('market')
  ) return 'Shopping'

  if (
    desc.includes('electricity') || desc.includes('water') ||
    desc.includes('internet') || desc.includes('airtime') ||
    desc.includes('ecg') || desc.includes('data')
  ) return 'Utilities & Bills'

  if (
    desc.includes('movie') || desc.includes('cinema') ||
    desc.includes('game') || desc.includes('club')
  ) return 'Entertainment'

  if (
    desc.includes('hospital') || desc.includes('clinic') ||
    desc.includes('medical') || desc.includes('doctor') ||
    desc.includes('pharmacy')
  ) return 'Health'

  if (
    desc.includes('school') || desc.includes('university') ||
    desc.includes('tuition') || desc.includes('fees')
  ) return 'Education'

  if (
    sms.includes('received') &&
    (desc.includes('salary') || desc.includes('wages') || desc.includes('payment'))
  ) return 'Income'

  if (
    desc.includes('atm') || desc.includes('withdrawal') ||
    sms.includes('cash withdrawal')
  ) return 'Cash Withdrawal'

  if (
    desc.includes('fee') || desc.includes('charge') ||
    desc.includes('commission')
  ) return 'Fees & Charges'

  return 'Other'
}
