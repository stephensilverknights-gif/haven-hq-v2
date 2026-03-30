import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ClipboardList, ArrowLeft, ArrowRight, Check, ListChecks, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import PriorityBadge from '@/components/PriorityBadge'
import PropertyBadge from '@/components/PropertyBadge'
import ActivityLog from '@/components/ActivityLog'
import CostEntry from '@/components/CostEntry'
import { useUpdateIssueStatus } from '@/hooks/useIssues'
import { useChecklist, useToggleChecklistItem, useApplyTemplate } from '@/hooks/useChecklist'
import { useWorkflowTemplates } from '@/hooks/useWorkflowTemplates'
import { useAuth } from '@/contexts/AuthContext'
import type { Issue, IssueStatus } from '@/lib/types'
import { STATUS_LABELS, STATUS_STEPS, ISSUE_TYPE_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

interface IssueDetailProps {
  issue: Issue | null
  onClose: () => void
  variant?: 'overlay' | 'panel'
}

function StatusStepper({
  currentStatus,
  onStatusChange,
}: {
  currentStatus: IssueStatus
  onStatusChange: (status: IssueStatus) => void
}) {
  const currentIdx = STATUS_STEPS.indexOf(currentStatus)
  const nextStatus = currentIdx < STATUS_STEPS.length - 1 ? STATUS_STEPS[currentIdx + 1] : null
  const [showAll, setShowAll] = useState(false)

  return (
    <>
      {/* ── Desktop: horizontal stepper ── */}
      <div className="hidden sm:flex items-center overflow-x-auto pb-1 gap-0">
        {STATUS_STEPS.map((step, idx) => {
          const isActive = idx === currentIdx
          const isPast = idx < currentIdx
          const isClickable = idx !== currentIdx
          const isLast = idx === STATUS_STEPS.length - 1
          return (
            <div key={step} className="flex items-center shrink-0">
              <button
                onClick={() => isClickable && onStatusChange(step)}
                disabled={!isClickable}
                className={cn(
                  'relative text-[11px] font-medium px-2.5 py-1.5 rounded-[8px] whitespace-nowrap transition-all duration-150 flex items-center gap-1',
                  isActive
                    ? 'bg-haven-indigo text-white shadow-sm'
                    : isPast
                      ? 'bg-haven-indigo/10 text-haven-indigo hover:bg-haven-indigo/15'
                      : 'bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                )}
              >
                {isPast && <Check size={10} strokeWidth={2.5} className="shrink-0" />}
                {STATUS_LABELS[step]}
              </button>
              {!isLast && (
                <div className={cn('h-[1px] w-2 shrink-0 transition-colors duration-150', isPast || isActive ? 'bg-haven-indigo/30' : 'bg-border')} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Mobile: action-oriented layout ── */}
      <div className="sm:hidden space-y-3">
        {/* 5-segment progress bar */}
        <div className="flex items-center gap-1">
          {STATUS_STEPS.map((step, idx) => (
            <div
              key={step}
              className={cn(
                'flex-1 h-1.5 rounded-full transition-colors duration-200',
                idx < currentIdx ? 'bg-haven-indigo/50' :
                idx === currentIdx ? 'bg-haven-indigo' :
                'bg-surface'
              )}
            />
          ))}
        </div>

        {/* Current status + step count */}
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-text-primary">
            {STATUS_LABELS[currentStatus]}
          </span>
          <span className="text-[11px] text-text-muted">
            Step {currentIdx + 1} of {STATUS_STEPS.length}
          </span>
        </div>

        {/* Primary advance button */}
        {nextStatus && (
          <button
            onClick={() => onStatusChange(nextStatus)}
            className="w-full bg-haven-indigo hover:bg-haven-indigo-hover text-white text-[14px] font-medium rounded-[10px] min-h-[52px] flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
          >
            Mark as {STATUS_LABELS[nextStatus]}
            <ArrowRight size={15} strokeWidth={2} />
          </button>
        )}

        {/* "All steps" expandable toggle */}
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-between px-1 min-h-[44px] text-[12px] text-text-secondary hover:text-text-primary transition-colors"
        >
          <span>All steps</span>
          <ChevronDown
            size={14}
            strokeWidth={1.5}
            className={cn('transition-transform duration-200', showAll && 'rotate-180')}
          />
        </button>

        {/* Expanded full step list */}
        <AnimatePresence>
          {showAll && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-1 pb-1">
                {STATUS_STEPS.map((step, idx) => {
                  const isActive = idx === currentIdx
                  const isPast = idx < currentIdx
                  return (
                    <button
                      key={step}
                      onClick={() => {
                        if (!isActive) { onStatusChange(step); setShowAll(false) }
                      }}
                      disabled={isActive}
                      className={cn(
                        'w-full text-left text-[13px] px-3 min-h-[48px] rounded-[8px] flex items-center gap-3 transition-colors',
                        isActive
                          ? 'bg-haven-indigo/15 text-haven-indigo font-medium cursor-default'
                          : isPast
                            ? 'text-haven-indigo/80 hover:bg-surface active:bg-surface'
                            : 'text-text-secondary hover:bg-surface active:bg-surface'
                      )}
                    >
                      <div className={cn(
                        'w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center shrink-0',
                        isActive ? 'border-haven-indigo bg-haven-indigo' :
                        isPast ? 'border-haven-indigo/50 bg-haven-indigo/20' :
                        'border-border'
                      )}>
                        {(isActive || isPast) && <Check size={9} strokeWidth={3} className="text-white" />}
                      </div>
                      {STATUS_LABELS[step]}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
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

      <div className="flex-1 overflow-y-auto overscroll-contain">
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
            <StatusStepper
              currentStatus={issue.status}
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
