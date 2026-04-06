import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft, Check, ListChecks, ChevronDown, Trash2, Pencil, Calendar, User } from 'lucide-react'
import { format, isPast, differenceInHours } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import PriorityBadge from '@/components/PriorityBadge'
import PropertyBadge from '@/components/PropertyBadge'
import ActivityLog from '@/components/ActivityLog'
import CostEntry from '@/components/CostEntry'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateIssueStatus, useUpdateIssuePriority, useUpdateIssueTitle, useUpdateIssueProperty, useUpdateIssueDueDate, useUpdateIssueReservation } from '@/hooks/useIssues'
import { useProperties } from '@/hooks/useProperties'
import ReservationPicker from '@/components/ReservationPicker'
import { useChecklist, useToggleChecklistItem, useApplyTemplate, useDeleteChecklist } from '@/hooks/useChecklist'
import { useWorkflowTemplates } from '@/hooks/useWorkflowTemplates'
import { useAuth } from '@/contexts/AuthContext'
import type { Issue, IssueStatus, Priority } from '@/lib/types'
import { STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types'
import { useIssueTypes } from '@/hooks/useIssueTypes'
import { cn } from '@/lib/utils'

interface IssueDetailProps {
  issue: Issue | null
  onClose: () => void
  variant?: 'overlay' | 'panel'
}

const STATUS_OPTIONS: { value: IssueStatus; label: string; color: string }[] = [
  { value: 'in_progress', label: 'In Progress', color: '#7B7CF8' },
  { value: 'stuck',       label: 'Stuck',       color: '#FBBF24' },
]

// Priority → neon palette for panel-wide tinting (matches IssueCardV2)
const PRIORITY_PANEL: Record<Priority, { accent: string; accentSoft: string; bloom: string; shimmer: string }> = {
  on_fire: {
    accent: '#FF6B6B',
    accentSoft: 'rgba(239,68,68,0.55)',
    bloom: 'rgba(239,68,68,0.25)',
    shimmer: 'linear-gradient(90deg,transparent 3%,rgba(239,68,68,0.4) 25%,rgba(255,107,107,0.65) 50%,rgba(239,68,68,0.4) 75%,transparent 97%)',
  },
  urgent: {
    accent: '#FBBF24',
    accentSoft: 'rgba(217,119,6,0.5)',
    bloom: 'rgba(217,119,6,0.2)',
    shimmer: 'linear-gradient(90deg,transparent 3%,rgba(251,191,36,0.35) 25%,rgba(251,191,36,0.6) 50%,rgba(251,191,36,0.35) 75%,transparent 97%)',
  },
  watch: {
    accent: '#34D399',
    accentSoft: 'rgba(52,211,153,0.4)',
    bloom: 'rgba(52,211,153,0.15)',
    shimmer: 'linear-gradient(90deg,transparent 3%,rgba(52,211,153,0.3) 25%,rgba(52,211,153,0.5) 50%,rgba(52,211,153,0.3) 75%,transparent 97%)',
  },
}

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

  return (
    <div className="flex flex-wrap gap-2">
      {STATUS_OPTIONS.map(({ value, label, color }) => {
        const isSelected = value === displayed
        return (
          <button
            key={value}
            onClick={() => { if (value !== currentStatus) onStatusChange(value as IssueStatus) }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium border transition-all duration-150',
              isSelected
                ? 'text-text-primary'
                : 'bg-surface border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            )}
            style={isSelected ? {
              backgroundColor: color + '20',
              borderColor: color + 'B3',
              color,
              boxShadow: `0 0 10px ${color}50, 0 0 20px ${color}26, inset 0 0 8px ${color}1A`,
            } : {}}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor: color,
                boxShadow: isSelected ? `0 0 6px ${color}` : undefined,
              }}
            />
            {label}
          </button>
        )
      })}
    </div>
  )
}

const PRIORITY_OPTIONS: { value: Priority; color: string }[] = [
  { value: 'on_fire', color: '#FF6B6B' },
  { value: 'urgent',  color: '#FBBF24' },
  { value: 'watch',   color: '#34D399' },
]

function PrioritySelector({
  currentPriority,
  onPriorityChange,
}: {
  currentPriority: Priority
  onPriorityChange: (p: Priority) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRIORITY_OPTIONS.map(({ value, color }) => {
        const isSelected = value === currentPriority
        return (
          <button
            key={value}
            onClick={() => { if (value !== currentPriority) onPriorityChange(value) }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium border transition-all duration-150',
              isSelected
                ? 'text-text-primary'
                : 'bg-surface border-border text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            )}
            style={isSelected ? {
              backgroundColor: color + '20',
              borderColor: color + 'B3',
              color,
              boxShadow: `0 0 10px ${color}50, 0 0 20px ${color}26, inset 0 0 8px ${color}1A`,
            } : {}}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor: color,
                boxShadow: isSelected ? `0 0 6px ${color}` : undefined,
              }}
            />
            {PRIORITY_LABELS[value]}
          </button>
        )
      })}
    </div>
  )
}

function IssueChecklist({ issueId }: { issueId: string }) {
  const { user } = useAuth()
  const { data: items, isLoading } = useChecklist(issueId)
  const { data: templates } = useWorkflowTemplates()
  const toggleItem = useToggleChecklistItem()
  const applyTemplate = useApplyTemplate()
  const deleteChecklist = useDeleteChecklist()
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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
        {hasItems && !confirmDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-text-muted hover:text-red-500 transition-colors p-1 rounded-[6px] hover:bg-red-500/10"
            title="Remove checklist"
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        )}
        {hasItems && confirmDelete && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-muted">Remove?</span>
            <button
              onClick={async () => {
                await deleteChecklist.mutateAsync(issueId)
                setConfirmDelete(false)
              }}
              className="text-[11px] font-medium text-red-500 hover:text-red-600 px-1.5 py-0.5 rounded-[4px] hover:bg-red-500/10 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[11px] font-medium text-text-muted hover:text-text-secondary px-1.5 py-0.5 rounded-[4px] hover:bg-surface-hover transition-colors"
            >
              No
            </button>
          </div>
        )}
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
  const { labels: typeLabels } = useIssueTypes()
  const { data: allProperties } = useProperties()
  const updateStatus = useUpdateIssueStatus()
  const updatePriority = useUpdateIssuePriority()
  const updateTitle = useUpdateIssueTitle()
  const updateProperty = useUpdateIssueProperty()
  const updateDueDate = useUpdateIssueDueDate()
  const updateReservation = useUpdateIssueReservation()
  const [statusNote, setStatusNote] = useState('')
  const [pendingStatus, setPendingStatus] = useState<IssueStatus | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [editingProperty, setEditingProperty] = useState(false)

  const handlePriorityChange = (priority: Priority) => {
    if (!user) return
    updatePriority.mutate({ issueId: issue.id, priority, userId: user.id })
  }

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

  const isPanel = variant === 'panel'
  const neon = PRIORITY_PANEL[issue.priority]

  return (
    <div className={cn('flex flex-col h-full w-full bg-card-bg')}>
      {/* Header — priority-tinted indigo wash + shimmer divider */}
      <div
        className="relative flex items-center justify-between px-4 sm:px-5 py-4 shrink-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(123,124,248,0.10) 0%, rgba(123,124,248,0.04) 100%)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Back button — overlay mobile only */}
          {!isPanel && (
            <button
              onClick={onClose}
              className="sm:hidden flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 text-text-muted hover:text-text-secondary transition-colors"
              style={{
                filter:
                  'drop-shadow(0 0 4px rgba(123,124,248,0.4)) drop-shadow(0 0 10px rgba(123,124,248,0.2))',
              }}
            >
              <ArrowLeft size={20} strokeWidth={1.5} />
            </button>
          )}
          {issue.property && !editingProperty && (
            <button
              onClick={() => setEditingProperty(true)}
              className="group"
              title="Click to change property"
            >
              <PropertyBadge
                name={issue.property.name}
                colorTag={issue.property.color_tag}
              />
            </button>
          )}
          {editingProperty && (
            <Select
              value={issue.property_id}
              onValueChange={(v) => {
                if (user && v !== issue.property_id) {
                  updateProperty.mutate({ issueId: issue.id, propertyId: v, userId: user.id })
                }
                setEditingProperty(false)
              }}
            >
              <SelectTrigger className="w-[160px] rounded-[8px] text-sm h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  if (!allProperties?.length) return null
                  const markets = [...new Set(allProperties.map(p => p.market))]
                  return markets.map((market, mi) => (
                    <SelectGroup key={market}>
                      <SelectLabel className="text-[11px] font-semibold uppercase tracking-wider text-text-muted px-2 pt-2 pb-1">
                        {market}
                      </SelectLabel>
                      {allProperties.filter(p => p.market === market).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                      {mi < markets.length - 1 && <SelectSeparator />}
                    </SelectGroup>
                  ))
                })()}
              </SelectContent>
            </Select>
          )}
          <PriorityBadge priority={issue.priority} />
        </div>
        {/* Close button */}
        <button
          onClick={onClose}
          className="flex items-center justify-center min-w-[44px] min-h-[44px] text-text-muted hover:text-text-secondary transition-colors shrink-0 -mr-2"
          style={{
            filter:
              'drop-shadow(0 0 4px rgba(123,124,248,0.4)) drop-shadow(0 0 10px rgba(123,124,248,0.2))',
          }}
        >
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>
      {/* Shimmer divider — priority-tinted, matches IssueCardV2 */}
      <div className="relative shrink-0">
        <div
          className="absolute left-0 right-0 top-0 h-[1px]"
          style={{ background: neon.shimmer }}
        />
        <div
          aria-hidden
          className="absolute left-0 right-0 top-0 h-[6px] pointer-events-none"
          style={{
            background: neon.shimmer,
            filter: 'blur(3px)',
            opacity: 0.5,
          }}
        />
        <div className="h-[1px]" />
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain themed-scroll">
        <div className="px-4 sm:px-5 py-4 space-y-5">
          {/* Title + Type (editable) */}
          <div>
            {editingTitle ? (
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => {
                  if (titleDraft.trim() && titleDraft.trim() !== issue.title && user) {
                    updateTitle.mutate({ issueId: issue.id, title: titleDraft.trim(), userId: user.id })
                  }
                  setEditingTitle(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') { setEditingTitle(false) }
                }}
                className="text-lg font-semibold rounded-[8px] mb-1"
                autoFocus
              />
            ) : (
              <h2
                className="text-lg font-semibold text-text-primary mb-1 cursor-pointer hover:text-haven-indigo transition-colors group flex items-center gap-1.5"
                onClick={() => { setTitleDraft(issue.title); setEditingTitle(true) }}
              >
                {issue.title}
                <Pencil size={12} strokeWidth={1.5} className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
              </h2>
            )}
            <span className="text-xs text-text-muted">
              {typeLabels[issue.type] ?? issue.type}
            </span>

            {/* Reservation banner + picker */}
            {issue.reservation ? (
              <div
                className="mt-3 rounded-[8px] px-3 py-2.5"
                style={{
                  background: 'rgba(123,124,248,0.06)',
                  border: '1px solid rgba(123,124,248,0.25)',
                  boxShadow: '0 0 8px rgba(123,124,248,0.08)',
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <User size={12} strokeWidth={1.5} color="#9596FF" />
                    <span className="text-[13px] font-semibold" style={{ color: '#E8E8F2' }}>
                      {issue.reservation.guest_name ?? 'Guest'}
                    </span>
                  </div>
                  <button
                    onClick={() => user && updateReservation.mutate({ issueId: issue.id, reservationId: null, userId: user.id })}
                    className="text-[11px] text-text-muted hover:text-red-400 transition-colors"
                  >
                    Unlink
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[12px]" style={{ color: '#9596FF' }}>
                  <Calendar size={11} strokeWidth={1.5} />
                  <span>
                    {issue.reservation.check_in ? format(new Date(issue.reservation.check_in), 'MMM d, h:mm a') : '?'}
                    {' → '}
                    {issue.reservation.check_out ? format(new Date(issue.reservation.check_out), 'MMM d, h:mm a') : '?'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <ReservationPicker
                  propertyId={issue.property_id}
                  value="none"
                  onChange={(resId) => {
                    if (resId !== 'none' && user) {
                      updateReservation.mutate({ issueId: issue.id, reservationId: resId, userId: user.id })
                    }
                  }}
                />
              </div>
            )}

            {issue.description && (
              <div className="mt-2">
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                  Situational Context
                </span>
                <p className="text-sm text-text-secondary mt-0.5">
                  {issue.description}
                </p>
              </div>
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 block">
              Due Date
            </label>
            {issue.due_date ? (
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-text-secondary">
                  {format(new Date(issue.due_date), 'MMM d, yyyy h:mm a')}
                </span>
                {(() => {
                  const due = new Date(issue.due_date!)
                  const overdue = isPast(due) && issue.status !== 'resolved'
                  const hoursLeft = differenceInHours(due, new Date())
                  const urgent = !overdue && hoursLeft < 24 && issue.status !== 'resolved'
                  if (overdue) return <span className="text-[11px] font-semibold text-fire-text">Overdue</span>
                  if (urgent) return <span className="text-[11px] font-semibold text-urgent-text">Due soon</span>
                  return null
                })()}
                <button
                  onClick={() => user && updateDueDate.mutate({ issueId: issue.id, dueDate: null, userId: user.id })}
                  className="text-[11px] text-text-muted hover:text-red-400 transition-colors ml-auto"
                >
                  Clear
                </button>
              </div>
            ) : (
              <input
                type="datetime-local"
                className="text-sm text-text-secondary bg-surface border border-border rounded-[8px] px-3 py-1.5 min-h-[36px]"
                onChange={(e) => {
                  if (e.target.value && user) {
                    updateDueDate.mutate({ issueId: issue.id, dueDate: new Date(e.target.value).toISOString(), userId: user.id })
                  }
                }}
              />
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 block">
              Priority
            </label>
            <PrioritySelector
              currentPriority={issue.priority}
              onPriorityChange={handlePriorityChange}
            />
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
                    <button
                      onClick={confirmStatusChange}
                      disabled={!statusNote.trim() || updateStatus.isPending}
                      className="rounded-[8px] min-h-[44px] sm:min-h-[36px] px-4 text-[13px] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] disabled:hover:scale-100"
                      style={{
                        background: 'rgba(123,124,248,0.14)',
                        color: '#9596FF',
                        border: '1.5px solid rgba(123,124,248,0.7)',
                        boxShadow:
                          '0 0 8px rgba(123,124,248,0.35), inset 0 0 6px rgba(123,124,248,0.08)',
                      }}
                    >
                      {updateStatus.isPending ? 'Saving...' : 'Confirm'}
                    </button>
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

          <div className="relative h-[1px]">
            <div
              className="absolute left-0 right-0 top-0 h-[1px]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(123,124,248,0.25), transparent)',
              }}
            />
          </div>

          {/* Checklist */}
          <IssueChecklist issueId={issue.id} />

          <div className="relative h-[1px]">
            <div
              className="absolute left-0 right-0 top-0 h-[1px]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(123,124,248,0.25), transparent)',
              }}
            />
          </div>

          {/* Activity Log */}
          <ActivityLog issueId={issue.id} />

          <div className="relative h-[1px]">
            <div
              className="absolute left-0 right-0 top-0 h-[1px]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(123,124,248,0.25), transparent)',
              }}
            />
          </div>

          {/* Cost Entries */}
          <CostEntry issueId={issue.id} />

          {/* Resolve Button — neon teal glow (50% intensity) */}
          {issue.status !== 'resolved' && (
            <div className="pt-2 relative group">
              <div
                aria-hidden
                className="absolute -inset-1 rounded-[10px] opacity-20 group-hover:opacity-40 transition-opacity duration-200 blur-xl pointer-events-none"
                style={{ background: 'rgba(52,211,153,0.18)' }}
              />
              <button
                onClick={() => handleStatusChange('resolved')}
                className="relative w-full rounded-[8px] min-h-[44px] text-[13px] font-semibold transition-all duration-200 hover:scale-[1.005]"
                style={{
                  background: 'rgba(52,211,153,0.1)',
                  color: '#34D399',
                  border: '1.5px solid rgba(52,211,153,0.5)',
                  boxShadow:
                    '0 0 5px rgba(52,211,153,0.18), 0 0 12px rgba(52,211,153,0.08), inset 0 0 5px rgba(52,211,153,0.04)',
                }}
              >
                Resolve Task
              </button>
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
