import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import TopNav from '@/components/TopNav'
import UserAvatar from '@/components/UserAvatar'
import { useAuth } from '@/contexts/AuthContext'
import {
  useTeamProfiles,
  useTeamDailySummaries,
  useTraineeSessions,
} from '@/hooks/useTraining'
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, GRADE_COLORS } from '@/lib/training-types'
import type { Difficulty, DailySummary } from '@/lib/training-types'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Team Overview Stats ──────────────────────────────────────────────────────

function TeamOverview({
  profiles,
  summaries,
}: {
  profiles: Profile[]
  summaries: { trainee_id: string; reps_completed: number; avg_score: number | null }[]
}) {
  const totalReps = summaries.reduce((sum, s) => sum + s.reps_completed, 0)
  const scores = summaries.filter((s) => s.avg_score != null).map((s) => s.avg_score!)
  const teamAvg =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null
  const completedTrainees = summaries.filter((s) => {
    const profile = profiles.find((p) => p.id === s.trainee_id)
    return s.reps_completed >= (profile?.daily_rep_target ?? 10)
  }).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="grid grid-cols-3 gap-3 mb-6"
    >
      <div className="bg-card-bg rounded-[10px] border border-border p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Users size={13} strokeWidth={1.5} className="text-text-muted" />
          <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
            Today's Reps
          </span>
        </div>
        <div className="text-2xl font-bold text-text-primary">{totalReps}</div>
        <div className="text-xs text-text-muted mt-0.5">
          {completedTrainees}/{profiles.length} finished
        </div>
      </div>
      <div className="bg-card-bg rounded-[10px] border border-border p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp size={13} strokeWidth={1.5} className="text-text-muted" />
          <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
            Team Avg
          </span>
        </div>
        <div className={cn(
          'text-2xl font-bold',
          teamAvg != null && teamAvg >= 85
            ? 'text-watch-text'
            : teamAvg != null && teamAvg >= 70
              ? 'text-haven-indigo'
              : teamAvg != null && teamAvg >= 50
                ? 'text-urgent-text'
                : teamAvg != null
                  ? 'text-fire-text'
                  : 'text-text-primary'
        )}>
          {teamAvg ?? '—'}
        </div>
        <div className="text-xs text-text-muted mt-0.5">avg score today</div>
      </div>
      <div className="bg-card-bg rounded-[10px] border border-border p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <AlertTriangle size={13} strokeWidth={1.5} className="text-text-muted" />
          <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
            Behind
          </span>
        </div>
        <div className="text-2xl font-bold text-text-primary">
          {profiles.length - completedTrainees}
        </div>
        <div className="text-xs text-text-muted mt-0.5">still training</div>
      </div>
    </motion.div>
  )
}

// ── Trainee Row (expandable) ─────────────────────────────────────────────────

function TraineeRow({
  profile,
  summary,
  index,
}: {
  profile: Profile
  summary: { reps_completed: number; reps_required: number; avg_score: number | null; highest_score: number | null; lowest_score: number | null } | null
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const reps = summary?.reps_completed ?? 0
  const target = profile.daily_rep_target ?? 10
  const avg = summary?.avg_score ?? null
  const done = reps >= target

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3.5 rounded-[10px] border transition-colors text-left cursor-pointer',
          expanded
            ? 'bg-surface border-haven-indigo/20'
            : 'bg-card-bg border-border hover:bg-surface-hover'
        )}
      >
        <UserAvatar initials={profile.initials} size="sm" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-primary truncate">
              {profile.name}
            </span>
            {done && (
              <CheckCircle size={14} className="text-watch-text shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-text-muted">
              {reps}/{target} reps
            </span>
            {avg != null && (
              <span className={cn(
                'text-xs font-medium',
                avg >= 85 ? 'text-watch-text' : avg >= 70 ? 'text-haven-indigo' : avg >= 50 ? 'text-urgent-text' : 'text-fire-text'
              )}>
                avg {avg}
              </span>
            )}
            {summary?.highest_score != null && summary?.lowest_score != null && (
              <span className="text-xs text-text-muted">
                {summary.lowest_score}–{summary.highest_score}
              </span>
            )}
          </div>
        </div>

        {/* Progress mini-bar */}
        <div className="w-16 shrink-0">
          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                done ? 'bg-watch-text' : 'bg-haven-indigo'
              )}
              style={{ width: `${Math.min(100, Math.round((reps / target) * 100))}%` }}
            />
          </div>
        </div>

        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={cn(
            'text-text-muted transition-transform duration-200 shrink-0',
            expanded ? 'rotate-0' : '-rotate-90'
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <TraineeDetail userId={profile.id} profileName={profile.name} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Trainee Detail (loaded on expand) ────────────────────────────────────────

function TraineeDetail({ userId, profileName }: { userId: string; profileName: string }) {
  const navigate = useNavigate()
  const { data: sessions, isLoading } = useTraineeSessions(userId)

  if (isLoading) {
    return (
      <div className="px-4 py-4 text-sm text-text-secondary">Loading sessions...</div>
    )
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="px-4 py-4 text-sm text-text-muted">
        No scored sessions yet for {profileName}.
      </div>
    )
  }

  // Calculate criteria averages
  const criteriaAvgs = [
    { name: 'Empathy', key: 'score_empathy', values: sessions.map((s) => s.score_empathy) },
    { name: 'Action', key: 'score_action', values: sessions.map((s) => s.score_action) },
    { name: 'Tone', key: 'score_tone', values: sessions.map((s) => s.score_tone) },
    { name: 'Resolution', key: 'score_resolution', values: sessions.map((s) => s.score_resolution) },
    { name: 'No Policy Hiding', key: 'score_no_policy', values: sessions.map((s) => s.score_no_policy) },
  ].map((c) => {
    const nums = c.values.filter((v): v is number => v != null)
    const avg = nums.length > 0 ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null
    return { ...c, avg }
  })

  // Grade distribution
  const grades = { Excellent: 0, Good: 0, 'Needs Work': 0, Failing: 0 }
  for (const s of sessions) {
    if (s.grade && s.grade in grades) {
      grades[s.grade as keyof typeof grades]++
    }
  }

  return (
    <div className="px-4 pt-3 pb-4 space-y-4">
      {/* Criteria Bars */}
      <div className="space-y-2">
        <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
          Criteria Averages (last {sessions.length} sessions)
        </span>
        {criteriaAvgs.map((c) => (
          <div key={c.key} className="flex items-center gap-3">
            <span className="text-xs text-text-secondary w-28 shrink-0 truncate">{c.name}</span>
            <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  c.avg != null && c.avg >= 15
                    ? 'bg-watch-text'
                    : c.avg != null && c.avg >= 12
                      ? 'bg-haven-indigo'
                      : c.avg != null && c.avg >= 8
                        ? 'bg-urgent-text'
                        : 'bg-fire-text'
                )}
                style={{ width: `${c.avg != null ? (c.avg / 20) * 100 : 0}%` }}
              />
            </div>
            <span className={cn(
              'text-xs font-semibold w-10 text-right',
              c.avg != null && c.avg >= 15
                ? 'text-watch-text'
                : c.avg != null && c.avg >= 12
                  ? 'text-haven-indigo'
                  : c.avg != null && c.avg >= 8
                    ? 'text-urgent-text'
                    : 'text-fire-text'
            )}>
              {c.avg != null ? c.avg : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Grade Distribution */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium shrink-0">
          Grades
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.entries(grades) as [string, number][]).map(([grade, count]) => {
            if (count === 0) return null
            const colors = GRADE_COLORS[grade] ?? GRADE_COLORS['Needs Work']
            return (
              <span
                key={grade}
                className={cn('text-xs font-medium px-2 py-0.5 rounded-full', colors.bg, colors.text)}
              >
                {count} {grade}
              </span>
            )
          })}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
          Recent Sessions
        </span>
        {sessions.slice(0, 8).map((session) => {
          const diff = session.scenario?.difficulty as Difficulty | undefined
          const diffColors = diff ? DIFFICULTY_COLORS[diff] : null
          const gradeColors = session.grade ? GRADE_COLORS[session.grade] ?? null : null

          return (
            <button
              key={session.id}
              onClick={() => navigate(`/training/complete/${session.id}`)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-[8px] hover:bg-surface transition-colors text-left cursor-pointer group"
            >
              <span className={cn(
                'text-sm font-bold w-8 text-center shrink-0',
                session.score_overall != null && session.score_overall >= 85
                  ? 'text-watch-text'
                  : session.score_overall != null && session.score_overall >= 70
                    ? 'text-haven-indigo'
                    : session.score_overall != null && session.score_overall >= 50
                      ? 'text-urgent-text'
                      : 'text-fire-text'
              )}>
                {session.score_overall ?? '—'}
              </span>
              <span className="text-xs text-text-primary truncate flex-1">
                {session.scenario?.title ?? 'Scenario'}
              </span>
              {diff && diffColors && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full border shrink-0',
                  diffColors.bg, diffColors.text, diffColors.border
                )}>
                  {DIFFICULTY_LABELS[diff]}
                </span>
              )}
              {gradeColors && session.grade && (
                <span className={cn('text-[10px] font-medium shrink-0', gradeColors.text)}>
                  {session.grade}
                </span>
              )}
              <span className="text-[10px] text-text-muted shrink-0">
                {formatRelativeDate(session.completed_at!)}
              </span>
              <ChevronRight
                size={14}
                strokeWidth={1.5}
                className="text-text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const today = useMemo(() => todayString(), [])

  const { data: profiles } = useTeamProfiles()
  const { data: summaries } = useTeamDailySummaries(today)

  // Build summary map (must be before any conditional returns — hooks rule)
  const summaryMap = useMemo(() => {
    const map = new Map<string, DailySummary>()
    for (const s of summaries ?? []) {
      map.set(s.trainee_id, s)
    }
    return map
  }, [summaries])

  // Sort profiles: incomplete first (by reps remaining desc), then complete
  const sortedProfiles = useMemo(() => {
    if (!profiles) return []
    return [...profiles].sort((a, b) => {
      const aReps = summaryMap.get(a.id)?.reps_completed ?? 0
      const bReps = summaryMap.get(b.id)?.reps_completed ?? 0
      const aTarget = a.daily_rep_target ?? 10
      const bTarget = b.daily_rep_target ?? 10
      const aDone = aReps >= aTarget
      const bDone = bReps >= bTarget

      // Incomplete first
      if (aDone !== bDone) return aDone ? 1 : -1
      // Among incomplete, sort by lowest avg score first (needs most help)
      const aAvg = summaryMap.get(a.id)?.avg_score ?? 999
      const bAvg = summaryMap.get(b.id)?.avg_score ?? 999
      return aAvg - bAvg
    })
  }, [profiles, summaryMap])

  // Redirect non-admins
  if (profile && !profile.is_training_admin) {
    return (
      <div className="h-screen flex flex-col bg-page-bg">
        <TopNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-text-secondary text-sm">Admin access required.</p>
            <button
              onClick={() => navigate('/training')}
              className="mt-3 text-sm text-haven-indigo hover:underline cursor-pointer"
            >
              Back to Training
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-page-bg">
      <TopNav />

      <main className="flex-1 overflow-y-auto themed-scroll">
        <div className="max-w-2xl mx-auto px-4 py-5 sm:px-6 sm:py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-text-primary">Team Dashboard</h2>
                <p className="text-sm text-text-secondary mt-0.5">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/admin/imports')}
                  className="text-xs font-medium px-3 py-1.5 rounded-[8px] text-text-muted border border-border hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  Hostaway Importer
                </button>
                <button
                  onClick={() => navigate('/admin/scenarios')}
                  className="text-xs font-medium px-3 py-1.5 rounded-[8px] text-haven-indigo border border-haven-indigo/30 hover:bg-haven-indigo/10 transition-colors cursor-pointer"
                >
                  Manage Scenarios
                </button>
              </div>
            </div>
          </motion.div>

          {/* Team Overview Stats */}
          {profiles && summaries && (
            <TeamOverview
              profiles={profiles}
              summaries={(summaries ?? []).map((s) => ({
                trainee_id: s.trainee_id,
                reps_completed: s.reps_completed,
                avg_score: s.avg_score,
              }))}
            />
          )}

          {/* Team Members */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-text-secondary">Team Members</h3>
              {profiles && (
                <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded-full">
                  {profiles.length}
                </span>
              )}
            </div>

            {!profiles ? (
              <div className="text-center py-8">
                <p className="text-text-secondary text-sm">Loading team...</p>
              </div>
            ) : sortedProfiles.length === 0 ? (
              <div className="text-center py-8">
                <Users size={32} className="text-text-muted mx-auto mb-3" strokeWidth={1} />
                <p className="text-text-secondary text-sm">No team members found.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sortedProfiles.map((p, i) => (
                  <TraineeRow
                    key={p.id}
                    profile={p}
                    summary={summaryMap.get(p.id) ?? null}
                    index={i}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
