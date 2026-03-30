import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { Priority } from '@/lib/types'

interface ElapsedTimerProps {
  startTime: string
  priority: Priority
  className?: string
}

function formatElapsed(startTime: string): string {
  const now = Date.now()
  const start = new Date(startTime).getTime()
  const diff = Math.max(0, now - start)
  const totalMinutes = Math.floor(diff / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function isOverTwoHours(startTime: string): boolean {
  const diff = Date.now() - new Date(startTime).getTime()
  return diff > 2 * 60 * 60 * 1000
}

export default function ElapsedTimer({ startTime, priority, className }: ElapsedTimerProps) {
  const [elapsed, setElapsed] = useState(() => formatElapsed(startTime))
  const [overdue, setOverdue] = useState(() => isOverTwoHours(startTime))

  useEffect(() => {
    setElapsed(formatElapsed(startTime))
    setOverdue(isOverTwoHours(startTime))

    const interval = setInterval(() => {
      setElapsed(formatElapsed(startTime))
      setOverdue(isOverTwoHours(startTime))
    }, 60000)

    return () => clearInterval(interval)
  }, [startTime])

  const colorClass = priority === 'on_fire'
    ? 'text-fire-text'
    : priority === 'urgent'
      ? 'text-urgent-text'
      : 'text-text-secondary'

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-mono font-medium', colorClass, className)}>
      {priority === 'on_fire' && overdue && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
      )}
      {elapsed}
    </span>
  )
}
