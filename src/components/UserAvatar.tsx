import { cn } from '@/lib/utils'

interface UserAvatarProps {
  initials: string
  name?: string
  size?: 'sm' | 'md'
  className?: string
}

export default function UserAvatar({ initials, name, size = 'md', className }: UserAvatarProps) {
  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'
  const isGhost = size === 'md'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-medium shrink-0',
          sizeClasses,
          isGhost
            ? 'text-haven-indigo border border-haven-indigo/50 bg-haven-indigo/8'
            : 'bg-haven-indigo text-white'
        )}
      >
        {initials}
      </div>
      {name && (
        <span className="text-sm text-text-primary font-medium truncate">{name}</span>
      )}
    </div>
  )
}
