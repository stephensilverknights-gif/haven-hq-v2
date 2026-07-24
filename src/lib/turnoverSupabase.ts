import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Second Supabase connection: the TURNOVER project (cleaning app + burn
// engine). HQ's own data lives in the main project (lib/supabase.ts); the
// restock_states snapshot is written by haven-burn-engine into the turnover
// project, so we read it from there. Null when the env vars aren't set —
// consumers surface a friendly "not configured" state instead of crashing.
const url = import.meta.env.VITE_TURNOVER_SUPABASE_URL
const anonKey = import.meta.env.VITE_TURNOVER_SUPABASE_ANON_KEY

export const turnoverSupabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null
