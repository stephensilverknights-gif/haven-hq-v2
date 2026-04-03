import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronDown,
  Zap,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { useTrainingSession } from '@/hooks/useTraining'
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  GRADE_COLORS,
} from '@/lib/training-types'
import type { Difficulty } from '@/lib/training-types'
import { cn } from '@/lib/utils'

export default function TrainingComplete() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: session, isLoading } = useTrainingSession(id)
  const [transcriptExpanded, setTranscriptExpanded] = useState(false)
  const [standardExpanded, setStandardExpanded] = useState(false)

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-page-bg">
        <p className="text-text-secondary">Loading debrief...</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center bg-page-bg">
        <p className="text-text-secondary">Session not found.</p>
      </div>
    )
  }

  const scenario = session.scenario
  const difficulty = (scenario?.difficulty ?? 'medium') as Difficulty
  const diffColors = DIFFICULTY_COLORS[difficulty]
  const grade = session.grade ?? 'Needs Work'
  const gradeColors = GRADE_COLORS[grade] ?? GRADE_COLORS['Needs Work']
  const overall = session.score_overall ?? 0

  // Parse criteria from individual score columns
  const criteria = [
    { key: 'empathy_first', name: 'Empathy First', score: session.score_empathy ?? 0, pass: (session.score_empathy ?? 0) >= 12 },
    { key: 'concrete_action', name: 'Concrete Action', score: session.score_action ?? 0, pass: (session.score_action ?? 0) >= 12 },
    { key: 'haven_tone', name: 'Haven Tone', score: session.score_tone ?? 0, pass: (session.score_tone ?? 0) >= 12 },
    { key: 'appropriate_resolution', name: 'Appropriate Resolution', score: session.score_resolution ?? 0, pass: (session.score_resolution ?? 0) >= 12 },
    { key: 'no_policy_hiding', name: 'No Policy Hiding', score: session.score_no_policy ?? 0, pass: (session.score_no_policy ?? 0) >= 12 },
  ]

  const transcript = (session.transcript ?? []) as { role: string; content: string }[]

  return (
    <div className="h-screen flex flex-col bg-page-bg">
      {/* Top Bar */}
      <header className="sticky top-0 z-30">
        <div
          className="absolute inset-0 bg-card-bg/70 backdrop-blur-xl"
          style={{ borderBottom: '1px solid rgba(123, 124, 248, 0.08)' }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{
            background:
              'linear-gradient(90deg, transparent 5%, rgba(123, 124, 248, 0.4) 25%, rgba(123, 124, 248, 0.6) 50%, rgba(123, 124, 248, 0.4) 75%, transparent 95%)',
          }}
        />
        <div className="relative max-w-3xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/training')}
              className="flex items-center justify-center min-w-[36px] min-h-[36px] rounded-[8px] text-text-secondary hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
            >
              <ChevronLeft size={20} strokeWidth={1.5} />
            </button>
            <span className="text-sm font-medium text-text-primary truncate">
              Session Debrief
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 sm:px-6 sm:py-8">
          {/* Scenario Info */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 mb-6"
          >
            <span className="text-sm text-text-secondary">{scenario?.title}</span>
            {scenario && (
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full border',
                  diffColors.bg,
                  diffColors.text,
                  diffColors.border
                )}
              >
                {DIFFICULTY_LABELS[difficulty]}
              </span>
            )}
            {scenario?.property && (
              <span className="text-xs text-text-muted">· {scenario.property}</span>
            )}
          </motion.div>

          {/* Score Hero */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="bg-card-bg rounded-[10px] border border-border p-6 text-center"
          >
            <div className="text-5xl font-bold text-text-primary">{overall}</div>
            <div className="text-sm text-text-muted mt-1">out of 100</div>
            <div
              className={cn(
                'inline-block mt-3 text-sm font-medium px-4 py-1.5 rounded-full',
                gradeColors.bg,
                gradeColors.text
              )}
            >
              {grade}
            </div>
          </motion.div>

          {/* Criteria Cards */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {criteria.map((c, i) => (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: 0.12 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className="bg-card-bg rounded-[10px] border border-border p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {c.pass ? (
                    <CheckCircle size={18} className="text-watch-text shrink-0" />
                  ) : (
                    <XCircle size={18} className="text-fire-text shrink-0" />
                  )}
                  <span className="text-sm text-text-primary">{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-semibold',
                    c.pass ? 'text-watch-text' : 'text-fire-text'
                  )}>
                    {c.score}
                  </span>
                  <span className="text-xs text-text-muted">/ 20</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Feedback */}
          {session.feedback && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 bg-card-bg rounded-[10px] border border-border p-5"
            >
              <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                Feedback
              </h3>
              <p className="text-sm text-text-primary leading-relaxed">
                {session.feedback}
              </p>
            </motion.div>
          )}

          {/* Coaching */}
          {session.coaching && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mt-3 bg-card-bg rounded-[10px] border border-border p-5"
            >
              <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                What Haven Expects
              </h3>
              <p className="text-sm text-text-primary leading-relaxed">
                {session.coaching}
              </p>
            </motion.div>
          )}

          {/* Haven Standard Reveal */}
          {scenario?.haven_standard && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-3 bg-surface rounded-[10px] border border-border overflow-hidden"
            >
              <button
                onClick={() => setStandardExpanded(!standardExpanded)}
                className="w-full flex items-center justify-between px-5 py-3 text-left cursor-pointer"
              >
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Haven Standard (revealed)
                </span>
                <ChevronDown
                  size={16}
                  strokeWidth={1.5}
                  className={cn(
                    'text-text-muted transition-transform duration-200',
                    standardExpanded ? 'rotate-0' : '-rotate-90'
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {standardExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4">
                      <p className="text-sm text-text-primary leading-relaxed">
                        {scenario.haven_standard}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Transcript */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="mt-3 bg-surface rounded-[10px] border border-border overflow-hidden"
          >
            <button
              onClick={() => setTranscriptExpanded(!transcriptExpanded)}
              className="w-full flex items-center justify-between px-5 py-3 text-left cursor-pointer"
            >
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Full Transcript ({session.exchange_count} exchanges)
              </span>
              <ChevronDown
                size={16}
                strokeWidth={1.5}
                className={cn(
                  'text-text-muted transition-transform duration-200',
                  transcriptExpanded ? 'rotate-0' : '-rotate-90'
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {transcriptExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 flex flex-col gap-3">
                    {transcript.map((msg, i) => (
                      <div key={i} className={cn('text-sm', msg.role === 'guest' ? 'text-text-secondary' : 'text-text-primary')}>
                        <span className="text-xs text-text-muted font-medium uppercase">
                          {msg.role === 'guest' ? 'Guest' : 'You'}:
                        </span>{' '}
                        {msg.content}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 mb-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button
              onClick={() => navigate('/training')}
              className="flex items-center gap-2 px-6 py-3 rounded-[20px] font-medium text-sm text-white transition-all duration-200 hover:scale-[1.03] cursor-pointer"
              style={{
                background: 'rgba(123, 124, 248, 0.12)',
                border: '1.5px solid rgba(123, 124, 248, 0.8)',
                boxShadow:
                  '0 0 10px rgba(123, 124, 248, 0.4), 0 0 30px rgba(123, 124, 248, 0.15), inset 0 0 10px rgba(123, 124, 248, 0.1)',
              }}
            >
              <Zap size={18} strokeWidth={1.5} />
              Next Rep
            </button>
            <button
              onClick={() => navigate('/training')}
              className="text-sm text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Done for today
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
