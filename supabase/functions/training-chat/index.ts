// Supabase Edge Function: training-chat
// Proxies Anthropic API calls for the guest AI engine.
//
// Deploy:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy training-chat

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

interface RequestBody {
  system_prompt: string
  messages: ChatMessage[]
  is_opener: boolean
}

Deno.serve(async (req: Request) => {
  // CORS preflight
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

    // Get API key
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request
    const { system_prompt, messages, is_opener } = (await req.json()) as RequestBody

    if (!system_prompt) {
      return new Response(JSON.stringify({ error: 'system_prompt is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build Anthropic messages
    // The AI plays the guest (assistant role), trainee messages are user role
    let anthropicMessages: { role: string; content: string }[]

    if (is_opener) {
      // For the opening message, prompt the AI to start the conversation
      anthropicMessages = [
        {
          role: 'user',
          content: 'Begin the conversation. Send your opening message as the guest reaching out about your issue. Stay in character.',
        },
      ]
    } else {
      // Map conversation history
      anthropicMessages = messages.map((msg) => ({
        role: msg.role === 'guest' ? 'assistant' : 'user',
        content: msg.content,
      }))
    }

    // Call Anthropic API
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        temperature: 0.8,
        system: system_prompt,
        messages: anthropicMessages,
      }),
    })

    if (!anthropicResponse.ok) {
      const errorBody = await anthropicResponse.text()
      console.error('Anthropic API error:', anthropicResponse.status, errorBody)
      return new Response(
        JSON.stringify({ error: 'AI service error', details: errorBody }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const anthropicData = await anthropicResponse.json()
    const content = anthropicData.content?.[0]?.text ?? ''

    return new Response(JSON.stringify({ content }), {
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
