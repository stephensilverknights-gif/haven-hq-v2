import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Clock, Eye, ChevronDown } from 'lucide-react'
import TopNav from '@/components/TopNav'
import IssueRow from '@/components/IssueRow'
import NewIssueModal from '@/components/NewIssueModal'
import IssueDetail from '@/components/IssueDetail'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useIssues } from '@/hooks/useIssues'
import { useProperties } from '@/hooks/useProperties'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Issue, Priority, IssueType } from '@/lib/types'
import { ISSUE_TYPE_LABELS, PRIORITY_LABELS } from '@/lib/types'

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
      className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-4"
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
        <span className="text-[12px] text-text-muted">Important</span>
      </div>
      <span className="text-text-muted opacity-30">·</span>
      <div className="flex items-center gap-2">
        <Eye size={13} strokeWidth={1.5} className="text-watch-text" />
        <span className="text-[13px] font-bold text-watch-text">{counts.watch}</span>
        <span className="text-[12px] text-text-muted">Upcoming</span>
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
  { priority: 'urgent',  icon: Clock, labelClass: 'text-urgent-text', dotColor: '#D97706', label: 'Important' },
  { priority: 'watch',   icon: Eye,   labelClass: 'text-watch-text',  dotColor: '#059669', label: 'Upcoming' },
]

function IssueGroup({
  priority: _priority,
  icon: Icon,
  labelClass,
  dotColor,
  label,
  issues,
  lastNotes,
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
  lastNotes: Record<string, { note: string; author: string } | undefined>
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

      <div className="grid grid-cols-1 gap-2 mb-1 min-w-0">
        {issues.map((issue, i) => (
          <motion.div
            key={issue.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1], delay: i * 0.03 }}
          >
            <IssueRow
              issue={issue}
              lastNote={lastNotes[issue.id]?.note}
              lastNoteAuthor={lastNotes[issue.id]?.author}
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
  const { issues, allIssues, counts, isLoading, error, lastNotes } = useIssues()
  const { data: properties } = useProperties()
  const [showNewIssue, setShowNewIssue] = useState(false)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [showResolved, setShowResolved] = useState(false)

  // Filters
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterProperty, setFilterProperty] = useState<string>('all')

  const { data: progressMap = {} } = useChecklistProgressMap()

  const showingResolved = filterPriority === 'resolved'

  // Apply filters to active issues
  const filteredIssues = useMemo(() => {
    if (showingResolved) return []
    return issues.filter((issue) => {
      if (filterPriority !== 'all' && issue.priority !== filterPriority) return false
      if (filterType !== 'all' && issue.type !== filterType) return false
      if (filterProperty !== 'all' && issue.property_id !== filterProperty) return false
      return true
    })
  }, [issues, filterPriority, filterType, filterProperty, showingResolved])

  // Apply same filters to resolved
  const resolvedIssues = useMemo(() => {
    return allIssues.filter((issue) => {
      if (issue.status !== 'resolved') return false
      if (filterPriority !== 'all' && !showingResolved && issue.priority !== filterPriority) return false
      if (filterType !== 'all' && issue.type !== filterType) return false
      if (filterProperty !== 'all' && issue.property_id !== filterProperty) return false
      return true
    })
  }, [allIssues, filterPriority, filterType, filterProperty, showingResolved])

  const grouped = {
    on_fire: filteredIssues.filter((i) => i.priority === 'on_fire'),
    urgent:  filteredIssues.filter((i) => i.priority === 'urgent'),
    watch:   filteredIssues.filter((i) => i.priority === 'watch'),
  }

  const hasActiveFilters = filterPriority !== 'all' || filterType !== 'all' || filterProperty !== 'all'

  const selectedIssue = allIssues.find((i) => i.id === selectedIssueId) ?? null

  return (
    <div className="h-screen flex flex-col bg-page-bg">
      <TopNav onNewIssue={() => setShowNewIssue(true)} />

      <div className="flex flex-1 min-h-0">
        {/* Left: issue list */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden themed-scroll">
          <div className="max-w-3xl mx-auto px-4 py-5 sm:px-6 sm:py-6">

            {/* Filter bar */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2 mb-5">
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-full sm:w-[150px] rounded-[8px] text-sm min-h-[40px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[145px] rounded-[8px] text-sm min-h-[40px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {(Object.entries(ISSUE_TYPE_LABELS) as [IssueType, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterProperty} onValueChange={setFilterProperty}>
                <SelectTrigger className="w-full sm:w-[170px] rounded-[8px] text-sm min-h-[40px] col-span-2 sm:col-span-1">
                  <SelectValue placeholder="Property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <button
                  onClick={() => { setFilterPriority('all'); setFilterType('all'); setFilterProperty('all') }}
                  className="text-[12px] text-haven-indigo hover:underline font-medium px-1"
                >
                  Clear filters
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-text-secondary text-sm">Loading…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <p className="text-text-secondary text-sm">Couldn't load tasks.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-haven-indigo text-sm hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : filteredIssues.length === 0 && resolvedIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                {hasActiveFilters ? (
                  <p className="text-text-muted text-sm">No tasks match your filters.</p>
                ) : (
                  <>
                    <p className="text-text-secondary text-lg mb-1">No active tasks</p>
                    <p className="text-text-muted text-sm">Click "New Task" to create one</p>
                  </>
                )}
              </div>
            ) : (
              <>
                {filteredIssues.length > 0 && (
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
                          lastNotes={lastNotes}
                          progressMap={progressMap}
                          selectedId={selectedIssueId}
                          onSelect={setSelectedIssueId}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Resolved section */}
                {resolvedIssues.length > 0 && !showingResolved && (
                  <div className={filteredIssues.length > 0 ? 'mt-8' : ''}>
                    <button
                      onClick={() => setShowResolved(!showResolved)}
                      className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors mb-3 min-h-[44px]"
                    >
                      <ChevronDown
                        size={16}
                        strokeWidth={1.5}
                        className={`transition-transform ${showResolved ? 'rotate-180' : ''}`}
                      />
                      Resolved ({resolvedIssues.length})
                    </button>

                    <AnimatePresence>
                      {showResolved && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid grid-cols-1 gap-2 overflow-hidden"
                        >
                          {resolvedIssues.map((issue) => (
                            <div key={issue.id} className="opacity-60">
                              <IssueRow
                                issue={issue}
                                lastNote={lastNotes[issue.id]?.note}
                                lastNoteAuthor={lastNotes[issue.id]?.author}
                                checklistProgress={progressMap[issue.id] ?? null}
                                isSelected={selectedIssueId === issue.id}
                                onClick={() => setSelectedIssueId(issue.id)}
                              />
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Resolved — shown prominently when "Resolved" filter is active */}
                {showingResolved && resolvedIssues.length > 0 && (
                  <div className="grid grid-cols-1 gap-2">
                    <p className="text-sm font-medium text-text-secondary mb-1">
                      Resolved ({resolvedIssues.length})
                    </p>
                    {resolvedIssues.map((issue) => (
                      <IssueRow
                        key={issue.id}
                        issue={issue}
                        lastNote={lastNotes[issue.id]?.note}
                        lastNoteAuthor={lastNotes[issue.id]?.author}
                        checklistProgress={progressMap[issue.id] ?? null}
                        isSelected={selectedIssueId === issue.id}
                        onClick={() => setSelectedIssueId(issue.id)}
                      />
                    ))}
                  </div>
                )}
                {showingResolved && resolvedIssues.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <p className="text-text-muted text-sm">No resolved tasks.</p>
                  </div>
                )}
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
