import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Flame, AlertTriangle, Shield } from 'lucide-react'
import TopNav from '@/components/TopNav'
import { useAuth } from '@/contexts/AuthContext'
import {
  useDailyStats,
  useTodaySessions,
  useScenarios,
  useScenarioHistory,
  useCreateTrainingSession,
  selectNextScenario,
} from '@/hooks/useTraining'
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '@/lib/training-types'
import type { Difficulty } from '@/lib/training-types'
import { cn } from '@/lib/utils'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Training() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const userId = profile?.id

  const { data: stats } = useDailyStats(userId)
  const { data: todaySessions } = useTodaySessions(userId)
  const { data: scenarios } = useScenarios()
  const { data: history } = useScenarioHistory(userId)
  const createSession = useCreateTrainingSession()

  const dailyTarget = profile?.daily_rep_target ?? 10
  const repsCompleted = stats?.reps_completed ?? 0
  const progressPct = Math.min(100, Math.round((repsCompleted / dailyTarget) * 100))
  const allDone = repsCompleted >= dailyTarget

  // Difficulty breakdown
  const remaining = useMemo(() => {
    const hardTarget = Math.ceil(dailyTarget * 0.3)
    const mediumTarget = Math.ceil(dailyTarget * 0.3)
    const easyTarget = dailyTarget - hardTarget - mediumTarget

    return {
      hard: Math.max(0, hardTarget - (stats?.hard_count ?? 0)),
      medium: Math.max(0, mediumTarget - (stats?.medium_count ?? 0)),
      easy: Math.max(0, easyTarget - (stats?.easy_count ?? 0)),
    }
  }, [dailyTarget, stats])

  const handleStartRep = async () => {
    if (!userId || !scenarios || !history || !todaySessions) return

    const nextScenario = selectNextScenario(scenarios, history ?? [], todaySessions ?? [], dailyTarget)
    if (!nextScenario) return

    const session = await createSession.mutateAsync({
      trainee_id: userId,
      scenario_id: nextScenario.id,
    })

    navigate(`/training/session/${session.id}`)
  }

  const firstName = profile?.name?.split(' ')[0] ?? ''

  return (
    <div className="h-screen flex flex-col bg-page-bg">
      <TopNav />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 sm:px-6 sm:py-8">
          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="text-xl font-semibold text-text-primary">
              {getGreeting()}, {firstName}.
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">{formatDate()}</p>
          </motion.div>

          {/* Rep Counter Card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 bg-card-bg rounded-[10px] border border-border p-6"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-text-primary">{repsCompleted}</span>
              <span className="text-2xl text-text-muted font-medium">/ {dailyTarget}</span>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              {allDone ? 'All reps complete for today' : 'reps completed today'}
            </p>

            {/* Progress bar */}
            <div className="mt-4 h-2 rounded-full bg-surface overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-haven-indigo"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>

            {/* Difficulty breakdown */}
            {!allDone && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {(['hard', 'medium', 'easy'] as Difficulty[]).map((d) => {
                  const colors = DIFFICULTY_COLORS[d]
                  const icons = { hard: Flame, medium: AlertTriangle, easy: Shield }
                  const Icon = icons[d]
                  return (
                    <div key={d} className={cn('flex items-center gap-1.5', colors.text)}>
                      <Icon size={13} strokeWidth={1.5} />
                      <span>
                        {DIFFICULTY_LABELS[d]}: {remaining[d]} left
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Start Rep CTA */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 flex justify-center"
          >
            <button
              onClick={handleStartRep}
              disabled={createSession.isPending || (!allDone && (!scenarios || scenarios.length === 0))}
              className={cn(
                'relative flex items-center gap-2 px-8 py-3 rounded-[20px] font-medium text-sm min-h-[48px] transition-all duration-200',
                allDone
                  ? 'text-text-muted cursor-default'
                  : 'text-white hover:scale-[1.03]'
              )}
              style={
                allDone
                  ? {
                      background: 'rgba(123, 124, 248, 0.06)',
                      border: '1.5px solid rgba(123, 124, 248, 0.2)',
                    }
                  : {
                      background: 'rgba(123, 124, 248, 0.12)',
                      border: '1.5px solid rgba(123, 124, 248, 0.8)',
                      boxShadow:
                        '0 0 10px rgba(123, 124, 248, 0.4), 0 0 30px rgba(123, 124, 248, 0.15), inset 0 0 10px rgba(123, 124, 248, 0.1)',
                    }
              }
            >
              <Zap size={18} strokeWidth={1.5} />
              {createSession.isPending
                ? 'Starting...'
                : allDone
                  ? 'All reps complete for today'
                  : 'Start Next Rep'}
            </button>
          </motion.div>

          {/* Today's Sessions */}
          {todaySessions && todaySessions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="mt-10"
            >
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-medium text-text-secondary">Today's Sessions</h3>
                <span className="text-xs text-text-muted bg-surface px-2 py-0.5 rounded-full">
                  {todaySessions.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {todaySessions.map((session, i) => {
                  const diff = session.scenario?.difficulty as Difficulty | undefined
                  const colors = diff ? DIFFICULTY_COLORS[diff] : null
                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                      className="bg-card-bg rounded-[10px] border border-border p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {session.scenario?.title ?? 'Scenario'}
                        </span>
                        {diff && colors && (
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full border shrink-0',
                              colors.bg,
                              colors.text,
                              colors.border
                            )}
                          >
                            {DIFFICULTY_LABELS[diff]}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-text-muted shrink-0 ml-3">
                        {session.exchange_count} exchanges
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}
