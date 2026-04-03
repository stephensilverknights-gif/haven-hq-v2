// Supabase Edge Function: hostaway-import
// Fetches conversations from Hostaway API, classifies them with Claude,
// and stores results in hostaway_imports for admin review.
//
// Adapted from the working Hostaway client at haven-turnover/api/lib/hostaway.js
// Uses OAuth2 client credentials flow (not static bearer token).
//
// Deploy:
//   supabase functions deploy hostaway-import
//
// Required secrets:
//   HOSTAWAY_CLIENT_ID  — Account ID (146903)
//   HOSTAWAY_API_SECRET  — API secret
//   ANTHROPIC_API_KEY    — For AI classification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HOSTAWAY_BASE = 'https://api.hostaway.com/v1'
const MIN_DELAY_MS = 500
// March 2025 cutoff — that's when Haven's brand voice took shape (Hannah took over)
const IMPORT_CUTOFF = '2025-03-01T00:00:00Z'

let lastRequestTime = 0

// ── Hostaway API helpers (ported from haven-turnover/api/lib/hostaway.js) ────

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

  if (!token) {
    throw new Error('Could not extract token from Hostaway auth response')
  }

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
      const wait = Math.pow(2, attempt + 2) * 1000
      await new Promise((r) => setTimeout(r, wait))
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

// ── Classification types ─────────────────────────────────────────────────────

interface ClassificationResult {
  worth_converting: boolean
  issue_type: string
  sentiment_score: number
  escalation_detected: boolean
  refund_requested: boolean
  review_threatened: boolean
  scenario_title: string | null
  scenario_brief: string | null
  scenario_difficulty: string | null
  guest_persona: string | null
  haven_standard: string | null
  reason: string
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify user auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get secrets
    const clientId = Deno.env.get('HOSTAWAY_CLIENT_ID')
    const apiSecret = Deno.env.get('HOSTAWAY_API_SECRET')
    if (!clientId || !apiSecret) {
      return new Response(JSON.stringify({ error: 'Hostaway credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(body.limit ?? 20, 50)

    // 1. Authenticate with Hostaway (OAuth2 client credentials)
    const hostawayToken = await authenticate(clientId, apiSecret)

    // 2. Fetch recent conversations
    const conversations = await apiGet(hostawayToken, '/conversations', {
      limit,
      sortOrder: 'desc',
      offset: 0,
    })

    const convList = Array.isArray(conversations) ? conversations : []

    // 3. Filter: only conversations after March 2025
    const cutoff = new Date(IMPORT_CUTOFF).getTime()
    const eligible = convList.filter((c: any) => {
      const date = new Date(c.insertedOn || c.created || '').getTime()
      return date >= cutoff
    })

    // 4. Check which ones we've already imported
    const convIds = eligible.map((c: any) => String(c.id))
    const { data: existingImports } = await supabase
      .from('hostaway_imports')
      .select('hostaway_conversation_id')
      .in('hostaway_conversation_id', convIds.length > 0 ? convIds : ['__none__'])

    const alreadyImported = new Set((existingImports ?? []).map((i: any) => i.hostaway_conversation_id))
    const toProcess = eligible.filter((c: any) => !alreadyImported.has(String(c.id)))

    if (toProcess.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No new conversations to import',
          processed: 0,
          imported: 0,
          converted: 0,
          total_eligible: eligible.length,
          already_imported: alreadyImported.size,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Process each conversation (cap at 10 per invocation to stay within edge function timeout)
    const results: { conversation_id: string; status: string; worth_converting: boolean }[] = []

    for (const conv of toProcess.slice(0, 10)) {
      try {
        // Fetch messages
        const messages = await apiGet(hostawayToken, `/conversations/${conv.id}/messages`, { limit: 100 })
        const msgList = Array.isArray(messages) ? messages : []

        // Skip very short conversations
        if (msgList.length < 4) {
          results.push({ conversation_id: String(conv.id), status: 'too_short', worth_converting: false })
          continue
        }

        // Build transcript
        const sorted = [...msgList].sort(
          (a: any, b: any) => new Date(a.insertedOn).getTime() - new Date(b.insertedOn).getTime()
        )
        const transcript = sorted
          .map((m: any) => `${m.isIncoming ? 'GUEST' : 'HOST'}: ${m.body || ''}`)
          .join('\n\n')

        const timestamps = sorted.map((m: any) => new Date(m.insertedOn).getTime())
        const dateStart = new Date(Math.min(...timestamps)).toISOString()
        const dateEnd = new Date(Math.max(...timestamps)).toISOString()

        const propertyName = conv.listingName || conv.listing?.name || null

        // 6. Classify with Claude
        const classifyPrompt = `You are analyzing a real guest conversation from Haven by Design Stays (premium short-term rentals) to determine if it would make a good training scenario.

CONVERSATION (Property: ${propertyName || 'Unknown'}):
${transcript}

Analyze this conversation and return ONLY valid JSON:
{
  "worth_converting": <true if this has a guest complaint, escalation, or tricky situation worth training on — false for routine check-in/checkout/logistics/positive reviews>,
  "issue_type": "<one of: maintenance, cleanliness, amenity_failure, lockout, noise, early_checkin, late_checkout, refund_demand, neighbor_complaint, booking_error, other>",
  "sentiment_score": <0.0 to 1.0 where 0=very negative, 0.5=neutral, 1.0=very positive>,
  "escalation_detected": <true if guest escalated or threatened>,
  "refund_requested": <true if guest asked for refund/discount>,
  "review_threatened": <true if guest threatened a bad review>,
  "scenario_title": "<short catchy title if worth converting, null otherwise>",
  "scenario_brief": "<2-3 sentence scenario brief for trainee if worth converting, null otherwise — describe the situation without revealing the resolution>",
  "scenario_difficulty": "<easy|medium|hard based on guest demeanor and complexity — null if not worth converting. Remember: most real guests are frustrated but human, not cartoonishly hostile. Hard = complex situation + strong emotions, not impossible rage.>",
  "guest_persona": "<1-2 sentence description of the guest's personality and emotional state for the AI to roleplay — null if not worth converting. Keep it realistic and human — follow the laws of humanity.>",
  "haven_standard": "<What Haven expects as the correct response for this type of issue — null if not worth converting>",
  "reason": "<brief explanation of your classification decision>"
}`

        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1500,
            temperature: 0.2,
            messages: [{ role: 'user', content: classifyPrompt }],
          }),
        })

        if (!anthropicRes.ok) {
          console.error('Claude classify error:', anthropicRes.status)
          results.push({ conversation_id: String(conv.id), status: 'classify_failed', worth_converting: false })
          continue
        }

        const anthropicData = await anthropicRes.json()
        const rawText = anthropicData.content?.[0]?.text ?? ''

        let classification: ClassificationResult
        try {
          const jsonStr = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
          classification = JSON.parse(jsonStr)
        } catch {
          console.error('Failed to parse classification:', rawText)
          results.push({ conversation_id: String(conv.id), status: 'parse_failed', worth_converting: false })
          continue
        }

        // 7. Store in hostaway_imports
        const rawTranscript = sorted.map((m: any) => ({
          role: m.isIncoming ? 'guest' : 'host',
          content: m.body || '',
          timestamp: m.insertedOn,
        }))

        await supabase.from('hostaway_imports').insert({
          hostaway_conversation_id: String(conv.id),
          hostaway_property_id: String(conv.listingMapId || ''),
          property_name: propertyName,
          raw_transcript: rawTranscript,
          message_count: msgList.length,
          date_range_start: dateStart,
          date_range_end: dateEnd,
          classified_issue_type: classification.issue_type,
          sentiment_score: classification.sentiment_score,
          escalation_detected: classification.escalation_detected,
          refund_requested: classification.refund_requested,
          review_threatened: classification.review_threatened,
          worth_converting: classification.worth_converting,
        })

        results.push({
          conversation_id: String(conv.id),
          status: 'imported',
          worth_converting: classification.worth_converting,
        })

        // 8. If worth converting, auto-create a draft scenario (unapproved, inactive)
        if (classification.worth_converting && classification.scenario_title) {
          const { data: newScenario } = await supabase
            .from('scenarios')
            .insert({
              title: classification.scenario_title,
              difficulty: classification.scenario_difficulty ?? 'medium',
              property: propertyName,
              issue_type: classification.issue_type ?? 'other',
              brief: classification.scenario_brief ?? '',
              guest_persona: classification.guest_persona ?? '',
              haven_standard: classification.haven_standard ?? '',
              source: 'hostaway',
              hostaway_conversation_id: String(conv.id),
              approved: false,
              active: false,
            })
            .select('id')
            .single()

          if (newScenario) {
            await supabase
              .from('hostaway_imports')
              .update({
                converted_to_scenario: true,
                scenario_id: newScenario.id,
              })
              .eq('hostaway_conversation_id', String(conv.id))
          }
        }
      } catch (err) {
        console.error(`Error processing conversation ${conv.id}:`, err)
        results.push({ conversation_id: String(conv.id), status: 'error', worth_converting: false })
      }
    }

    const imported = results.filter((r) => r.status === 'imported').length
    const converted = results.filter((r) => r.worth_converting).length

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} conversations. ${imported} imported, ${converted} worth converting.`,
        processed: results.length,
        imported,
        converted,
        results,
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
