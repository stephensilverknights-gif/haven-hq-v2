import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, TrendingUp, Clock, ChevronRight } from 'lucide-react'
import TopNav from '@/components/TopNav'
import UserAvatar from '@/components/UserAvatar'
import { useAuth } from '@/contexts/AuthContext'
import {
  useLeaderboard,
  useTraineeHistory,
} from '@/hooks/useTraining'
import type { LeaderboardPeriod, LeaderboardEntry, HistorySession } from '@/hooks/useTraining'
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS, GRADE_COLORS } from '@/lib/training-types'
import type { Difficulty } from '@/lib/training-types'
import { cn } from '@/lib/utils'

type Tab = 'leaderboard' | 'history'

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  today: 'Today',
  week: 'This Week',
  all: 'All Time',
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

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div
        className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
        style={{
          background: 'linear-gradient(135deg, #FFD700, #FFA500)',
          color: '#1a1a2e',
          boxShadow: '0 0 8px rgba(255, 215, 0, 0.4)',
        }}
      >
        1
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div
        className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
        style={{
          background: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)',
          color: '#1a1a2e',
        }}
      >
        2
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div
        className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
        style={{
          background: 'linear-gradient(135deg, #CD7F32, #A0522D)',
          color: '#1a1a2e',
        }}
      >
        3
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold text-text-muted bg-surface">
      {rank}
    </div>
  )
}

function LeaderboardRow({
  entry,
  rank,
  isCurrentUser,
  index,
}: {
  entry: LeaderboardEntry
  rank: number
  isCurrentUser: boolean
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-[10px] border transition-colors',
        isCurrentUser
          ? 'bg-haven-indigo/[0.06] border-haven-indigo/20'
          : 'bg-card-bg border-border'
      )}
    >
      <RankBadge rank={rank} />
      <UserAvatar initials={entry.initials} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">
            {entry.name}
          </span>
          {isCurrentUser && (
            <span className="text-[10px] text-haven-indigo font-medium uppercase tracking-wider">
              You
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-text-muted">
            {entry.total_reps} rep{entry.total_reps !== 1 ? 's' : ''}
          </span>
          {entry.excellent_count > 0 && (
            <span className="text-xs text-watch-text">
              {entry.excellent_count} Excellent
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-lg font-bold text-text-primary">
          {entry.avg_score != null ? entry.avg_score : '—'}
        </div>
        <div className="text-[10px] text-text-muted uppercase tracking-wider">Avg</div>
      </div>
    </motion.div>
  )
}

function HistoryRow({
  session,
  index,
}: {
  session: HistorySession
  index: number
}) {
  const navigate = useNavigate()
  const difficulty = session.difficulty as Difficulty
  const diffColors = DIFFICULTY_COLORS[difficulty] ?? DIFFICULTY_COLORS.medium
  const gradeColors = session.grade ? GRADE_COLORS[session.grade] ?? GRADE_COLORS['Needs Work'] : null

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => navigate(`/training/complete/${session.id}`)}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[10px] neon-border bg-card-bg hover:bg-surface-hover transition-colors text-left cursor-pointer group"
    >
      {/* Score */}
      <div className="flex items-center justify-center w-11 h-11 rounded-[8px] bg-surface shrink-0">
        <span className={cn(
          'text-base font-bold',
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
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">
            {session.scenario_title}
          </span>
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full border shrink-0',
              diffColors.bg,
              diffColors.text,
              diffColors.border
            )}
          >
            {DIFFICULTY_LABELS[difficulty]}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {gradeColors && session.grade && (
            <span className={cn('text-xs font-medium', gradeColors.text)}>
              {session.grade}
            </span>
          )}
          <span className="text-xs text-text-muted">
            {session.exchange_count} exchanges
          </span>
          <span className="text-xs text-text-muted">
            {formatRelativeDate(session.completed_at)}
          </span>
        </div>
      </div>

      <ChevronRight
        size={16}
        strokeWidth={1.5}
        className="text-text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </motion.button>
  )
}

function PersonalStats({ history }: { history: HistorySession[] }) {
  if (history.length === 0) return null

  const scores = history.filter(h => h.score_overall != null).map(h => h.score_overall!)
  const avg = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null
  const best = scores.length > 0 ? Math.max(...scores) : null
  // Calculate weakest criteria
  const criteriaAvgs = [
    { name: 'Empathy', avg: calcAvg(history.map(h => h.score_empathy)) },
    { name: 'Action', avg: calcAvg(history.map(h => h.score_action)) },
    { name: 'Tone', avg: calcAvg(history.map(h => h.score_tone)) },
    { name: 'Resolution', avg: calcAvg(history.map(h => h.score_resolution)) },
    { name: 'No Policy Hiding', avg: calcAvg(history.map(h => h.score_no_policy)) },
  ].filter(c => c.avg !== null)

  const weakest = criteriaAvgs.length > 0
    ? criteriaAvgs.reduce((min, c) => (c.avg! < min.avg! ? c : min))
    : null
  const strongest = criteriaAvgs.length > 0
    ? criteriaAvgs.reduce((max, c) => (c.avg! > max.avg! ? c : max))
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
    >
      <StatCard label="Avg Score" value={avg != null ? String(avg) : '—'} icon={TrendingUp} />
      <StatCard label="Best Score" value={best != null ? String(best) : '—'} icon={Trophy} />
      <StatCard
        label="Strongest"
        value={strongest ? strongest.name : '—'}
        sub={strongest ? `${strongest.avg!.toFixed(1)}/20` : undefined}
        color="text-watch-text"
      />
      <StatCard
        label="Work On"
        value={weakest ? weakest.name : '—'}
        sub={weakest ? `${weakest.avg!.toFixed(1)}/20` : undefined}
        color="text-urgent-text"
      />
    </motion.div>
  )
}

function calcAvg(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null)
  if (nums.length === 0) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  sub?: string
  icon?: typeof Trophy
  color?: string
}) {
  return (
    <div className="bg-card-bg rounded-[10px] neon-border p-4">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon size={13} strokeWidth={1.5} className="text-text-muted" />}
        <span className="text-[10px] text-text-muted uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <div className={cn('text-lg font-bold', color ?? 'text-text-primary')}>{value}</div>
      {sub && <div className="text-xs text-text-muted mt-0.5">{sub}</div>}
    </div>
  )
}

export default function Leaderboard() {
  const { profile } = useAuth()
  const userId = profile?.id
  const [activeTab, setActiveTab] = useState<Tab>('leaderboard')
  const [period, setPeriod] = useState<LeaderboardPeriod>('today')

  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard(period)
  const { data: history, isLoading: histLoading } = useTraineeHistory(userId)

  return (
    <div className="h-screen flex flex-col bg-page-bg">
      <TopNav />

      <main className="flex-1 overflow-y-auto themed-scroll">
        <div className="max-w-2xl mx-auto px-4 py-5 sm:px-6 sm:py-8">
          {/* Tab Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-1 p-1 bg-surface rounded-[10px] neon-border mb-6"
          >
            {(['leaderboard', 'history'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'relative flex-1 text-sm font-medium py-2 rounded-[8px] transition-colors cursor-pointer',
                  activeTab === tab
                    ? 'text-white'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0 rounded-[8px]"
                    style={{
                      background: 'rgba(123, 124, 248, 0.12)',
                      border: '1px solid rgba(123, 124, 248, 0.4)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {tab === 'leaderboard' ? 'Leaderboard' : 'My History'}
                </span>
              </button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {activeTab === 'leaderboard' ? (
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Period Selector */}
                <div className="flex items-center gap-2 mb-5">
                  {(['today', 'week', 'all'] as LeaderboardPeriod[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={cn(
                        'text-xs font-medium px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer',
                        period === p
                          ? 'text-haven-indigo border-haven-indigo/40 bg-haven-indigo/10'
                          : 'text-text-muted border-border hover:text-text-secondary hover:border-border'
                      )}
                    >
                      {PERIOD_LABELS[p]}
                    </button>
                  ))}
                </div>

                {/* Leaderboard List */}
                {lbLoading ? (
                  <div className="text-center py-12">
                    <p className="text-text-secondary text-sm">Loading leaderboard...</p>
                  </div>
                ) : !leaderboard || leaderboard.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy size={32} className="text-text-muted mx-auto mb-3" strokeWidth={1} />
                    <p className="text-text-secondary text-sm">
                      No completed reps {period === 'today' ? 'today' : period === 'week' ? 'this week' : ''} yet.
                    </p>
                    <p className="text-text-muted text-xs mt-1">
                      Complete a training rep to appear on the board.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {leaderboard.map((entry, i) => (
                      <LeaderboardRow
                        key={entry.trainee_id}
                        entry={entry}
                        rank={i + 1}
                        isCurrentUser={entry.trainee_id === userId}
                        index={i}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                {histLoading ? (
                  <div className="text-center py-12">
                    <p className="text-text-secondary text-sm">Loading history...</p>
                  </div>
                ) : !history || history.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock size={32} className="text-text-muted mx-auto mb-3" strokeWidth={1} />
                    <p className="text-text-secondary text-sm">
                      No completed sessions yet.
                    </p>
                    <p className="text-text-muted text-xs mt-1">
                      Complete your first training rep to see your history.
                    </p>
                  </div>
                ) : (
                  <>
                    <PersonalStats history={history} />
                    <div className="flex flex-col gap-2">
                      {history.map((session, i) => (
                        <HistoryRow key={session.id} session={session} index={i} />
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
