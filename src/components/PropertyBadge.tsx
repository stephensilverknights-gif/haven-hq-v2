import { cn } from '@/lib/utils'

interface PropertyBadgeProps {
  name: string
  colorTag: string
  className?: string
}

export default function PropertyBadge({ name, colorTag, className }: PropertyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-[20px] border',
        className
      )}
      style={{
        backgroundColor: `${colorTag}10`,
        color: colorTag,
        borderColor: `${colorTag}30`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: colorTag }}
      />
      {name}
    </span>
  )
}
