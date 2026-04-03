import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import TopNav from '@/components/TopNav'
import { useAuth } from '@/contexts/AuthContext'
import {
  useHostawayImports,
  callHostawayImport,
} from '@/hooks/useTraining'
import { TRAINING_ISSUE_TYPE_LABELS } from '@/lib/training-types'
import type { TrainingIssueType, HostawayImport } from '@/lib/training-types'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function SentimentBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-surface overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full',
            score >= 0.6 ? 'bg-watch-text' : score >= 0.3 ? 'bg-urgent-text' : 'bg-fire-text'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-text-muted">{pct}%</span>
    </div>
  )
}

function ImportRow({
  imp,
  index,
}: {
  imp: HostawayImport
  index: number
}) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.02, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'bg-card-bg rounded-[10px] border border-border overflow-hidden',
        imp.worth_converting ? 'border-l-2 border-l-watch-accent' : ''
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3.5 flex items-start gap-3 text-left cursor-pointer hover:bg-surface-hover transition-colors"
      >
        {/* Status icon */}
        <div className="shrink-0 mt-0.5">
          {imp.worth_converting ? (
            <CheckCircle size={16} className="text-watch-text" />
          ) : imp.worth_converting === false ? (
            <XCircle size={16} className="text-text-muted" />
          ) : (
            <AlertTriangle size={16} className="text-urgent-text" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-text-primary">
              {imp.property_name || `Conv #${imp.hostaway_conversation_id}`}
            </span>
            {imp.classified_issue_type && (
              <span className="text-[10px] text-text-muted">
                {TRAINING_ISSUE_TYPE_LABELS[imp.classified_issue_type as TrainingIssueType] ?? imp.classified_issue_type}
              </span>
            )}
            {imp.converted_to_scenario && (
              <span className="text-[10px] text-watch-text font-medium">
                Converted
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-text-muted flex items-center gap-1">
              <MessageSquare size={11} strokeWidth={1.5} />
              {imp.message_count} msgs
            </span>
            {imp.date_range_start && (
              <span className="text-xs text-text-muted">
                {formatDate(imp.date_range_start)}
              </span>
            )}
            {imp.sentiment_score != null && (
              <SentimentBar score={imp.sentiment_score} />
            )}
            <div className="flex items-center gap-1.5">
              {imp.escalation_detected && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-fire-bg text-fire-text">Escalation</span>
              )}
              {imp.refund_requested && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-urgent-bg text-urgent-text">Refund</span>
              )}
              {imp.review_threatened && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-fire-bg text-fire-text">Review</span>
              )}
            </div>
          </div>
        </div>

        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={cn(
            'text-text-muted transition-transform duration-200 shrink-0 mt-1',
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
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              {/* Transcript preview */}
              <div className="max-h-60 overflow-y-auto themed-scroll space-y-2">
                {(() => {
                  // Handle both proper JSONB arrays and double-encoded JSON strings
                  let transcript = imp.raw_transcript ?? []
                  if (typeof transcript === 'string') {
                    try { transcript = JSON.parse(transcript) } catch { transcript = [] }
                  }
                  if (!Array.isArray(transcript)) transcript = []
                  const msgs = transcript as { role: string; content: string; timestamp?: string }[]
                  return (
                    <>
                      {msgs.slice(0, 20).map((msg, i) => (
                        <div key={i} className={cn('text-xs', msg.role === 'guest' ? 'text-text-secondary' : 'text-text-primary')}>
                          <span className="text-[10px] text-text-muted font-medium uppercase">
                            {msg.role === 'guest' ? 'Guest' : 'Host'}:
                          </span>{' '}
                          {msg.content}
                        </div>
                      ))}
                      {msgs.length > 20 && (
                        <p className="text-[10px] text-text-muted italic">
                          ...and {msgs.length - 20} more messages
                        </p>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* Actions */}
              {imp.converted_to_scenario && imp.scenario_id && (
                <button
                  onClick={() => navigate('/admin/scenarios')}
                  className="text-xs text-haven-indigo hover:underline cursor-pointer"
                >
                  View in Scenario Manager
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function HostawayImporter() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: imports, isLoading } = useHostawayImports()
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'convertible' | 'skipped'>('all')

  // Admin gate
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

  const handleImport = async () => {
    setImporting(true)
    setImportResult(null)
    setImportError(null)

    try {
      const result = await callHostawayImport(20)
      setImportResult(result.message)
      queryClient.invalidateQueries({ queryKey: ['hostawayImports'] })
      queryClient.invalidateQueries({ queryKey: ['allScenarios'] })
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const filtered = (imports ?? []).filter((imp) => {
    if (filter === 'convertible') return imp.worth_converting === true
    if (filter === 'skipped') return imp.worth_converting === false
    return true
  })

  const convertedCount = (imports ?? []).filter((i) => i.converted_to_scenario).length
  const worthCount = (imports ?? []).filter((i) => i.worth_converting).length

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
            className="flex items-start justify-between mb-6"
          >
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Hostaway Importer</h2>
              <p className="text-sm text-text-secondary mt-0.5">
                {imports?.length ?? 0} conversations imported
                {worthCount > 0 && ` · ${worthCount} worth converting`}
                {convertedCount > 0 && ` · ${convertedCount} converted`}
              </p>
            </div>
            <button
              onClick={handleImport}
              disabled={importing}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium transition-all duration-200 cursor-pointer',
                importing
                  ? 'text-text-muted bg-surface border border-border cursor-wait'
                  : 'text-white hover:scale-[1.03]'
              )}
              style={
                importing
                  ? {}
                  : {
                      background: 'rgba(123, 124, 248, 0.15)',
                      border: '1.5px solid rgba(123, 124, 248, 0.7)',
                      boxShadow: '0 0 8px rgba(123, 124, 248, 0.3)',
                    }
              }
            >
              {importing ? (
                <Loader2 size={16} strokeWidth={1.5} className="animate-spin" />
              ) : (
                <Download size={16} strokeWidth={1.5} />
              )}
              {importing ? 'Importing...' : 'Pull from Hostaway'}
            </button>
          </motion.div>

          {/* Result/Error Messages */}
          <AnimatePresence>
            {importResult && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 bg-watch-bg border border-watch-border rounded-[10px] px-4 py-3"
              >
                <p className="text-sm text-watch-text">{importResult}</p>
              </motion.div>
            )}
            {importError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 bg-fire-bg border border-fire-border rounded-[10px] px-4 py-3"
              >
                <p className="text-sm text-fire-text">{importError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="mb-5 bg-surface rounded-[10px] border border-border px-4 py-3"
          >
            <p className="text-xs text-text-secondary leading-relaxed">
              Pulls recent guest conversations from Hostaway (March 2025+), classifies them with AI,
              and auto-creates draft scenarios for conversations worth training on.
              Draft scenarios appear in the{' '}
              <button
                onClick={() => navigate('/admin/scenarios')}
                className="text-haven-indigo hover:underline cursor-pointer"
              >
                Scenario Manager
              </button>
              {' '}as unapproved + inactive — review and approve them there.
            </p>
          </motion.div>

          {/* Filter */}
          <div className="flex items-center gap-2 mb-4">
            {(['all', 'convertible', 'skipped'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'text-xs font-medium px-2.5 py-1 rounded-full border transition-colors cursor-pointer capitalize',
                  filter === f
                    ? 'text-haven-indigo border-haven-indigo/40 bg-haven-indigo/10'
                    : 'text-text-muted border-border'
                )}
              >
                {f === 'convertible' ? 'Worth Converting' : f === 'skipped' ? 'Skipped' : 'All'}
              </button>
            ))}
          </div>

          {/* Import List */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-text-secondary text-sm">Loading imports...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Download size={32} className="text-text-muted mx-auto mb-3" strokeWidth={1} />
              <p className="text-text-secondary text-sm">
                {(imports ?? []).length === 0
                  ? 'No conversations imported yet.'
                  : 'No conversations match this filter.'}
              </p>
              {(imports ?? []).length === 0 && (
                <p className="text-text-muted text-xs mt-1">
                  Click "Pull from Hostaway" to import and classify recent conversations.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((imp, i) => (
                <ImportRow key={imp.id} imp={imp} index={i} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
