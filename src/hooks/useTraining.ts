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

// ── Scoring Edge Function Caller ────────────────────────────────────────────

export interface ScoreCriterion {
  key: string
  name: string
  score: number
  pass: boolean
}

export interface ScoreResult {
  overall: number
  grade: 'Excellent' | 'Good' | 'Needs Work' | 'Failing'
  criteria: ScoreCriterion[]
  feedback: string
  coaching: string
}

export async function callTrainingScore(params: {
  transcript: ChatMessage[]
  scenario_brief: string
  haven_standard: string
}): Promise<ScoreResult> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/training-score`

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
    throw new Error(body.error || `Scoring error: ${res.status}`)
  }

  return await res.json()
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
  score?: ScoreResult
}

export function useEndTrainingSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: EndSessionInput) => {
      // 1. Mark session complete with scores
      const scoreFields = input.score
        ? {
            score_overall: input.score.overall,
            score_empathy: input.score.criteria.find((c) => c.key === 'empathy_first')?.score ?? null,
            score_action: input.score.criteria.find((c) => c.key === 'concrete_action')?.score ?? null,
            score_tone: input.score.criteria.find((c) => c.key === 'haven_tone')?.score ?? null,
            score_resolution: input.score.criteria.find((c) => c.key === 'appropriate_resolution')?.score ?? null,
            score_no_policy: input.score.criteria.find((c) => c.key === 'no_policy_hiding')?.score ?? null,
            grade: input.score.grade,
            feedback: input.score.feedback,
            coaching: input.score.coaching,
          }
        : {}

      const { error: sessionError } = await supabase
        .from('training_sessions')
        .update({
          completed_at: new Date().toISOString(),
          ...scoreFields,
        })
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
        const newReps = (existing.reps_completed ?? 0) + 1
        const scoreVal = input.score?.overall ?? null
        // Recalculate avg_score
        let newAvg = existing.avg_score
        if (scoreVal !== null) {
          const prevTotal = (existing.avg_score ?? 0) * (existing.reps_completed ?? 0)
          newAvg = Math.round(((prevTotal + scoreVal) / newReps) * 100) / 100
        }
        const newHighest = scoreVal !== null
          ? Math.max(existing.highest_score ?? 0, scoreVal)
          : existing.highest_score
        const newLowest = scoreVal !== null
          ? Math.min(existing.lowest_score ?? 100, scoreVal)
          : existing.lowest_score

        await supabase
          .from('daily_summaries')
          .update({
            reps_completed: newReps,
            [diffKey]: (existing[diffKey] ?? 0) + 1,
            avg_score: newAvg,
            highest_score: newHighest,
            lowest_score: newLowest,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('daily_summaries').insert({
          trainee_id: input.trainee_id,
          date: today,
          reps_completed: 1,
          reps_required: input.daily_rep_target,
          avg_score: input.score?.overall ?? null,
          highest_score: input.score?.overall ?? null,
          lowest_score: input.score?.overall ?? null,
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
        const scoreVal = input.score?.overall ?? null
        await supabase
          .from('trainee_scenario_history')
          .update({
            last_used_at: new Date().toISOString(),
            times_used: (historyRow.times_used ?? 0) + 1,
            latest_score: scoreVal,
            best_score: scoreVal !== null
              ? Math.max(historyRow.best_score ?? 0, scoreVal)
              : historyRow.best_score,
          })
          .eq('id', historyRow.id)
      } else {
        await supabase.from('trainee_scenario_history').insert({
          trainee_id: input.trainee_id,
          scenario_id: input.scenario.id,
          latest_score: input.score?.overall ?? null,
          best_score: input.score?.overall ?? null,
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
