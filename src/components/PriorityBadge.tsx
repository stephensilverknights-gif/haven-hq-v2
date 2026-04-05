import { Flame, Clock, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Priority } from '@/lib/types'

const config: Record<Priority, {
  label: string
  icon: typeof Flame
  classes: string
  color: string
  shadowColor: string
}> = {
  on_fire: {
    label: 'On Fire',
    icon: Flame,
    classes: 'bg-fire-bg text-fire-text border-fire-border',
    color: '#FF6B6B',
    shadowColor: 'rgba(239,68,68',
  },
  urgent: {
    label: 'Important',
    icon: Clock,
    classes: 'bg-urgent-bg text-urgent-text border-urgent-border',
    color: '#FBBF24',
    shadowColor: 'rgba(217,119,6',
  },
  watch: {
    label: 'Upcoming',
    icon: Eye,
    classes: 'bg-watch-bg text-watch-text border-watch-border',
    color: '#34D399',
    shadowColor: 'rgba(52,211,153',
  },
}

interface PriorityBadgeProps {
  priority: Priority
  className?: string
}

export default function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const { label, icon: Icon, classes, color, shadowColor } = config[priority]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-[20px]',
        classes,
        className
      )}
      style={{
        textShadow: `0 0 6px ${shadowColor},0.4)`,
        boxShadow: `0 0 8px ${shadowColor},0.2), inset 0 0 4px ${shadowColor},0.08)`,
      }}
    >
      <Icon
        size={12}
        strokeWidth={1.5}
        style={{
          filter: `drop-shadow(0 0 3px ${color})`,
        }}
      />
      {label}
    </span>
  )
}
