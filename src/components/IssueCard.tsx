import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, StickyNote } from 'lucide-react'
import type { Issue, IssueStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'
import PriorityBadge from '@/components/PriorityBadge'
import PropertyBadge from '@/components/PropertyBadge'
import UserAvatar from '@/components/UserAvatar'
import ElapsedTimer from '@/components/ElapsedTimer'

const borderColors: Record<string, string> = {
  on_fire: '#DC2626',
  urgent:  '#D97706',
  watch:   '#059669',
}

const statusDotColors: Record<IssueStatus, string> = {
  open:              '#A1A1AA',
  in_progress:       '#5B5BD6',
  pending_response:  '#D97706',
  vendor_scheduled:  '#0891B2',
  resolved:          '#059669',
}

interface IssueCardProps {
  issue: Issue
  handoffNote?: string
  lastNote?: string
  onClick: () => void
}

export default function IssueCard({ issue, handoffNote, lastNote, onClick }: IssueCardProps) {
  const isOnFire = issue.priority === 'on_fire'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.005, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-card-bg rounded-[12px] border border-border cursor-pointer overflow-hidden shadow-sm min-h-[48px]"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColors[issue.priority] }}
    >
      <div className="p-4">
        {/* Top row: property + priority */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="min-w-0 flex-1">
            {issue.property && (
              <PropertyBadge
                name={issue.property.name}
                colorTag={issue.property.color_tag}
              />
            )}
          </div>
          <div className="shrink-0">
            <PriorityBadge priority={issue.priority} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold text-text-primary mb-2 leading-snug">
          {issue.title}
        </h3>

        {/* Handoff note — takes priority over last activity note */}
        {handoffNote ? (
          <div className="flex items-start gap-1.5 mb-3 px-2.5 py-1.5 bg-zinc-50 border border-zinc-200/60 rounded-[6px]">
            <StickyNote size={11} strokeWidth={1.5} className="text-text-muted mt-[2px] shrink-0" />
            <p className="text-[12px] text-text-secondary leading-snug line-clamp-2 font-medium">
              {handoffNote}
            </p>
          </div>
        ) : lastNote ? (
          <div className="flex items-start gap-1.5 mb-3">
            <MessageSquare size={12} strokeWidth={1.5} className="text-text-muted mt-[3px] shrink-0" />
            <p className="text-[13px] text-text-muted leading-snug line-clamp-2">
              {lastNote}
            </p>
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
          {/* Left: avatar + status */}
          <div className="flex items-center gap-2 min-w-0">
            {issue.creator && (
              <UserAvatar
                initials={issue.creator.initials}
                name={issue.creator.name}
                size="sm"
              />
            )}
            <div className="flex items-center gap-1">
              <span
                className="w-[6px] h-[6px] rounded-full shrink-0"
                style={{ backgroundColor: statusDotColors[issue.status] }}
              />
              <span className="text-[11px] text-text-muted font-medium">
                {STATUS_LABELS[issue.status]}
              </span>
            </div>
          </div>

          {/* Right: elapsed timer for on_fire; updated_at for everything else */}
          <div className="shrink-0 ml-2">
            {isOnFire ? (
              <ElapsedTimer startTime={issue.created_at} priority={issue.priority} />
            ) : (
              <span className="text-[11px] text-text-muted">
                Updated {formatDistanceToNow(new Date(issue.updated_at), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
