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

// ── Weekly Progress ─────────────────────────────────────────────────────────

export interface WeeklyProgress {
  thisWeek: { reps: number; avgScore: number | null; sessions: number }
  lastWeek: { reps: number; avgScore: number | null; sessions: number }
}

function getWeekBounds(weeksAgo: number): { start: string; end: string } {
  const now = new Date()
  // Start of this week (Monday)
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - mondayOffset - weeksAgo * 7)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 7)

  return { start: monday.toISOString(), end: sunday.toISOString() }
}

export function useWeeklyProgress(userId: string | undefined) {
  return useQuery<WeeklyProgress>({
    queryKey: ['weeklyProgress', userId],
    enabled: !!userId,
    queryFn: async () => {
      const thisWeekBounds = getWeekBounds(0)
      const lastWeekBounds = getWeekBounds(1)

      const [thisWeekRes, lastWeekRes] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('score_overall')
          .eq('trainee_id', userId!)
          .not('completed_at', 'is', null)
          .not('score_overall', 'is', null)
          .gte('completed_at', thisWeekBounds.start)
          .lt('completed_at', thisWeekBounds.end),
        supabase
          .from('training_sessions')
          .select('score_overall')
          .eq('trainee_id', userId!)
          .not('completed_at', 'is', null)
          .not('score_overall', 'is', null)
          .gte('completed_at', lastWeekBounds.start)
          .lt('completed_at', lastWeekBounds.end),
      ])

      const thisWeekSessions = thisWeekRes.data ?? []
      const lastWeekSessions = lastWeekRes.data ?? []

      const calcAvg = (sessions: { score_overall: number | null }[]) => {
        const scores = sessions.map((s) => s.score_overall).filter((s): s is number => s != null)
        return scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null
      }

      return {
        thisWeek: { reps: thisWeekSessions.length, avgScore: calcAvg(thisWeekSessions), sessions: thisWeekSessions.length },
        lastWeek: { reps: lastWeekSessions.length, avgScore: calcAvg(lastWeekSessions), sessions: lastWeekSessions.length },
      }
    },
    staleTime: 60_000,
  })
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

// ── Admin: All Scenarios + Haven Standards ───────────────────────────────────

async function fetchAllScenarios(): Promise<Scenario[]> {
  const { data, error } = await supabase
    .from('scenarios')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Scenario[]
}

export function useAllScenarios() {
  return useQuery({
    queryKey: ['allScenarios'],
    queryFn: fetchAllScenarios,
    staleTime: 30_000,
  })
}

import type { HavenStandard, HostawayImport } from '@/lib/training-types'

async function fetchHavenStandards(): Promise<HavenStandard[]> {
  const { data, error } = await supabase
    .from('haven_standards')
    .select('*')
    .order('issue_type', { ascending: true })

  if (error) throw error
  return data as HavenStandard[]
}

export function useHavenStandards() {
  return useQuery({
    queryKey: ['havenStandards'],
    queryFn: fetchHavenStandards,
    staleTime: 60_000,
  })
}

// ── Leaderboard & History ────────────────────────────────────────────────────

export interface LeaderboardEntry {
  trainee_id: string
  name: string
  initials: string
  total_reps: number
  avg_score: number | null
  excellent_count: number
  best_score: number | null
}

export type LeaderboardPeriod = 'today' | 'week' | 'all'

function getDateRangeStart(period: LeaderboardPeriod): string | null {
  if (period === 'all') return null
  const d = new Date()
  if (period === 'today') {
    d.setHours(0, 0, 0, 0)
  } else {
    // Start of current week (Monday)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
  }
  return d.toISOString()
}

async function fetchLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  // Fetch all completed sessions with profile data
  let query = supabase
    .from('training_sessions')
    .select('trainee_id, score_overall, grade, completed_at, profiles!inner(name, initials)')
    .not('completed_at', 'is', null)
    .not('score_overall', 'is', null)

  const rangeStart = getDateRangeStart(period)
  if (rangeStart) {
    query = query.gte('completed_at', rangeStart)
  }

  const { data, error } = await query

  if (error) throw error
  if (!data || data.length === 0) return []

  // Aggregate per trainee
  const map = new Map<string, {
    name: string
    initials: string
    scores: number[]
    excellentCount: number
  }>()

  for (const row of data as any[]) {
    const tid = row.trainee_id as string
    const profile = row.profiles as { name: string; initials: string }
    if (!map.has(tid)) {
      map.set(tid, {
        name: profile.name,
        initials: profile.initials,
        scores: [],
        excellentCount: 0,
      })
    }
    const entry = map.get(tid)!
    if (row.score_overall != null) {
      entry.scores.push(row.score_overall as number)
    }
    if (row.grade === 'Excellent') {
      entry.excellentCount++
    }
  }

  const entries: LeaderboardEntry[] = []
  for (const [tid, v] of map) {
    const avg = v.scores.length > 0
      ? Math.round((v.scores.reduce((a, b) => a + b, 0) / v.scores.length) * 10) / 10
      : null
    const best = v.scores.length > 0 ? Math.max(...v.scores) : null
    entries.push({
      trainee_id: tid,
      name: v.name,
      initials: v.initials,
      total_reps: v.scores.length,
      avg_score: avg,
      excellent_count: v.excellentCount,
      best_score: best,
    })
  }

  // Sort by avg_score desc, then total_reps desc
  entries.sort((a, b) => {
    if ((b.avg_score ?? 0) !== (a.avg_score ?? 0)) return (b.avg_score ?? 0) - (a.avg_score ?? 0)
    return b.total_reps - a.total_reps
  })

  return entries
}

export function useLeaderboard(period: LeaderboardPeriod) {
  return useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => fetchLeaderboard(period),
    staleTime: 30_000,
  })
}

export interface HistorySession {
  id: string
  scenario_title: string
  difficulty: string
  score_overall: number | null
  grade: string | null
  exchange_count: number
  completed_at: string
  score_empathy: number | null
  score_action: number | null
  score_tone: number | null
  score_resolution: number | null
  score_no_policy: number | null
}

async function fetchTraineeHistory(userId: string): Promise<HistorySession[]> {
  const { data, error } = await supabase
    .from('training_sessions')
    .select('id, score_overall, grade, exchange_count, completed_at, score_empathy, score_action, score_tone, score_resolution, score_no_policy, scenario:scenarios(title, difficulty)')
    .eq('trainee_id', userId)
    .not('completed_at', 'is', null)
    .not('score_overall', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(50)

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    id: row.id,
    scenario_title: row.scenario?.title ?? 'Unknown',
    difficulty: row.scenario?.difficulty ?? 'medium',
    score_overall: row.score_overall,
    grade: row.grade,
    exchange_count: row.exchange_count ?? 0,
    completed_at: row.completed_at,
    score_empathy: row.score_empathy,
    score_action: row.score_action,
    score_tone: row.score_tone,
    score_resolution: row.score_resolution,
    score_no_policy: row.score_no_policy,
  }))
}

export function useTraineeHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['traineeHistory', userId],
    queryFn: () => fetchTraineeHistory(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

// ── Admin Queries ────────────────────────────────────────────────────────────

import type { Profile } from '@/lib/types'

async function fetchTeamProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data as Profile[]
}

export function useTeamProfiles() {
  return useQuery({
    queryKey: ['teamProfiles'],
    queryFn: fetchTeamProfiles,
    staleTime: 60_000,
  })
}

async function fetchTeamDailySummaries(date: string): Promise<DailySummary[]> {
  const { data, error } = await supabase
    .from('daily_summaries')
    .select('*')
    .eq('date', date)

  if (error) throw error
  return data as DailySummary[]
}

export function useTeamDailySummaries(date: string) {
  return useQuery({
    queryKey: ['teamDailySummaries', date],
    queryFn: () => fetchTeamDailySummaries(date),
    staleTime: 30_000,
  })
}

async function fetchTraineeSessions(userId: string): Promise<TrainingSession[]> {
  const { data, error } = await supabase
    .from('training_sessions')
    .select('*, scenario:scenarios(*)')
    .eq('trainee_id', userId)
    .not('completed_at', 'is', null)
    .not('score_overall', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(30)

  if (error) throw error
  return data as TrainingSession[]
}

export function useTraineeSessions(userId: string | undefined) {
  return useQuery({
    queryKey: ['traineeSessions', userId],
    queryFn: () => fetchTraineeSessions(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

// ── In-Progress Session Detection ────────────────────────────────────────────

async function fetchInProgressSession(userId: string): Promise<TrainingSession | null> {
  const { data, error } = await supabase
    .from('training_sessions')
    .select('*, scenario:scenarios(*)')
    .eq('trainee_id', userId)
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as TrainingSession | null
}

export function useInProgressSession(userId: string | undefined) {
  return useQuery({
    queryKey: ['inProgressSession', userId],
    queryFn: () => fetchInProgressSession(userId!),
    enabled: !!userId,
    staleTime: 10_000,
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
      queryClient.invalidateQueries({ queryKey: ['inProgressSession'] })
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
      queryClient.invalidateQueries({ queryKey: ['inProgressSession'] })
    },
  })
}

export function useDiscardSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('training_sessions')
        .update({
          completed_at: new Date().toISOString(),
          grade: null,
          score_overall: null,
          feedback: 'Session discarded by trainee.',
        })
        .eq('id', sessionId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inProgressSession'] })
      queryClient.invalidateQueries({ queryKey: ['todaySessions'] })
      queryClient.invalidateQueries({ queryKey: ['trainingSession'] })
    },
  })
}

// ── Admin: Scenario CRUD ─────────────────────────────────────────────────────

export interface ScenarioInput {
  title: string
  difficulty: Difficulty
  property: string | null
  issue_type: string
  brief: string
  guest_persona: string
  haven_standard: string
  source?: 'handcrafted' | 'hostaway' | 'field'
  approved?: boolean
  active?: boolean
}

export function useCreateScenario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ScenarioInput) => {
      const { data, error } = await supabase
        .from('scenarios')
        .insert({
          ...input,
          source: input.source ?? 'handcrafted',
          approved: input.approved ?? false,
          active: input.active ?? false,
        })
        .select('*')
        .single()

      if (error) throw error
      return data as Scenario
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allScenarios'] })
      queryClient.invalidateQueries({ queryKey: ['scenarios'] })
    },
  })
}

export function useUpdateScenario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<ScenarioInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('scenarios')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      return data as Scenario
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allScenarios'] })
      queryClient.invalidateQueries({ queryKey: ['scenarios'] })
    },
  })
}

// ── Admin: Hostaway Imports ───────────────────────────────────────────────────

async function fetchHostawayImports(): Promise<HostawayImport[]> {
  const { data, error } = await supabase
    .from('hostaway_imports')
    .select('*')
    .order('imported_at', { ascending: false })

  if (error) throw error
  return data as HostawayImport[]
}

export function useHostawayImports() {
  return useQuery({
    queryKey: ['hostawayImports'],
    queryFn: fetchHostawayImports,
    staleTime: 30_000,
  })
}

export async function callHostawayImport(limit: number = 20): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hostaway-import`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ limit }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(body.error || `Import error: ${res.status}`)
  }

  return await res.json()
}

export async function convertImportToScenario(imp: HostawayImport): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  // Parse transcript
  let transcript = imp.raw_transcript ?? []
  if (typeof transcript === 'string') {
    try { transcript = JSON.parse(transcript) } catch { transcript = [] }
  }
  if (!Array.isArray(transcript)) transcript = []

  const transcriptText = (transcript as { role: string; content: string }[])
    .map((m) => `${m.role === 'guest' ? 'GUEST' : 'HOST'}: ${m.content}`)
    .join('\n\n')

  const classifyPrompt = `You are analyzing a real guest conversation from Haven by Design Stays (premium short-term rentals) to create a training scenario.

CONVERSATION (Property: ${imp.property_name || 'Unknown'}):
${transcriptText}

Create a training scenario from this conversation. Return ONLY valid JSON:
{
  "title": "<short catchy title, 3-6 words>",
  "difficulty": "<easy|medium|hard based on guest demeanor and complexity. Most real guests are frustrated but human, not cartoonishly hostile.>",
  "issue_type": "<one of: maintenance, cleanliness, early_checkin, late_checkout, noise, amenity_failure, lockout, refund_demand, neighbor_complaint, booking_error, other>",
  "brief": "<2-3 sentence scenario brief for the trainee. Describe the situation without revealing the resolution.>",
  "guest_persona": "<1-2 sentence description of the guest's personality and emotional state for the AI to roleplay. Keep it realistic and human.>",
  "haven_standard": "<What Haven expects as the correct response approach for this type of issue. 2-3 sentences.>"
}`

  // Call the training-chat edge function to get Claude's response
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/training-chat`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      system_prompt: 'You are a training scenario designer for Haven by Design Stays. Return only valid JSON.',
      messages: [{ role: 'trainee', content: classifyPrompt }],
      is_opener: false,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(body.error || `Classification error: ${res.status}`)
  }

  const data = await res.json()
  const rawText = data.content ?? ''
  const jsonStr = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const classification = JSON.parse(jsonStr)

  // Create draft scenario
  const { data: newScenario, error: insertError } = await supabase
    .from('scenarios')
    .insert({
      title: classification.title,
      difficulty: classification.difficulty ?? 'medium',
      property: imp.property_name,
      issue_type: classification.issue_type ?? 'other',
      brief: classification.brief ?? '',
      guest_persona: classification.guest_persona ?? '',
      haven_standard: classification.haven_standard ?? '',
      source: 'hostaway',
      hostaway_conversation_id: imp.hostaway_conversation_id,
      approved: false,
      active: false,
    })
    .select('id')
    .single()

  if (insertError) throw insertError

  // Link back to the import
  await supabase
    .from('hostaway_imports')
    .update({ converted_to_scenario: true, scenario_id: newScenario.id })
    .eq('id', imp.id)

  return newScenario.id
}

export function useUpdateHavenStandard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, standard_text }: { id: string; standard_text: string }) => {
      const { data, error } = await supabase
        .from('haven_standards')
        .update({ standard_text, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      return data as HavenStandard
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['havenStandards'] })
    },
  })
}
