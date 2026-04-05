import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Clock, Eye, ChevronDown } from 'lucide-react'
import TopNav from '@/components/TopNav'
import IssueCardV2 from '@/components/IssueCardV2'
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
import { useAllCostEntries } from '@/hooks/useCostEntries'
import { useLastCompletedChecklist } from '@/hooks/useLastCompletedChecklist'
import { toIssueCardV2Props } from '@/lib/toIssueCardV2Props'
import type { CostEntry } from '@/lib/types'
import type { Issue, Priority, IssueType } from '@/lib/types'
import { ISSUE_TYPE_LABELS, PRIORITY_LABELS } from '@/lib/types'

function SummaryStrip({ counts }: { counts: { on_fire: number; urgent: number; watch: number } }) {
  const items = [
    { icon: Flame, count: counts.on_fire, label: 'On Fire',  color: '#FF6B6B', shadow: 'rgba(239,68,68' },
    { icon: Clock, count: counts.urgent,  label: 'Important', color: '#FBBF24', shadow: 'rgba(217,119,6' },
    { icon: Eye,   count: counts.watch,   label: 'Upcoming', color: '#34D399', shadow: 'rgba(52,211,153' },
  ]
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center flex-wrap gap-x-3 gap-y-2 mb-4"
    >
      {items.map(({ icon: Icon, count, label, color, shadow }, i) => (
        <div key={label} className="flex items-center">
          <div className="flex items-center gap-1.5">
            <Icon
              size={13}
              strokeWidth={1.5}
              color={color}
              style={{ filter: `drop-shadow(0 0 3px ${color})` }}
            />
            <span
              className="text-[13px] font-bold"
              style={{ color, textShadow: `0 0 6px ${shadow},0.4)` }}
            >
              {count}
            </span>
            <span className="text-[12px] text-text-muted">{label}</span>
          </div>
          {i < items.length - 1 && (
            <span className="text-text-muted opacity-30 ml-3">·</span>
          )}
        </div>
      ))}
    </motion.div>
  )
}

const priorityGroups: {
  priority: Priority
  icon: typeof Flame
  labelClass: string
  dotColor: string
  shimmer: string
  label: string
}[] = [
  {
    priority: 'on_fire', icon: Flame, labelClass: 'text-fire-text',
    dotColor: '#FF6B6B',
    shimmer: 'linear-gradient(90deg,transparent,rgba(239,68,68,0.35) 30%,rgba(239,68,68,0.15) 70%,transparent)',
    label: 'On Fire',
  },
  {
    priority: 'urgent', icon: Clock, labelClass: 'text-urgent-text',
    dotColor: '#FBBF24',
    shimmer: 'linear-gradient(90deg,transparent,rgba(251,191,36,0.3) 30%,rgba(251,191,36,0.12) 70%,transparent)',
    label: 'Important',
  },
  {
    priority: 'watch', icon: Eye, labelClass: 'text-watch-text',
    dotColor: '#34D399',
    shimmer: 'linear-gradient(90deg,transparent,rgba(52,211,153,0.25) 30%,rgba(52,211,153,0.1) 70%,transparent)',
    label: 'Upcoming',
  },
]

function IssueGroup({
  priority: _priority,
  icon: Icon,
  labelClass,
  dotColor,
  shimmer,
  label,
  issues,
  lastNotes,
  costEntriesByIssue,
  lastCompletedByIssue,
  selectedId,
  onSelect,
}: {
  priority: Priority
  icon: typeof Flame
  labelClass: string
  dotColor: string
  label: string
  shimmer: string
  issues: Issue[]
  lastNotes: Record<string, { note: string; author: string } | undefined>
  costEntriesByIssue: Record<string, CostEntry[]>
  lastCompletedByIssue: Record<string, import('@/hooks/useLastCompletedChecklist').LastCompletedChecklistItem> | undefined
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
        <span
          className="w-[5px] h-[5px] rounded-full shrink-0"
          style={{
            backgroundColor: dotColor,
            boxShadow: `0 0 6px ${dotColor}, 0 0 2px ${dotColor}`,
          }}
        />
        <Icon
          size={12}
          strokeWidth={1.5}
          className={labelClass}
          style={{ filter: `drop-shadow(0 0 3px ${dotColor})` }}
        />
        <span
          className={`text-[11px] font-semibold uppercase tracking-wider ${labelClass}`}
          style={{ textShadow: `0 0 6px ${dotColor}59` }}
        >
          {label}
        </span>
        <span className="text-[11px] text-text-muted">· {issues.length}</span>
        <div
          className="flex-1 h-px ml-1"
          style={{ background: shimmer }}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 mb-1 min-w-0">
        {issues.map((issue, i) => (
          <motion.div
            key={issue.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1], delay: i * 0.03 }}
          >
            <IssueCardV2
              {...toIssueCardV2Props(issue, {
                costEntries: costEntriesByIssue[issue.id],
                lastCompletedChecklistItem: lastCompletedByIssue?.[issue.id],
                lastNote: lastNotes[issue.id],
              })}
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

  const { data: allCostEntries } = useAllCostEntries()
  const { data: lastCompletedByIssue } = useLastCompletedChecklist()

  const costEntriesByIssue = useMemo(() => {
    const map: Record<string, CostEntry[]> = {}
    for (const c of allCostEntries ?? []) {
      if (!map[c.issue_id]) map[c.issue_id] = []
      map[c.issue_id].push(c)
    }
    return map
  }, [allCostEntries])

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
                      {priorityGroups.map(({ priority, icon, labelClass, dotColor, shimmer, label }) => (
                        <IssueGroup
                          key={priority}
                          priority={priority}
                          icon={icon}
                          labelClass={labelClass}
                          dotColor={dotColor}
                          shimmer={shimmer}
                          label={label}
                          issues={grouped[priority]}
                          lastNotes={lastNotes}
                          costEntriesByIssue={costEntriesByIssue}
                          lastCompletedByIssue={lastCompletedByIssue}
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
                            <IssueCardV2
                              key={issue.id}
                              {...toIssueCardV2Props(issue, {
                                costEntries: costEntriesByIssue[issue.id],
                                lastCompletedChecklistItem: lastCompletedByIssue?.[issue.id],
                                lastNote: lastNotes[issue.id],
                              })}
                              isSelected={selectedIssueId === issue.id}
                              onClick={() => setSelectedIssueId(issue.id)}
                            />
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
                      <IssueCardV2
                        key={issue.id}
                        {...toIssueCardV2Props(issue, {
                          costEntries: costEntriesByIssue[issue.id],
                          lastCompletedChecklistItem: lastCompletedByIssue?.[issue.id],
                          lastNote: lastNotes[issue.id],
                        })}
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
