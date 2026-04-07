import { motion } from 'framer-motion'
import { formatDistanceToNow, format, isPast, differenceInHours } from 'date-fns'
import {
  MessageSquare,
  CheckCircle2,
  Wrench,
  Sparkles,
  Truck,
  CalendarCheck,
  ParkingCircle,
  Circle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Priority = 'on_fire' | 'urgent' | 'watch'
type Status = 'in_progress' | 'stuck' | 'resolved'
type IssueType = string

export type RecentActivity =
  | { kind: 'checklist_done'; author: string; text: string }
  | { kind: 'note'; author: string; text: string }

interface IssueCardV2Props {
  title: string
  priority: Priority
  status: Status
  type: IssueType
  property: string
  market: string
  cost: number | null
  openedAt: string
  recentActivity: RecentActivity | null
  checkIn?: string | null
  checkOut?: string | null
  dueDate?: string | null
  assignedCleaner?: string | null
  onClick?: () => void
  isSelected?: boolean
}

// Priority = card's neon identity. Tight crisp glow, not hazy.
const PRIORITY_NEON: Record<
  Priority,
  {
    accent: string
    accentRim: string
    accentFaint: string
    bloom: string
    shimmer: string
    level: 1 | 2 | 3
  }
> = {
  on_fire: {
    accent: '#FF6B6B',
    accentRim: 'rgba(239,68,68,0.55)',
    accentFaint: 'rgba(239,68,68,0.15)',
    bloom: 'rgba(239,68,68,0.35)',
    shimmer:
      'linear-gradient(90deg, transparent 3%, rgba(239,68,68,0.45) 25%, rgba(255,107,107,0.7) 50%, rgba(239,68,68,0.45) 75%, transparent 97%)',
    level: 3,
  },
  urgent: {
    accent: '#FBBF24',
    accentRim: 'rgba(217,119,6,0.5)',
    accentFaint: 'rgba(217,119,6,0.12)',
    bloom: 'rgba(217,119,6,0.28)',
    shimmer:
      'linear-gradient(90deg, transparent 3%, rgba(217,119,6,0.4) 25%, rgba(251,191,36,0.65) 50%, rgba(217,119,6,0.4) 75%, transparent 97%)',
    level: 2,
  },
  watch: {
    accent: '#34D399',
    accentRim: 'rgba(52,211,153,0.4)',
    accentFaint: 'rgba(52,211,153,0.09)',
    bloom: 'rgba(52,211,153,0.22)',
    shimmer:
      'linear-gradient(90deg, transparent 3%, rgba(52,211,153,0.32) 25%, rgba(52,211,153,0.55) 50%, rgba(52,211,153,0.32) 75%, transparent 97%)',
    level: 1,
  },
}

const STATUS_PILL: Record<
  Status,
  { label: string; bg: string; text: string; border: string; shadow: string }
> = {
  in_progress: {
    label: 'In Progress',
    bg: 'rgba(123,124,248,0.14)',
    text: '#9596FF',
    border: 'rgba(123,124,248,0.6)',
    shadow:
      '0 0 6px rgba(123,124,248,0.25), inset 0 0 4px rgba(123,124,248,0.08)',
  },
  stuck: {
    label: 'Stuck',
    bg: 'rgba(251,191,36,0.14)',
    text: '#FBBF24',
    border: 'rgba(251,191,36,0.65)',
    shadow:
      '0 0 6px rgba(251,191,36,0.3), inset 0 0 4px rgba(251,191,36,0.08)',
  },
  resolved: {
    label: 'Resolved',
    bg: 'rgba(52,211,153,0.12)',
    text: '#34D399',
    border: 'rgba(52,211,153,0.5)',
    shadow: '0 0 5px rgba(52,211,153,0.2)',
  },
}

const TYPE_META_MAP: Record<string, { label: string; icon: LucideIcon }> = {
  guest_request: { label: 'Guest', icon: MessageSquare },
  maintenance: { label: 'Maint.', icon: Wrench },
  cleaner: { label: 'Cleaner', icon: Sparkles },
  vendor: { label: 'Vendor', icon: Truck },
  reservation: { label: 'Res.', icon: CalendarCheck },
  parking: { label: 'Parking', icon: ParkingCircle },
}

function getTypeMeta(type: string): { label: string; icon: LucideIcon } {
  return TYPE_META_MAP[type] ?? { label: type, icon: Circle }
}

function formatCost(cost: number) {
  return `$${cost.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export default function IssueCardV2({
  title,
  priority,
  status,
  type,
  property,
  market,
  cost,
  openedAt,
  recentActivity,
  checkIn,
  checkOut,
  dueDate,
  assignedCleaner,
  onClick,
  isSelected = false,
}: IssueCardV2Props) {
  const neon = PRIORITY_NEON[priority]
  const pill = STATUS_PILL[status]
  const typeMeta = getTypeMeta(type)
  const isResolved = status === 'resolved'
  const isOnFire = priority === 'on_fire'

  return (
    <div className={`relative group ${onClick ? 'cursor-pointer' : ''}`}>
      {/* Resting bloom — subtle ambient halo, gently animates on hover.
          Selected cards stay bright at 0.7 instead of pulsing. */}
      <div
        aria-hidden
        className={`absolute -inset-[3px] rounded-[13px] pointer-events-none ${
          isSelected ? 'opacity-70' : 'v2-bloom opacity-25'
        }`}
        style={{
          background: neon.bloom,
          filter: 'blur(8px)',
        }}
      />

      {/* Hover glow — invisible at rest, pulses bright on hover only.
          Bigger spread + brighter color for an unmistakable "alive" signal. */}
      {!isSelected && (
        <div
          aria-hidden
          className="v2-bloom-hover absolute -inset-[6px] rounded-[16px] pointer-events-none"
          style={{
            background: neon.accent,
            filter: 'blur(14px)',
          }}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: isResolved ? 0.6 : 1, y: 0 }}
        whileHover={{ y: -1 }}
        whileTap={onClick ? { scale: 0.995 } : undefined}
        transition={{ y: { duration: 0.15, ease: [0.16, 1, 0.3, 1] } }}
        data-priority={priority}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick()
                }
              }
            : undefined
        }
        tabIndex={onClick ? 0 : undefined}
        role={onClick ? 'button' : undefined}
        className="relative w-full rounded-[10px] overflow-hidden transition-colors duration-150"
        style={{
          backgroundColor: '#101019',
          border: `1px solid ${
            isSelected ? neon.accent : neon.accentRim
          }`,
          boxShadow: isSelected
            ? `0 1px 2px rgba(0,0,0,0.4), inset 0 0 0 1px ${neon.accentRim}, 0 0 0 1px ${neon.accent}`
            : `0 1px 2px rgba(0,0,0,0.4), inset 0 0 0 1px ${neon.accentFaint}`,
        }}
      >
        {/* HEADER ZONE — subtle indigo wash, no backdrop-blur */}
        <div
          className="relative px-3.5 pt-2.5 pb-2"
          style={{
            background:
              'linear-gradient(180deg, rgba(123,124,248,0.10) 0%, rgba(123,124,248,0.04) 100%)',
          }}
        >
          {/* Row 1: priority dot + property · market + status pill */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-[6px] h-[6px] rounded-full shrink-0"
              style={{
                backgroundColor: neon.accent,
                boxShadow: `0 0 6px ${neon.accent}, 0 0 2px ${neon.accent}`,
              }}
            />
            <span
              className="text-[13px] font-semibold shrink-0"
              style={{ color: '#9090B8' }}
            >
              {property}
            </span>
            <span
              className="text-[11px] shrink-0 hidden sm:inline"
              style={{ color: '#7878A8' }}
            >
              · {market}
            </span>
            {assignedCleaner && (
              <>
                <span style={{ color: '#383860' }} className="text-[11px] shrink-0">·</span>
                <span
                  className="text-[11px] font-medium shrink-0 truncate max-w-[80px]"
                  style={{ color: '#9596FF' }}
                >
                  {assignedCleaner}
                </span>
              </>
            )}
            <div className="flex-1" />
            <span
              className="shrink-0 inline-flex items-center px-2 py-[1px] text-[10px] font-semibold whitespace-nowrap"
              style={{
                background: pill.bg,
                color: pill.text,
                border: `1px solid ${pill.border}`,
                borderRadius: '10px',
                boxShadow: pill.shadow,
              }}
            >
              {pill.label}
            </span>
          </div>

          {/* Row 2: title (fixed 1-line, truncate) */}
          <div className="mt-1 min-w-0">
            <p
              className="text-[13.5px] font-medium truncate leading-[1.35]"
              style={{
                color: '#E8E8F2',
                textShadow: isOnFire
                  ? '0 0 8px rgba(239,68,68,0.35)'
                  : undefined,
              }}
            >
              {title}
            </p>
          </div>

          {/* Row 3: check-in/check-out (only when reservation linked) */}
          {(checkIn || checkOut) && (
            <div className="flex items-center gap-1.5 mt-[2px] min-w-0 h-[16px]">
              <CalendarCheck size={10} strokeWidth={1.5} color="#9596FF" className="shrink-0" style={{ filter: 'drop-shadow(0 0 3px rgba(123,124,248,0.5))' }} />
              <span className="text-[11px] truncate" style={{ color: '#9596FF' }}>
                {checkIn ? format(new Date(checkIn), 'MMM d, h:mm a') : '?'}
                {' → '}
                {checkOut ? format(new Date(checkOut), 'MMM d, h:mm a') : '?'}
              </span>
            </div>
          )}

          {/* Row 4: activity (fixed 1-line, reserved even when empty) */}
          <div className="flex items-center gap-1.5 mt-[3px] min-w-0 h-[16px]">
            {recentActivity ? (
              <>
                {recentActivity.kind === 'checklist_done' ? (
                  <CheckCircle2
                    size={11}
                    strokeWidth={2}
                    color="#34D399"
                    className="shrink-0"
                    style={{
                      filter: 'drop-shadow(0 0 3px rgba(52,211,153,0.5))',
                    }}
                  />
                ) : (
                  <MessageSquare
                    size={11}
                    strokeWidth={1.5}
                    color="#7878A8"
                    className="shrink-0"
                  />
                )}
                <p className="text-[11.5px] truncate min-w-0 leading-none">
                  <span style={{ color: '#9090B8', fontWeight: 500 }}>
                    {recentActivity.author}:
                  </span>{' '}
                  <span style={{ color: '#7878A8' }}>
                    {recentActivity.text}
                  </span>
                </p>
              </>
            ) : (
              <span
                className="text-[11.5px] italic"
                style={{ color: '#4A4A6A' }}
              >
                No updates yet
              </span>
            )}
          </div>
        </div>

        {/* Shimmer divider — priority-tinted */}
        <div className="relative">
          <div
            className="absolute left-0 right-0 -top-[1px] h-[1px]"
            style={{ background: neon.shimmer }}
          />
          <div
            aria-hidden
            className="absolute left-0 right-0 -top-[2px] h-[4px] pointer-events-none"
            style={{
              background: neon.shimmer,
              filter: 'blur(2px)',
              opacity: 0.5,
            }}
          />
        </div>

        {/* FOOTER — flat card-bg, meta row */}
        <div
          className="relative px-3.5 py-2 flex items-center justify-between gap-2 min-w-0"
          style={{ backgroundColor: '#101019' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Priority pips */}
            <div className="flex items-end gap-[2px] h-3 shrink-0">
              {[6, 9, 12].map((h, i) => {
                const filled = i < neon.level
                return (
                  <div
                    key={i}
                    className="w-[2px] rounded-[1px]"
                    style={{
                      height: `${h}px`,
                      background: filled ? neon.accent : '#2A2A45',
                      boxShadow: filled ? `0 0 3px ${neon.accent}` : 'none',
                    }}
                  />
                )
              })}
            </div>
            <span
              className="text-[11px] font-medium whitespace-nowrap shrink-0"
              style={{ color: '#9090B8' }}
            >
              {typeMeta.label}
            </span>
            <span
              style={{ color: '#383860' }}
              className="text-[11px] shrink-0"
            >
              ·
            </span>
            <span
              className="text-[11px] whitespace-nowrap truncate"
              style={{ color: '#7878A8' }}
            >
              {formatDistanceToNow(new Date(openedAt), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {dueDate && !isResolved && (() => {
              const due = new Date(dueDate)
              const overdue = isPast(due)
              const hoursLeft = differenceInHours(due, new Date())
              const urgent = !overdue && hoursLeft < 24
              const color = overdue ? '#FF6B6B' : urgent ? '#FBBF24' : '#7878A8'
              return (
                <span className="flex items-center gap-1 text-[11px] whitespace-nowrap" style={{ color }}>
                  {overdue && (
                    <span className="w-[5px] h-[5px] rounded-full animate-pulse shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
                  )}
                  {overdue ? 'overdue' : `due ${formatDistanceToNow(due, { addSuffix: true })}`}
                </span>
              )
            })()}
            {cost != null && (
              <span
                className="text-[11px] font-medium whitespace-nowrap"
                style={{ color: '#9596FF' }}
              >
                {formatCost(cost)}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
