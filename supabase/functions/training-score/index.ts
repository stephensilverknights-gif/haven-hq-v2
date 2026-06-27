// Supabase Edge Function: training-score
// Scores a completed training session against Haven's voice-first rubric.
//
// 4 of 5 criteria evaluate language; only Concrete Action evaluates outcome.
// The Haven Voice Codex (principles, signature phrases, banned phrases,
// exemplars) is injected into the scorer prompt as ground truth, so
// judgments compare trainee phrasing against real Haven phrasing instead of
// abstract adjectives.
//
// Deploy:
//   supabase functions deploy training-score
//   (legacy JWT verify must stay OFF — auth handled internally)

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

interface HavenVoicePayload {
  principles?: string[]
  signature_phrases?: string[]
  banned_phrases?: string[]
  exemplars?: string[]
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

function formatList(items: string[] | undefined, fallback: string): string {
  if (!items || items.length === 0) return fallback
  return items.map((s) => `- ${s}`).join('\n')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const { transcript, scenario_brief, haven_standard, haven_voice } = await req.json() as {
      transcript: ChatMessage[]
      scenario_brief: string
      haven_standard: string
      haven_voice?: HavenVoicePayload
    }

    if (!transcript || !scenario_brief || !haven_standard) {
      return new Response(JSON.stringify({ error: 'transcript, scenario_brief, and haven_standard are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const traineeMessages = transcript
      .filter((m) => m.role === 'trainee')
      .map((m) => m.content)
      .join('\n\n')

    const fullTranscript = transcript
      .map((m) => `${m.role === 'guest' ? 'GUEST' : 'TRAINEE'}: ${m.content}`)
      .join('\n\n')

    const principlesBlock = formatList(
      haven_voice?.principles,
      '- Lead with the human, not the policy.\n- Use specific timeframes, never vague reassurance.\n- Speak in first person — "I\'m on it", not "the team will look into it".\n- Match the moment: warm, never saccharine; serious, never stiff.'
    )
    const signatureBlock = formatList(
      haven_voice?.signature_phrases,
      '(none provided — judge by principles)'
    )
    const bannedBlock = formatList(
      haven_voice?.banned_phrases,
      '(none provided — flag corporate phrasing by ear)'
    )
    const exemplarsBlock = formatList(
      haven_voice?.exemplars,
      '(none provided)'
    )

    const scorerPrompt = `You are a quality evaluator for Haven by Design Stays, a premium short-term rental company.

The team is being trained to speak in Haven's voice. This rubric weights LANGUAGE over OUTCOME — 4 of 5 criteria evaluate how the trainee speaks, not whether they "solved" anything. Resolution skill is trained separately.

═══════════════════════════════════════════
HAVEN VOICE CODEX (ground truth)
═══════════════════════════════════════════

VOICE PRINCIPLES:
${principlesBlock}

SIGNATURE PHRASES (how Haven actually talks):
${signatureBlock}

BANNED / CORPORATE PHRASES (always penalize):
${bannedBlock}

EXEMPLAR LINES from real Haven conversations:
${exemplarsBlock}

═══════════════════════════════════════════
SCENARIO
═══════════════════════════════════════════

${scenario_brief}

OPERATIONAL STANDARD (for action criterion only — do NOT use as voice reference):
${haven_standard}

═══════════════════════════════════════════
CONVERSATION
═══════════════════════════════════════════

${fullTranscript}

TRAINEE RESPONSES ONLY (this is what you score):
${traineeMessages}

═══════════════════════════════════════════
RUBRIC — score each criterion 0-20 (100 total)
═══════════════════════════════════════════

1. WARMTH & EMPATHY (0-20) — LANGUAGE
   Did they acknowledge the human before the ticket? Land the emotion before the logistics? Make the guest feel heard, not processed?
   - Compare against signature phrases for openings/acknowledgments.

2. SPECIFICITY (0-20) — LANGUAGE
   Concrete language, no corporate hedging, no policy-shield phrasing. Real words for real things.
   - HARD RULE: if the trainee uses ANY banned/corporate phrase, this score MUST be ≤ 8.

3. OWNERSHIP VOICE (0-20) — LANGUAGE
   First-person, accountable. "I'm on it" / "I'll have someone over in 30 minutes" — NOT "the team will look into this" / "we'll get back to you" / passive deflection.

4. TONE CALIBRATION (0-20) — LANGUAGE
   Does the tone match the moment? Not over-cheery when the guest is frustrated. Not stiff/formal with a relaxed guest. Reads the room.

5. CONCRETE ACTION (0-20) — OUTCOME
   Did they actually move it forward — a real next step with a real timeframe? Vague "we'll look into it" is NOT a concrete action.

Grade by overall score:
- 85-100: Excellent
- 70-84: Good
- 50-69: Needs Work
- 0-49: Failing

Return ONLY valid JSON, no markdown, no preamble:
{
  "overall": <0-100>,
  "grade": "<Excellent|Good|Needs Work|Failing>",
  "criteria": [
    {"key": "warmth_empathy", "name": "Warmth & Empathy", "score": <0-20>, "pass": <bool>},
    {"key": "specificity", "name": "Specificity", "score": <0-20>, "pass": <bool>},
    {"key": "ownership_voice", "name": "Ownership Voice", "score": <0-20>, "pass": <bool>},
    {"key": "tone_calibration", "name": "Tone Calibration", "score": <0-20>, "pass": <bool>},
    {"key": "concrete_action", "name": "Concrete Action", "score": <0-20>, "pass": <bool>}
  ],
  "feedback": "<2-3 sentences direct, specific, actionable. Quote the trainee's phrasing where useful. Focus on voice.>",
  "coaching": "<1-2 sentences on what Haven specifically expects here — language, not just resolution.>"
}

A criterion passes when score >= 12 (60%).`

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
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
