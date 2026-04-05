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
        'inline-flex items-center px-2 py-0.5 text-[13px] font-semibold rounded-[20px] max-w-[80px] sm:max-w-[140px] truncate',
        className
      )}
      style={{
        background: 'rgba(123,124,248,0.08)',
        border: '1px solid rgba(123,124,248,0.3)',
        color: '#9596FF',
        textShadow: '0 0 6px rgba(123,124,248,0.35)',
        boxShadow: '0 0 6px rgba(123,124,248,0.15), inset 0 0 4px rgba(123,124,248,0.06)',
      }}
    >
      {name}
    </span>
  )
}
