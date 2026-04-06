// Supabase Edge Function: hostaway-reservations
// Syncs reservations from Hostaway API → public.reservations table.
// Fetches past 7 days + next 30 days for a given property (or all mapped properties).
//
// Deploy: supabase functions deploy hostaway-reservations
// Required secrets: HOSTAWAY_CLIENT_ID, HOSTAWAY_API_SECRET

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HOSTAWAY_BASE = 'https://api.hostaway.com/v1'
const MIN_DELAY_MS = 500
let lastRequestTime = 0

async function rateLimit() {
  const elapsed = Date.now() - lastRequestTime
  if (elapsed < MIN_DELAY_MS) {
    await new Promise((r) => setTimeout(r, MIN_DELAY_MS - elapsed))
  }
  lastRequestTime = Date.now()
}

async function authenticate(clientId: string, apiSecret: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: apiSecret,
  })

  const res = await fetch(`${HOSTAWAY_BASE}/accessTokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Hostaway auth failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  const token =
    data.access_token ||
    data.token ||
    (data.result && (data.result.access_token || data.result.token))

  if (!token) throw new Error('Could not extract token from Hostaway auth response')
  return token
}

async function apiGet(token: string, endpoint: string, params: Record<string, string | number> = {}): Promise<any> {
  const url = new URL(`${HOSTAWAY_BASE}${endpoint}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
  })

  const MAX_RETRIES = 3
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await rateLimit()
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt + 2) * 1000))
      continue
    }
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Hostaway API error (${res.status}): ${text}`)
    }
    const data = await res.json()
    return data.result !== undefined ? data.result : data
  }
  throw new Error('Hostaway API: max retries exceeded')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role for writes to reservations table
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify user auth with anon client
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const clientId = Deno.env.get('HOSTAWAY_CLIENT_ID')
    const apiSecret = Deno.env.get('HOSTAWAY_API_SECRET')
    if (!clientId || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Hostaway credentials not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const propertyId: string | null = body.property_id ?? null

    // Get properties with hostaway_listing_id
    let query = supabaseAdmin.from('properties').select('id, hostaway_listing_id').not('hostaway_listing_id', 'is', null)
    if (propertyId) query = query.eq('id', propertyId)
    const { data: properties, error: propError } = await query
    if (propError) throw propError

    if (!properties || properties.length === 0) {
      return new Response(JSON.stringify({ error: 'No properties with Hostaway listing ID' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const hostawayToken = await authenticate(clientId, apiSecret)

    // Date range: 7 days back, 30 days forward
    const now = new Date()
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    let totalSynced = 0

    for (const prop of properties) {
      const listingId = prop.hostaway_listing_id
      if (!listingId) continue

      const reservations = await apiGet(hostawayToken, '/reservations', {
        listingId,
        startDate,
        endDate,
        limit: 100,
      })

      const resList = Array.isArray(reservations) ? reservations : []

      for (const res of resList) {
        const row = {
          id: String(res.id),
          property_id: prop.id,
          hostaway_listing_id: listingId,
          guest_name: [res.guestFirstName, res.guestLastName].filter(Boolean).join(' ') || res.guestName || null,
          guest_email: res.guestEmail || null,
          check_in: res.arrivalDate ? `${res.arrivalDate}T${res.checkInTime || '15:00'}:00` : null,
          check_out: res.departureDate ? `${res.departureDate}T${res.checkOutTime || '11:00'}:00` : null,
          status: res.status || null,
          raw_data: res,
          synced_at: new Date().toISOString(),
        }

        await supabaseAdmin.from('reservations').upsert(row, { onConflict: 'id' })
        totalSynced++
      }
    }

    return new Response(
      JSON.stringify({
        message: `Synced ${totalSynced} reservations across ${properties.length} properties`,
        synced: totalSynced,
        properties: properties.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
