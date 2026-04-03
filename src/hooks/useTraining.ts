import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  Scenario,
  TrainingSession,
  DailySummary,
  TraineeScenarioHistory,
  ChatMessage,
  Difficulty,
} from '@/lib/training-types'

// ── Helpers ─────────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function todayMidnightUTC(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// ── Edge Function Caller ────────────────────────────────────────────────────

export async function callTrainingChat(params: {
  system_prompt: string
  messages: ChatMessage[]
  is_opener: boolean
}): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/training-chat`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(body.error || `Edge function error: ${res.status}`)
  }

  const data = await res.json()
  return data.content
}

// ── Scenario Selection Algorithm ────────────────────────────────────────────

export function selectNextScenario(
  scenarios: Scenario[],
  history: TraineeScenarioHistory[],
  todaySessions: TrainingSession[],
  dailyTarget: number = 10
): Scenario | null {
  // Target mix: 30% hard, 30% medium, 40% easy
  const hardTarget = Math.ceil(dailyTarget * 0.3)
  const mediumTarget = Math.ceil(dailyTarget * 0.3)
  const easyTarget = dailyTarget - hardTarget - mediumTarget

  // Count today's completed by difficulty
  const todayCounts = { easy: 0, medium: 0, hard: 0 }
  for (const s of todaySessions) {
    const diff = s.scenario?.difficulty
    if (diff && diff in todayCounts) {
      todayCounts[diff as Difficulty]++
    }
  }

  // Calculate remaining per difficulty
  const remaining = {
    hard: Math.max(0, hardTarget - todayCounts.hard),
    medium: Math.max(0, mediumTarget - todayCounts.medium),
    easy: Math.max(0, easyTarget - todayCounts.easy),
  }

  // All done?
  if (remaining.hard + remaining.medium + remaining.easy === 0) return null

  // Pick difficulty with most remaining (ties: hard > medium > easy)
  let pickDifficulty: Difficulty = 'hard'
  if (remaining.medium > remaining[pickDifficulty]) pickDifficulty = 'medium'
  if (remaining.easy > remaining[pickDifficulty]) pickDifficulty = 'easy'
  // Re-check hard since it's preferred on ties
  if (remaining.hard >= remaining[pickDifficulty]) pickDifficulty = 'hard'

  // Filter to that difficulty
  const candidates = scenarios.filter(
    (s) => s.difficulty === pickDifficulty && s.active && s.approved
  )

  if (candidates.length === 0) {
    // Fallback: try any difficulty with remaining slots
    const fallbackDiffs: Difficulty[] = ['hard', 'medium', 'easy']
    for (const d of fallbackDiffs) {
      if (remaining[d] > 0) {
        const fallback = scenarios.filter((s) => s.difficulty === d && s.active && s.approved)
        if (fallback.length > 0) return pickFromCandidates(fallback, history, todaySessions)
      }
    }
    return null
  }

  return pickFromCandidates(candidates, history, todaySessions)
}

function pickFromCandidates(
  candidates: Scenario[],
  history: TraineeScenarioHistory[],
  todaySessions: TrainingSession[]
): Scenario | null {
  // Exclude scenarios used today
  const todayScenarioIds = new Set(todaySessions.map((s) => s.scenario_id))
  let filtered = candidates.filter((s) => !todayScenarioIds.has(s.id))

  // If all used today, allow recycling
  if (filtered.length === 0) filtered = candidates

  // Sort by least recently used, then least times used
  const historyMap = new Map(history.map((h) => [h.scenario_id, h]))

  filtered.sort((a, b) => {
    const ha = historyMap.get(a.id)
    const hb = historyMap.get(b.id)

    // Never used scenarios first
    if (!ha && hb) return -1
    if (ha && !hb) return 1
    if (!ha && !hb) return 0

    // Least recently used first
    const aTime = new Date(ha!.last_used_at).getTime()
    const bTime = new Date(hb!.last_used_at).getTime()
    if (aTime !== bTime) return aTime - bTime

    // Least times used
    return (ha!.times_used ?? 0) - (hb!.times_used ?? 0)
  })

  return filtered[0] ?? null
}

// ── Queries ─────────────────────────────────────────────────────────────────

async function fetchDailyStats(userId: string): Promise<DailySummary | null> {
  const { data, error } = await supabase
    .from('daily_summaries')
    .select('*')
    .eq('trainee_id', userId)
    .eq('date', todayString())
    .maybeSingle()

  if (error) throw error
  return data as DailySummary | null
}

export function useDailyStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['dailyStats', userId, todayString()],
    queryFn: () => fetchDailyStats(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

async function fetchTodaySessions(userId: string): Promise<TrainingSession[]> {
  const { data, error } = await supabase
    .from('training_sessions')
    .select('*, scenario:scenarios(*)')
    .eq('trainee_id', userId)
    .gte('started_at', todayMidnightUTC())
    .not('completed_at', 'is', null)
    .order('started_at', { ascending: false })

  if (error) throw error
  return data as TrainingSession[]
}

export function useTodaySessions(userId: string | undefined) {
  return useQuery({
    queryKey: ['todaySessions', userId, todayString()],
    queryFn: () => fetchTodaySessions(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

async function fetchTrainingSession(sessionId: string): Promise<TrainingSession> {
  const { data, error } = await supabase
    .from('training_sessions')
    .select('*, scenario:scenarios(*)')
    .eq('id', sessionId)
    .single()

  if (error) throw error
  return data as TrainingSession
}

export function useTrainingSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['trainingSession', sessionId],
    queryFn: () => fetchTrainingSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 10_000,
  })
}

async function fetchScenarios(): Promise<Scenario[]> {
  const { data, error } = await supabase
    .from('scenarios')
    .select('*')
    .eq('active', true)
    .order('difficulty', { ascending: true })

  if (error) throw error
  return data as Scenario[]
}

export function useScenarios() {
  return useQuery({
    queryKey: ['scenarios'],
    queryFn: fetchScenarios,
    staleTime: 5 * 60_000,
  })
}

async function fetchScenarioHistory(userId: string): Promise<TraineeScenarioHistory[]> {
  const { data, error } = await supabase
    .from('trainee_scenario_history')
    .select('*')
    .eq('trainee_id', userId)

  if (error) throw error
  return data as TraineeScenarioHistory[]
}

export function useScenarioHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['scenarioHistory', userId],
    queryFn: () => fetchScenarioHistory(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  })
}

// ── Mutations ───────────────────────────────────────────────────────────────

interface CreateSessionInput {
  trainee_id: string
  scenario_id: string
}

export function useCreateTrainingSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      const { data, error } = await supabase
        .from('training_sessions')
        .insert({
          trainee_id: input.trainee_id,
          scenario_id: input.scenario_id,
        })
        .select('*')
        .single()

      if (error) throw error
      return data as TrainingSession
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todaySessions'] })
    },
  })
}

interface UpdateSessionInput {
  id: string
  transcript?: ChatMessage[]
  exchange_count?: number
  completed_at?: string
}

export function useUpdateTrainingSession() {
  return useMutation({
    mutationFn: async (input: UpdateSessionInput) => {
      const { id, ...fields } = input
      const { data, error } = await supabase
        .from('training_sessions')
        .update(fields)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      return data as TrainingSession
    },
  })
}

interface EndSessionInput {
  session_id: string
  trainee_id: string
  scenario: Scenario
  daily_rep_target: number
}

export function useEndTrainingSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: EndSessionInput) => {
      // 1. Mark session complete
      const { error: sessionError } = await supabase
        .from('training_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', input.session_id)

      if (sessionError) throw sessionError

      // 2. Upsert daily summary
      const today = todayString()
      const diffKey = `${input.scenario.difficulty}_count` as
        | 'easy_count'
        | 'medium_count'
        | 'hard_count'

      // Fetch current summary
      const { data: existing } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('trainee_id', input.trainee_id)
        .eq('date', today)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('daily_summaries')
          .update({
            reps_completed: (existing.reps_completed ?? 0) + 1,
            [diffKey]: (existing[diffKey] ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('daily_summaries').insert({
          trainee_id: input.trainee_id,
          date: today,
          reps_completed: 1,
          reps_required: input.daily_rep_target,
          [diffKey]: 1,
        })
      }

      // 3. Upsert scenario history
      const { data: historyRow } = await supabase
        .from('trainee_scenario_history')
        .select('*')
        .eq('trainee_id', input.trainee_id)
        .eq('scenario_id', input.scenario.id)
        .maybeSingle()

      if (historyRow) {
        await supabase
          .from('trainee_scenario_history')
          .update({
            last_used_at: new Date().toISOString(),
            times_used: (historyRow.times_used ?? 0) + 1,
          })
          .eq('id', historyRow.id)
      } else {
        await supabase.from('trainee_scenario_history').insert({
          trainee_id: input.trainee_id,
          scenario_id: input.scenario.id,
        })
      }

      // 4. Increment scenario times_used
      const { data: scenarioRow } = await supabase
        .from('scenarios')
        .select('times_used')
        .eq('id', input.scenario.id)
        .single()

      if (scenarioRow) {
        await supabase
          .from('scenarios')
          .update({ times_used: (scenarioRow.times_used ?? 0) + 1 })
          .eq('id', input.scenario.id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyStats'] })
      queryClient.invalidateQueries({ queryKey: ['todaySessions'] })
      queryClient.invalidateQueries({ queryKey: ['scenarioHistory'] })
      queryClient.invalidateQueries({ queryKey: ['trainingSession'] })
    },
  })
}
