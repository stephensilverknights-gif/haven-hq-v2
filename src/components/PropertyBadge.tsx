import { cn } from '@/lib/utils'

interface PropertyBadgeProps {
  name: string
  colorTag?: string
  className?: string
}

export default function PropertyBadge({ name, className }: PropertyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[13px] font-semibold rounded-[20px] bg-surface border border-border text-text-secondary max-w-[100px] sm:max-w-[140px] truncate',
        className
      )}
    >
      {name}
    </span>
  )
}
