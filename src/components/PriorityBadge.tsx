import { Flame, Clock, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Priority } from '@/lib/types'

const config: Record<Priority, {
  label: string
  icon: typeof Flame
  classes: string
}> = {
  on_fire: {
    label: 'On Fire',
    icon: Flame,
    classes: 'bg-fire-bg text-fire-text border-fire-border',
  },
  urgent: {
    label: 'Important',
    icon: Clock,
    classes: 'bg-urgent-bg text-urgent-text border-urgent-border',
  },
  watch: {
    label: 'Upcoming',
    icon: Eye,
    classes: 'bg-watch-bg text-watch-text border-watch-border',
  },
}

interface PriorityBadgeProps {
  priority: Priority
  className?: string
}

export default function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const { label, icon: Icon, classes } = config[priority]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-[20px]',
        classes,
        className
      )}
    >
      <Icon size={12} strokeWidth={1.5} />
      {label}
    </span>
  )
}
