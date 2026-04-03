// Supabase Edge Function: training-score
// Scores a completed training session using Anthropic API.
//
// Deploy:
//   supabase functions deploy training-score

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatMessage {
  role: 'guest' | 'trainee'
  content: string
  timestamp?: string
}

interface ScoreResult {
  overall: number
  grade: 'Excellent' | 'Good' | 'Needs Work' | 'Failing'
  criteria: {
    key: string
    name: string
    score: number
    pass: boolean
  }[]
  feedback: string
  coaching: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify auth
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

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request
    const { transcript, scenario_brief, haven_standard } = await req.json() as {
      transcript: ChatMessage[]
      scenario_brief: string
      haven_standard: string
    }

    if (!transcript || !scenario_brief || !haven_standard) {
      return new Response(JSON.stringify({ error: 'transcript, scenario_brief, and haven_standard are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Extract only trainee messages for scoring
    const traineeMessages = transcript
      .filter((m) => m.role === 'trainee')
      .map((m) => m.content)
      .join('\n\n')

    // Full transcript for context
    const fullTranscript = transcript
      .map((m) => `${m.role === 'guest' ? 'GUEST' : 'TRAINEE'}: ${m.content}`)
      .join('\n\n')

    const scorerPrompt = `You are a quality evaluator for Haven by Design Stays, a premium short-term rental company.

SCENARIO: ${scenario_brief}

HAVEN'S STANDARD FOR THIS ISSUE:
${haven_standard}

FULL CONVERSATION:
${fullTranscript}

TRAINEE RESPONSES ONLY (what you are scoring):
${traineeMessages}

Score on exactly these 5 criteria (0-20 each, 100 total):

1. EMPATHY FIRST — Acknowledged emotional state before solutions? Made the guest feel heard?
2. CONCRETE ACTION — Specific next step with a timeframe? Not "we'll look into it."
3. HAVEN TONE — Warm, human, non-corporate. Person who cares, not a policy bot.
4. APPROPRIATE RESOLUTION — Compensation/fix calibrated correctly? Not too little, not giving away the farm.
5. NO POLICY HIDING — Avoided using policy as a shield without offering alternatives?

Grading scale:
- 85-100: Excellent
- 70-84: Good
- 50-69: Needs Work
- 0-49: Failing

Return ONLY valid JSON, no markdown, no preamble:
{
  "overall": <0-100>,
  "grade": "<Excellent|Good|Needs Work|Failing>",
  "criteria": [
    {"key": "empathy_first", "name": "Empathy first", "score": <0-20>, "pass": <bool>},
    {"key": "concrete_action", "name": "Concrete action", "score": <0-20>, "pass": <bool>},
    {"key": "haven_tone", "name": "Haven tone", "score": <0-20>, "pass": <bool>},
    {"key": "appropriate_resolution", "name": "Appropriate resolution", "score": <0-20>, "pass": <bool>},
    {"key": "no_policy_hiding", "name": "No policy hiding", "score": <0-20>, "pass": <bool>}
  ],
  "feedback": "<2-3 sentences direct specific actionable feedback>",
  "coaching": "<1-2 sentences on what Haven specifically expects here>"
}`

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [{ role: 'user', content: scorerPrompt }],
      }),
    })

    if (!anthropicResponse.ok) {
      const errorBody = await anthropicResponse.text()
      console.error('Anthropic API error:', anthropicResponse.status, errorBody)
      return new Response(
        JSON.stringify({ error: 'AI scoring service error', details: errorBody }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const anthropicData = await anthropicResponse.json()
    const rawText = anthropicData.content?.[0]?.text ?? ''

    // Parse the JSON response — handle potential markdown wrapping
    let scoreResult: ScoreResult
    try {
      const jsonStr = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      scoreResult = JSON.parse(jsonStr)
    } catch {
      console.error('Failed to parse scoring response:', rawText)
      return new Response(
        JSON.stringify({ error: 'Failed to parse scoring response', raw: rawText }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(JSON.stringify(scoreResult), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
