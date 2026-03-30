import { cn } from '@/lib/utils'
import type { IssueStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'

const statusClasses: Record<IssueStatus, string> = {
  open: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  pending_response: 'bg-amber-50 text-amber-700 border-amber-200',
  vendor_scheduled: 'bg-purple-50 text-purple-700 border-purple-200',
  resolved: 'bg-green-50 text-green-700 border-green-200',
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
