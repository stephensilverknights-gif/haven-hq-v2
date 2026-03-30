import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Clock, Eye } from 'lucide-react'
import TopNav from '@/components/TopNav'
import IssueRow from '@/components/IssueRow'
import NewIssueModal from '@/components/NewIssueModal'
import IssueDetail from '@/components/IssueDetail'
import { useIssues } from '@/hooks/useIssues'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Issue, Priority } from '@/lib/types'

function useChecklistProgressMap() {
  return useQuery({
    queryKey: ['checklistProgress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issue_checklist_items')
        .select('issue_id, completed')
      if (error) throw error
      const map: Record<string, { completed: number; total: number }> = {}
      for (const row of data ?? []) {
        if (!map[row.issue_id]) map[row.issue_id] = { completed: 0, total: 0 }
        map[row.issue_id].total++
        if (row.completed) map[row.issue_id].completed++
      }
      return map
    },
  })
}

function SummaryStrip({ counts }: { counts: { on_fire: number; urgent: number; watch: number } }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-5 mb-6"
    >
      <div className="flex items-center gap-2">
        <Flame size={13} strokeWidth={1.5} className="text-fire-text" />
        <span className="text-[13px] font-bold text-fire-text">{counts.on_fire}</span>
        <span className="text-[12px] text-text-muted">On Fire</span>
      </div>
      <span className="text-text-muted opacity-30">·</span>
      <div className="flex items-center gap-2">
        <Clock size={13} strokeWidth={1.5} className="text-urgent-text" />
        <span className="text-[13px] font-bold text-urgent-text">{counts.urgent}</span>
        <span className="text-[12px] text-text-muted">Urgent</span>
      </div>
      <span className="text-text-muted opacity-30">·</span>
      <div className="flex items-center gap-2">
        <Eye size={13} strokeWidth={1.5} className="text-watch-text" />
        <span className="text-[13px] font-bold text-watch-text">{counts.watch}</span>
        <span className="text-[12px] text-text-muted">Watch</span>
      </div>
    </motion.div>
  )
}

const priorityGroups: {
  priority: Priority
  icon: typeof Flame
  labelClass: string
  dotColor: string
  label: string
}[] = [
  { priority: 'on_fire', icon: Flame, labelClass: 'text-fire-text',   dotColor: '#EF4444', label: 'On Fire' },
  { priority: 'urgent',  icon: Clock, labelClass: 'text-urgent-text', dotColor: '#D97706', label: 'Urgent' },
  { priority: 'watch',   icon: Eye,   labelClass: 'text-watch-text',  dotColor: '#059669', label: 'Watch' },
]

function IssueGroup({
  priority: _priority,
  icon: Icon,
  labelClass,
  dotColor,
  label,
  issues,
  handoffNotes,
  progressMap,
  selectedId,
  onSelect,
}: {
  priority: Priority
  icon: typeof Flame
  labelClass: string
  dotColor: string
  label: string
  issues: Issue[]
  handoffNotes: Record<string, string | undefined>
  progressMap: Record<string, { completed: number; total: number }>
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (issues.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
        <Icon size={12} strokeWidth={1.5} className={labelClass} />
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${labelClass}`}>
          {label}
        </span>
        <span className="text-[11px] text-text-muted">· {issues.length}</span>
        <div className="flex-1 h-px bg-border ml-1" />
      </div>

      <div className="grid gap-2 mb-1">
        {issues.map((issue, i) => (
          <motion.div
            key={issue.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1], delay: i * 0.03 }}
          >
            <IssueRow
              issue={issue}
              handoffNote={handoffNotes[issue.id]}
              checklistProgress={progressMap[issue.id] ?? null}
              isSelected={selectedId === issue.id}
              onClick={() => onSelect(issue.id)}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default function HotSheet() {
  const { issues, counts, isLoading, error } = useIssues()
  const [showNewIssue, setShowNewIssue] = useState(false)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)

  const { data: progressMap = {} } = useChecklistProgressMap()

  const handoffNotes: Record<string, string | undefined> = {}
  for (const issue of issues) {
    if (issue.slack_note) handoffNotes[issue.id] = issue.slack_note
  }

  const grouped = {
    on_fire: issues.filter((i) => i.priority === 'on_fire'),
    urgent:  issues.filter((i) => i.priority === 'urgent'),
    watch:   issues.filter((i) => i.priority === 'watch'),
  }

  const selectedIssue = issues.find((i) => i.id === selectedIssueId) ?? null

  return (
    <div className="h-screen flex flex-col bg-page-bg">
      <TopNav onNewIssue={() => setShowNewIssue(true)} />

      <div className="flex flex-1 min-h-0">
        {/* Left: issue list */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-5 sm:px-6 sm:py-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-text-secondary text-sm">Loading…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <p className="text-text-secondary text-sm">Couldn't load issues.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-haven-indigo text-sm hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : issues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-text-secondary text-lg mb-1">No active issues</p>
                <p className="text-text-muted text-sm">Click "New Issue" to create one</p>
              </div>
            ) : (
              <>
                <SummaryStrip counts={counts} />
                <div className="flex flex-col gap-5">
                  {priorityGroups.map(({ priority, icon, labelClass, dotColor, label }) => (
                    <IssueGroup
                      key={priority}
                      priority={priority}
                      icon={icon}
                      labelClass={labelClass}
                      dotColor={dotColor}
                      label={label}
                      issues={grouped[priority]}
                      handoffNotes={handoffNotes}
                      progressMap={progressMap}
                      selectedId={selectedIssueId}
                      onSelect={setSelectedIssueId}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </main>

        {/* Right: detail panel — desktop only */}
        <AnimatePresence>
          {selectedIssue && (
            <motion.aside
              key="detail-panel"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="hidden sm:flex flex-col w-[480px] shrink-0 border-l border-border"
            >
              <IssueDetail
                variant="panel"
                issue={selectedIssue}
                onClose={() => setSelectedIssueId(null)}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile overlay */}
      <IssueDetail
        variant="overlay"
        issue={selectedIssue}
        onClose={() => setSelectedIssueId(null)}
      />

      <NewIssueModal open={showNewIssue} onClose={() => setShowNewIssue(false)} />
    </div>
  )
}
