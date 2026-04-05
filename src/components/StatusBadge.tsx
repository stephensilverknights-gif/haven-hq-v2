import { cn } from '@/lib/utils'
import type { IssueStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'

const statusConfig: Record<IssueStatus, { classes: string; shadowColor: string }> = {
  in_progress: {
    classes: 'bg-haven-indigo/10 text-haven-indigo border-haven-indigo/30',
    shadowColor: 'rgba(123,124,248',
  },
  stuck: {
    classes: 'bg-urgent-bg text-urgent-text border-urgent-border',
    shadowColor: 'rgba(251,191,36',
  },
  resolved: {
    classes: 'bg-watch-bg text-watch-text border-watch-border',
    shadowColor: 'rgba(52,211,153',
  },
}

interface StatusBadgeProps {
  status: IssueStatus
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const { classes, shadowColor } = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-[20px]',
        classes,
        className
      )}
      style={{
        textShadow: `0 0 6px ${shadowColor},0.4)`,
        boxShadow: `0 0 8px ${shadowColor},0.2), inset 0 0 4px ${shadowColor},0.08)`,
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
