import { cn } from '@/lib/utils'
import type { IssueStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'

const statusClasses: Record<IssueStatus, string> = {
  open:        'bg-surface text-text-muted border-border',
  in_progress: 'bg-haven-indigo/10 text-haven-indigo border-haven-indigo/30',
  waiting:     'bg-urgent-bg text-urgent-text border-urgent-border',
  stuck:       'bg-fire-bg text-fire-text border-fire-border',
  resolved:    'bg-watch-bg text-watch-text border-watch-border',
}

interface StatusBadgeProps {
  status: IssueStatus
  className?: string
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-[20px]',
        statusClasses[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
