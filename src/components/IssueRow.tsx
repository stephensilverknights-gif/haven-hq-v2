import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare } from 'lucide-react'
import type { Issue, IssueStatus } from '@/lib/types'
import { STATUS_LABELS, ISSUE_TYPE_LABELS } from '@/lib/types'
import PropertyBadge from '@/components/PropertyBadge'
import ElapsedTimer from '@/components/ElapsedTimer'
import { cn } from '@/lib/utils'

const borderColors: Record<string, string> = {
  on_fire: '#EF4444',
  urgent:  '#D97706',
  watch:   '#059669',
}


const statusDotColors: Record<IssueStatus, string> = {
  in_progress: '#7B7CF8',
  stuck:       '#FF6B6B',
  resolved:    '#059669',
}

interface IssueRowProps {
  issue: Issue
  lastNote?: string
  lastNoteAuthor?: string
  checklistProgress?: { completed: number; total: number } | null
  isSelected?: boolean
  onClick: () => void
}

export default function IssueRow({
  issue,
  lastNote,
  lastNoteAuthor,
  checklistProgress,
  isSelected = false,
  onClick,
}: IssueRowProps) {
  const isOnFire = issue.priority === 'on_fire'

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={isSelected ? {} : { y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ y: { duration: 0.15, ease: [0.16, 1, 0.3, 1] } }}
      onClick={onClick}
      data-priority={issue.priority}
      data-selected={isSelected ? 'true' : 'false'}
      className={cn(
        'issue-card w-full rounded-[10px] border cursor-pointer overflow-hidden transition-colors duration-150',
        isSelected
          ? 'bg-surface-hover border-haven-indigo/40 ring-1 ring-haven-indigo/30'
          : 'bg-card-bg border-border hover:bg-surface hover:border-border/80',
      )}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: borderColors[issue.priority],
      }}
    >
      <div className="px-3.5 py-3 min-w-0">
        {/* Row 1: property + title + badges */}
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
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
          {/* Task type */}
          <span className="shrink-0 text-[11px] font-medium text-text-muted hidden sm:inline">
            {ISSUE_TYPE_LABELS[issue.type]}
          </span>
        </div>

        {/* Row 2: last activity note (if exists) */}
        {lastNote && (
          <div className="flex items-center gap-1.5 mt-1.5 min-w-0 overflow-hidden">
            <MessageSquare size={11} strokeWidth={1.5} className="text-text-muted shrink-0" />
            <p className="text-[12px] text-text-secondary truncate">
              {lastNoteAuthor && (
                <span className="font-medium text-text-muted mr-1">{lastNoteAuthor}:</span>
              )}
              {lastNote}
            </p>
          </div>
        )}

        {/* Row 3: status + checklist progress + time */}
        <div className="flex items-center justify-between mt-2 gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
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
          <div className="shrink-0 text-right">
            {isOnFire ? (
              <ElapsedTimer startTime={issue.created_at} priority={issue.priority} />
            ) : (
              <div>
                <span className="text-[11px] text-text-muted">
                  {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}
                </span>
                {issue.updater?.name && (
                  <p className="text-[10px] text-text-muted opacity-70">
                    by {issue.updater.name}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
