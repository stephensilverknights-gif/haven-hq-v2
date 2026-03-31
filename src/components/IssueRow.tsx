import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { StickyNote } from 'lucide-react'
import type { Issue, IssueStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'
import PriorityBadge from '@/components/PriorityBadge'
import PropertyBadge from '@/components/PropertyBadge'
import ElapsedTimer from '@/components/ElapsedTimer'
import { cn } from '@/lib/utils'

const borderColors: Record<string, string> = {
  on_fire: '#EF4444',
  urgent:  '#D97706',
  watch:   '#059669',
}

const borderGlow: Record<string, string> = {
  on_fire: '0 0 12px rgba(239,68,68,0.25)',
  urgent:  '0 0 12px rgba(217,119,6,0.2)',
  watch:   '0 0 12px rgba(5,150,105,0.2)',
}

const statusDotColors: Record<IssueStatus, string> = {
  open:              '#464664',
  in_progress:       '#7B7CF8',
  pending_response:  '#D97706',
  vendor_scheduled:  '#0891B2',
  resolved:          '#059669',
}

interface IssueRowProps {
  issue: Issue
  handoffNote?: string
  checklistProgress?: { completed: number; total: number } | null
  isSelected?: boolean
  onClick: () => void
}

export default function IssueRow({
  issue,
  handoffNote,
  checklistProgress,
  isSelected = false,
  onClick,
}: IssueRowProps) {
  const isOnFire = issue.priority === 'on_fire'

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={isSelected ? {} : { y: -2, boxShadow: `0 4px 16px rgba(0,0,0,0.4), ${borderGlow[issue.priority]}` }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={cn(
        'rounded-[10px] border cursor-pointer overflow-hidden transition-colors duration-150',
        isSelected
          ? 'bg-surface-hover border-haven-indigo/40 ring-1 ring-haven-indigo/30'
          : 'bg-card-bg border-border hover:bg-surface hover:border-border/80'
      )}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: borderColors[issue.priority],
        boxShadow: isSelected
          ? `0 0 0 1px rgba(123,124,248,0.3), ${borderGlow[issue.priority]}`
          : borderGlow[issue.priority],
      }}
    >
      <div className="px-3.5 py-3">
        {/* Row 1: property + title + badges */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Property */}
          {issue.property && (
            <PropertyBadge
              name={issue.property.name}
              colorTag={issue.property.color_tag}
              className="shrink-0"
            />
          )}
          {/* Title */}
          <span className="text-[14px] font-semibold text-text-primary truncate flex-1 min-w-0">
            {issue.title}
          </span>
          {/* Priority badge — hidden if group header already shows priority */}
          <div className="shrink-0 hidden sm:block">
            <PriorityBadge priority={issue.priority} />
          </div>
        </div>

        {/* Row 2: handoff note (if exists) */}
        {handoffNote && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <StickyNote size={11} strokeWidth={1.5} className="text-text-muted shrink-0" />
            <p className="text-[12px] text-text-secondary truncate">{handoffNote}</p>
          </div>
        )}

        {/* Row 3: status + checklist progress + time */}
        <div className="flex items-center justify-between mt-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Status */}
            <div className="flex items-center gap-1">
              <span
                className="w-[5px] h-[5px] rounded-full shrink-0"
                style={{ backgroundColor: statusDotColors[issue.status] }}
              />
              <span className="text-[11px] text-text-muted font-medium whitespace-nowrap">
                {STATUS_LABELS[issue.status]}
              </span>
            </div>

            {/* Checklist progress */}
            {checklistProgress && checklistProgress.total > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">·</span>
                <div className="flex items-center gap-1">
                  <div className="w-16 h-[3px] bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-haven-indigo rounded-full transition-all duration-300"
                      style={{
                        width: `${(checklistProgress.completed / checklistProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-text-muted font-medium">
                    {checklistProgress.completed}/{checklistProgress.total}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Time */}
          <div className="shrink-0">
            {isOnFire ? (
              <ElapsedTimer startTime={issue.created_at} priority={issue.priority} />
            ) : (
              <span className="text-[11px] text-text-muted">
                {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
