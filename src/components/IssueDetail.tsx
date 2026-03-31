import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ClipboardList, ArrowLeft, Check, ListChecks, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import PriorityBadge from '@/components/PriorityBadge'
import PropertyBadge from '@/components/PropertyBadge'
import ActivityLog from '@/components/ActivityLog'
import CostEntry from '@/components/CostEntry'
import { useUpdateIssueStatus } from '@/hooks/useIssues'
import { useChecklist, useToggleChecklistItem, useApplyTemplate } from '@/hooks/useChecklist'
import { useWorkflowTemplates } from '@/hooks/useWorkflowTemplates'
import { useAuth } from '@/contexts/AuthContext'
import type { Issue, IssueStatus } from '@/lib/types'
import { STATUS_LABELS, ISSUE_TYPE_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

interface IssueDetailProps {
  issue: Issue | null
  onClose: () => void
  variant?: 'overlay' | 'panel'
}

const STATUS_OPTIONS: { value: IssueStatus; label: string; color: string }[] = [
  { value: 'open',        label: 'Open',        color: '#7878A8' },
  { value: 'in_progress', label: 'In Progress', color: '#7B7CF8' },
  { value: 'waiting',     label: 'Waiting',     color: '#FBBF24' },
  { value: 'stuck',       label: 'Stuck',       color: '#FF6B6B' },
]

function StatusSelector({
  currentStatus,
  pendingStatus,
  onStatusChange,
}: {
  currentStatus: IssueStatus
  pendingStatus: IssueStatus | null
  onStatusChange: (status: IssueStatus) => void
}) {
  if (currentStatus === 'resolved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-watch-text">
        <Check size={13} strokeWidth={2.5} />
        Resolved
      </span>
    )
  }

  const displayed = pendingStatus ?? currentStatus
  const dotColor = STATUS_OPTIONS.find(o => o.value === displayed)?.color ?? '#7878A8'

  return (
    <Select
      value={displayed}
      onValueChange={(val) => {
        if (val !== currentStatus) onStatusChange(val as IssueStatus)
      }}
    >
      <SelectTrigger className="w-full sm:w-[180px] h-9 rounded-[8px] text-sm border-border bg-surface gap-2">
        <div className="flex items-center gap-2 min-w-0 pointer-events-none">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
          <span className="text-text-primary truncate">{STATUS_LABELS[displayed]}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map(({ value, label, color }) => (
          <SelectItem key={value} value={value}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              {label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function IssueChecklist({ issueId }: { issueId: string }) {
  const { user } = useAuth()
  const { data: items, isLoading } = useChecklist(issueId)
  const { data: templates } = useWorkflowTemplates()
  const toggleItem = useToggleChecklistItem()
  const applyTemplate = useApplyTemplate()
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)

  if (isLoading) return null

  const hasItems = items && items.length > 0
  const completedCount = items?.filter((i) => i.completed).length ?? 0
  const totalCount = items?.length ?? 0

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListChecks size={14} strokeWidth={1.5} className="text-text-muted" />
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
            Checklist
          </label>
          {hasItems && (
            <span className="text-[11px] font-semibold text-haven-indigo bg-haven-indigo/10 px-1.5 py-0.5 rounded-full">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>
        {!hasItems && templates && templates.length > 0 && (
          <button
            onClick={() => setShowTemplatePicker(!showTemplatePicker)}
            className="flex items-center gap-1 text-[12px] text-haven-indigo hover:text-haven-indigo/80 font-medium transition-colors"
          >
            Apply template
            <ChevronDown
              size={12}
              strokeWidth={2}
              className={cn('transition-transform', showTemplatePicker && 'rotate-180')}
            />
          </button>
        )}
      </div>

      {/* Template picker */}
      <AnimatePresence>
        {showTemplatePicker && !hasItems && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mb-3 overflow-hidden"
          >
            <div className="bg-surface border border-border rounded-[8px] p-2 space-y-1">
              {templates?.map((t) => (
                <button
                  key={t.id}
                  onClick={async () => {
                    await applyTemplate.mutateAsync({ issueId, steps: t.steps })
                    setShowTemplatePicker(false)
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-[6px] hover:bg-surface-hover transition-colors group"
                >
                  <p className="text-[13px] font-medium text-text-primary group-hover:text-haven-indigo transition-colors">
                    {t.name}
                  </p>
                  <p className="text-[11px] text-text-muted">{t.steps.length} steps</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checklist items */}
      {hasItems ? (
        <div className="space-y-1">
          {/* Progress bar */}
          <div className="h-1 bg-surface rounded-full mb-3 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-haven-indigo"
              initial={{ width: 0 }}
              animate={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              className="flex items-start gap-2.5 py-1.5 group"
            >
              <button
                onClick={() =>
                  toggleItem.mutate({
                    itemId: item.id,
                    completed: !item.completed,
                    userId: user?.id ?? '',
                    issueId,
                  })
                }
                className={cn(
                  'w-4 h-4 mt-[1px] shrink-0 rounded-[4px] border-2 transition-all flex items-center justify-center',
                  item.completed
                    ? 'bg-haven-indigo border-haven-indigo'
                    : 'border-border hover:border-haven-indigo/60'
                )}
              >
                {item.completed && <Check size={9} strokeWidth={3} className="text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    'text-[13px] leading-snug transition-colors',
                    item.completed
                      ? 'line-through text-text-muted'
                      : 'text-text-secondary'
                  )}
                >
                  {item.label}
                </span>
                {item.completed && item.completer && (
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {item.completer.name}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : !showTemplatePicker ? (
        <p className="text-[13px] text-text-muted italic">
          No checklist.{' '}
          {templates && templates.length > 0 ? (
            <button
              onClick={() => setShowTemplatePicker(true)}
              className="text-haven-indigo hover:underline"
            >
              Apply a template
            </button>
          ) : (
            <span>Create templates in Settings.</span>
          )}
        </p>
      ) : null}
    </div>
  )
}

function IssueDetailContent({
  issue,
  onClose,
  variant,
}: {
  issue: Issue
  onClose: () => void
  variant: 'overlay' | 'panel'
}) {
  const { user } = useAuth()
  const updateStatus = useUpdateIssueStatus()
  const queryClient = useQueryClient()
  const [statusNote, setStatusNote] = useState('')
  const [pendingStatus, setPendingStatus] = useState<IssueStatus | null>(null)
  const [slackNote, setSlackNote] = useState('')
  const [slackEditing, setSlackEditing] = useState(false)

  const handleStatusChange = (newStatus: IssueStatus) => {
    setPendingStatus(newStatus)
    setStatusNote('')
  }

  const confirmStatusChange = async () => {
    if (!pendingStatus || !statusNote.trim() || !user) return

    await updateStatus.mutateAsync({
      issueId: issue.id,
      status: pendingStatus,
      note: statusNote.trim(),
      userId: user.id,
      previousStatus: issue.status,
    })
    setPendingStatus(null)
    setStatusNote('')
  }

  const handleSlackUpdate = async () => {
    if (!slackNote.trim()) return

    await supabase
      .from('issues')
      .update({
        slack_note: slackNote.trim(),
        slack_note_updated_at: new Date().toISOString(),
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', issue.id)

    queryClient.invalidateQueries({ queryKey: ['issues'] })
    setSlackEditing(false)
  }

  const isPanel = variant === 'panel'

  return (
    <div className={cn('flex flex-col', isPanel ? 'h-full w-full bg-card-bg' : 'h-full w-full bg-card-bg')}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {/* Back button — overlay mobile only */}
          {!isPanel && (
            <button
              onClick={onClose}
              className="sm:hidden flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 text-text-muted hover:text-text-secondary transition-colors"
            >
              <ArrowLeft size={20} strokeWidth={1.5} />
            </button>
          )}
          {issue.property && (
            <PropertyBadge
              name={issue.property.name}
              colorTag={issue.property.color_tag}
            />
          )}
          <PriorityBadge priority={issue.priority} />
        </div>
        {/* Close button */}
        <button
          onClick={onClose}
          className="flex items-center justify-center min-w-[44px] min-h-[44px] text-text-muted hover:text-text-secondary transition-colors shrink-0 -mr-2"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain themed-scroll">
        <div className="px-4 sm:px-5 py-4 space-y-5">
          {/* Title + Type */}
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-1">
              {issue.title}
            </h2>
            <span className="text-xs text-text-muted">
              {ISSUE_TYPE_LABELS[issue.type]}
            </span>
            {issue.description && (
              <p className="text-sm text-text-secondary mt-2">
                {issue.description}
              </p>
            )}
          </div>

          {/* Status Stepper */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 block">
              Status
            </label>
            <StatusSelector
              currentStatus={issue.status}
              pendingStatus={pendingStatus}
              onStatusChange={handleStatusChange}
            />

            {/* Status change note */}
            <AnimatePresence>
              {pendingStatus && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2"
                >
                  <p className="text-xs text-text-secondary">
                    Moving to <strong>{STATUS_LABELS[pendingStatus]}</strong> — add a note:
                  </p>
                  <Textarea
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="What's happening?"
                    className="rounded-[8px] min-h-[60px] text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={confirmStatusChange}
                      disabled={!statusNote.trim() || updateStatus.isPending}
                      className="rounded-[8px] min-h-[44px] sm:min-h-0"
                      style={{ backgroundColor: '#7B7CF8' }}
                    >
                      {updateStatus.isPending ? 'Saving...' : 'Confirm'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPendingStatus(null)}
                      className="rounded-[8px] min-h-[44px] sm:min-h-0"
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Separator />

          {/* Checklist */}
          <IssueChecklist issueId={issue.id} />

          <Separator />

          {/* Handoff Note */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList size={14} strokeWidth={1.5} className="text-text-muted" />
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Handoff Note
              </label>
            </div>
            {slackEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={slackNote}
                  onChange={(e) => setSlackNote(e.target.value)}
                  placeholder="What does the next person need to know?"
                  className="rounded-[8px] min-h-[60px] text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSlackUpdate}
                    className="rounded-[8px] min-h-[44px] sm:min-h-0"
                    style={{ backgroundColor: '#7B7CF8' }}
                  >
                    Update
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSlackEditing(false)}
                    className="rounded-[8px] min-h-[44px] sm:min-h-0"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => {
                  setSlackNote(issue.slack_note ?? '')
                  setSlackEditing(true)
                }}
                className="text-sm text-text-secondary bg-surface border border-border rounded-[8px] px-3 py-2.5 cursor-pointer hover:bg-surface-hover transition-colors min-h-[44px]"
              >
                {issue.slack_note || (
                  <span className="text-text-secondary italic">
                    Click to add a handoff note...
                  </span>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Activity Log */}
          <ActivityLog issueId={issue.id} />

          <Separator />

          {/* Cost Entries */}
          <CostEntry issueId={issue.id} />

          {/* Resolve Button */}
          {issue.status !== 'resolved' && (
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full rounded-[8px] text-watch-text border-watch-border hover:bg-watch-bg min-h-[44px]"
                onClick={() => handleStatusChange('resolved')}
              >
                Resolve Issue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function IssueDetail({ issue, onClose, variant = 'overlay' }: IssueDetailProps) {
  if (variant === 'panel') {
    if (!issue) return null
    return <IssueDetailContent issue={issue} onClose={onClose} variant="panel" />
  }

  // Overlay variant — mobile only (sm:hidden)
  return (
    <AnimatePresence>
      {issue && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40 sm:hidden"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 h-full w-full sm:hidden border-l border-border shadow-2xl z-50"
          >
            <IssueDetailContent issue={issue} onClose={onClose} variant="overlay" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
