import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { rawSms, accountId, secret } = await req.json()

    // Bug fix 1: secret from env, not hardcoded
    const SHORTCUT_SECRET = Deno.env.get('SHORTCUT_SECRET')
    if (!SHORTCUT_SECRET || secret !== SHORTCUT_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const SUPABASE_URL = Deno.env.get('MY_SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('MY_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error - missing credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Bug fix 2: derive userId from auth token only, never from request body
    const authHeader = req.headers.get('Authorization') ?? ''
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': authHeader,
      },
    })

    if (!userRes.ok) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid or missing auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userData = await userRes.json()
    if (!userData?.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Could not identify user' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const userId: string = userData.id

    // Bug fix 3: delegate parsing to parse-sms (no service role used there)
    const parseSmsUrl = `${SUPABASE_URL}/functions/v1/parse-sms`
    const parseRes = await fetch(parseSmsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ rawSms }),
    })

    if (!parseRes.ok) {
      throw new Error(`parse-sms returned ${parseRes.status}`)
    }

    const parseResult = await parseRes.json()

    if (!parseResult.parsed) {
      // Record the failure so the team can improve patterns
      await fetch(`${SUPABASE_URL}/rest/v1/failed_parses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          user_id: userId,
          raw_sms: rawSms,
          reason: parseResult.reason ?? 'no_pattern_matched',
        }),
      })

      return new Response(
        JSON.stringify({ error: 'Could not parse SMS', rawSms }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const transaction = parseResult.transaction

    // Insert transaction (STEP B — unchanged)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        ...transaction,
        raw_sms: rawSms,
        user_id: userId,
        account_id: accountId,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Database error: ${error}`)
    }

    const data = await response.json()

    // STEP C: Update account balance using SNAPSHOT SYNC (unchanged logic)
    if (accountId && transaction.balance !== null && transaction.balance !== undefined) {
      console.log(`✅ Snapshot sync: Account ${accountId} → GHS ${transaction.balance}`)

      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/accounts?id=eq.${accountId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            current_balance: transaction.balance,
            last_snapshot_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        }
      )

      if (!updateResponse.ok) {
        const updateError = await updateResponse.text()
        console.error('Error updating account with snapshot:', updateError)
      }
    } else if (accountId) {
      console.log(`⚠️ Math sync: Account ${accountId} (no snapshot available)`)

      const accountResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/accounts?id=eq.${accountId}&select=current_balance`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      )

      if (accountResponse.ok) {
        const accounts = await accountResponse.json()
        if (accounts && accounts.length > 0) {
          const currentBalance = accounts[0].current_balance || 0
          const isDebit = transaction.type === 'debit'
          const newBalance = isDebit
            ? currentBalance - transaction.amount
            : currentBalance + transaction.amount

          await fetch(`${SUPABASE_URL}/rest/v1/accounts?id=eq.${accountId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              current_balance: newBalance,
              updated_at: new Date().toISOString(),
            }),
          })
        }
      }
    }

    // Transfer matching (unchanged logic)
    let transferSuggestions: any[] = []
    if (transaction.is_transfer) {
      const pendingTransfersResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/transfers?status=eq.pending&select=*`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      )

      if (pendingTransfersResponse.ok) {
        const pendingTransfers = await pendingTransfersResponse.json()
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        transferSuggestions = pendingTransfers.filter((transfer: any) => {
          const amountDiff = Math.abs(transfer.amount - transaction.amount)
          const isRecent = transfer.created_at >= oneDayAgo
          return amountDiff < 5 && isRecent
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data,
        isTransfer: transaction.is_transfer,
        transferType: transaction.transfer_type,
        transferSuggestions: transferSuggestions.length > 0 ? transferSuggestions : null,
        snapshotUsed: transaction.balance !== null,
        balanceAfter: transaction.balance,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
