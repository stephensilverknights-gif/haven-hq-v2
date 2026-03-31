import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import TopNav from '@/components/TopNav'
import IssueCard from '@/components/IssueCard'
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
import type { IssueType, Priority, IssueStatus } from '@/lib/types'
import { ISSUE_TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '@/lib/types'

export default function AllIssues() {
  const { allIssues, lastNotes, isLoading } = useIssues()
  const { data: properties } = useProperties()
  const [showNewIssue, setShowNewIssue] = useState(false)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)

  const [filterProperty, setFilterProperty] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showResolved, setShowResolved] = useState(false)

  const filtered = useMemo(() => {
    return allIssues.filter((issue) => {
      if (filterProperty !== 'all' && issue.property_id !== filterProperty) return false
      if (filterType !== 'all' && issue.type !== filterType) return false
      if (filterPriority !== 'all' && issue.priority !== filterPriority) return false
      if (filterStatus !== 'all' && issue.status !== filterStatus) return false
      return true
    })
  }, [allIssues, filterProperty, filterType, filterPriority, filterStatus])

  const activeIssues = filtered.filter((i) => i.status !== 'resolved')
  const resolvedIssues = filtered.filter((i) => i.status === 'resolved')

  const selectedIssue = allIssues.find((i) => i.id === selectedIssueId) ?? null

  return (
    <div className="h-screen flex flex-col bg-page-bg">
      <TopNav onNewIssue={() => setShowNewIssue(true)} />

      <div className="flex flex-1 min-h-0">
        {/* Left: filtered list */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
            <h2 className="text-xl font-semibold text-text-primary mb-4">All Tasks</h2>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 mb-6">
              <Select value={filterProperty} onValueChange={setFilterProperty}>
                <SelectTrigger className="w-full sm:w-[180px] rounded-[8px] text-sm min-h-[44px] sm:min-h-0">
                  <SelectValue placeholder="Property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[160px] rounded-[8px] text-sm min-h-[44px] sm:min-h-0">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {(Object.entries(ISSUE_TYPE_LABELS) as [IssueType, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-full sm:w-[140px] rounded-[8px] text-sm min-h-[44px] sm:min-h-0">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[170px] rounded-[8px] text-sm min-h-[44px] sm:min-h-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {(Object.entries(STATUS_LABELS) as [IssueStatus, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Active issues */}
            {isLoading ? (
              <p className="text-text-secondary py-10 text-center">Loading...</p>
            ) : activeIssues.length === 0 && resolvedIssues.length === 0 ? (
              <p className="text-text-muted py-10 text-center">No tasks match your filters.</p>
            ) : (
              <>
                <motion.div
                  className="grid gap-3"
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                >
                  {activeIssues.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      handoffNote={issue.slack_note ?? undefined}
                      lastNote={lastNotes[issue.id]}
                      onClick={() => setSelectedIssueId(issue.id)}
                    />
                  ))}
                </motion.div>

                {/* Resolved section */}
                {resolvedIssues.length > 0 && (
                  <div className="mt-8">
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
                          className="grid gap-3 overflow-hidden"
                        >
                          {resolvedIssues.map((issue) => (
                            <div key={issue.id} className="opacity-60">
                              <IssueCard
                                issue={issue}
                                handoffNote={issue.slack_note ?? undefined}
                                lastNote={lastNotes[issue.id]}
                                onClick={() => setSelectedIssueId(issue.id)}
                              />
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
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
