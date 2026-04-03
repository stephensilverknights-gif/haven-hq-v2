// ── Training Hub Types ──────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard'

export type SessionStatus =
  | 'loading_opener'
  | 'active'
  | 'ending'
  | 'scoring'
  | 'complete'
  | 'abandoned'

export type TrainingIssueType =
  | 'maintenance'
  | 'cleanliness'
  | 'early_checkin'
  | 'late_checkout'
  | 'noise'
  | 'amenity_failure'
  | 'lockout'
  | 'refund_demand'
  | 'neighbor_complaint'
  | 'booking_error'
  | 'other'

export interface ChatMessage {
  role: 'guest' | 'trainee'
  content: string
  timestamp: string
}

export interface Scenario {
  id: string
  title: string
  difficulty: Difficulty
  property: string | null
  issue_type: TrainingIssueType
  brief: string
  guest_persona: string
  haven_standard: string
  source: 'handcrafted' | 'hostaway' | 'field'
  hostaway_conversation_id: string | null
  approved: boolean
  active: boolean
  times_used: number
  avg_score_when_used: number | null
  created_by: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
}

export interface TrainingSession {
  id: string
  trainee_id: string
  scenario_id: string
  started_at: string
  completed_at: string | null
  exchange_count: number
  transcript: ChatMessage[]
  score_overall: number | null
  score_empathy: number | null
  score_action: number | null
  score_tone: number | null
  score_resolution: number | null
  score_no_policy: number | null
  grade: 'Excellent' | 'Good' | 'Needs Work' | 'Failing' | null
  feedback: string | null
  coaching: string | null
  flagged_for_review: boolean
  flag_reason: string | null
  // Joined
  scenario?: Scenario
}

export interface DailySummary {
  id: string
  trainee_id: string
  date: string
  reps_completed: number
  reps_required: number
  avg_score: number | null
  highest_score: number | null
  lowest_score: number | null
  lowest_criteria: string | null
  easy_count: number
  medium_count: number
  hard_count: number
  created_at: string
  updated_at: string
}

export interface TraineeScenarioHistory {
  id: string
  trainee_id: string
  scenario_id: string
  last_used_at: string
  times_used: number
  best_score: number | null
  latest_score: number | null
}

export interface HavenStandard {
  id: string
  issue_type: string
  standard_text: string
  examples: string | null
  updated_by: string | null
  updated_at: string
}

// ── Display Helpers ─────────────────────────────────────────────────────────

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export const DIFFICULTY_COLORS: Record<Difficulty, { bg: string; text: string; border: string }> = {
  easy:   { bg: 'bg-watch-bg',  text: 'text-watch-text',  border: 'border-watch-border' },
  medium: { bg: 'bg-urgent-bg', text: 'text-urgent-text', border: 'border-urgent-border' },
  hard:   { bg: 'bg-fire-bg',   text: 'text-fire-text',   border: 'border-fire-border' },
}

export const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  Excellent:    { bg: 'bg-watch-bg',  text: 'text-watch-text' },
  Good:         { bg: 'bg-haven-indigo/10', text: 'text-haven-indigo' },
  'Needs Work': { bg: 'bg-urgent-bg', text: 'text-urgent-text' },
  Failing:      { bg: 'bg-fire-bg',   text: 'text-fire-text' },
}

export const TRAINING_ISSUE_TYPE_LABELS: Record<TrainingIssueType, string> = {
  maintenance: 'Maintenance',
  cleanliness: 'Cleanliness',
  early_checkin: 'Early Check-in',
  late_checkout: 'Late Checkout',
  noise: 'Noise',
  amenity_failure: 'Amenity Failure',
  lockout: 'Lockout',
  refund_demand: 'Refund Demand',
  neighbor_complaint: 'Neighbor Complaint',
  booking_error: 'Booking Error',
  other: 'Other',
}
