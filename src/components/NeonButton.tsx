import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type NeonVariant = 'indigo' | 'teal' | 'amber' | 'fire'
type NeonSize = 'sm' | 'md' | 'lg'

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NeonVariant
  size?: NeonSize
  withBloom?: boolean // outer blurred halo (default true for md/lg, false for sm)
}

// Color signatures pulled from the established neon palette
const VARIANTS: Record<
  NeonVariant,
  { bg: string; text: string; border: string; shadow: string; bloom: string }
> = {
  indigo: {
    bg: 'rgba(123,124,248,0.14)',
    text: '#9596FF',
    border: 'rgba(123,124,248,0.7)',
    shadow:
      '0 0 8px rgba(123,124,248,0.35), 0 0 20px rgba(123,124,248,0.12), inset 0 0 6px rgba(123,124,248,0.08)',
    bloom: 'rgba(123,124,248,0.4)',
  },
  teal: {
    bg: 'rgba(52,211,153,0.1)',
    text: '#34D399',
    border: 'rgba(52,211,153,0.5)',
    shadow:
      '0 0 5px rgba(52,211,153,0.18), 0 0 12px rgba(52,211,153,0.08), inset 0 0 5px rgba(52,211,153,0.04)',
    bloom: 'rgba(52,211,153,0.18)',
  },
  amber: {
    bg: 'rgba(251,191,36,0.12)',
    text: '#FBBF24',
    border: 'rgba(251,191,36,0.65)',
    shadow:
      '0 0 8px rgba(251,191,36,0.3), inset 0 0 6px rgba(251,191,36,0.08)',
    bloom: 'rgba(251,191,36,0.35)',
  },
  fire: {
    bg: 'rgba(239,68,68,0.12)',
    text: '#FF6B6B',
    border: 'rgba(239,68,68,0.6)',
    shadow:
      '0 0 8px rgba(239,68,68,0.35), inset 0 0 6px rgba(239,68,68,0.08)',
    bloom: 'rgba(239,68,68,0.35)',
  },
}

const SIZES: Record<NeonSize, { padding: string; minH: string; text: string }> = {
  sm: { padding: 'px-3', minH: 'min-h-[32px]', text: 'text-[12px]' },
  md: { padding: 'px-4', minH: 'min-h-[36px] sm:min-h-[36px]', text: 'text-[13px]' },
  lg: { padding: 'px-5', minH: 'min-h-[44px]', text: 'text-[14px]' },
}

const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
  (
    { variant = 'indigo', size = 'md', withBloom, className, style, children, ...rest },
    ref
  ) => {
    const v = VARIANTS[variant]
    const s = SIZES[size]
    const showBloom = withBloom ?? size !== 'sm'

    const buttonStyle: CSSProperties = {
      background: v.bg,
      color: v.text,
      border: `1.5px solid ${v.border}`,
      boxShadow: v.shadow,
      ...style,
    }

    const btn = (
      <button
        ref={ref}
        className={cn(
          'relative rounded-[8px] font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] disabled:hover:scale-100',
          s.padding,
          s.minH,
          s.text,
          className
        )}
        style={buttonStyle}
        {...rest}
      >
        {children}
      </button>
    )

    if (!showBloom) return btn

    return (
      <div className="relative group inline-block">
        <div
          aria-hidden
          className="absolute -inset-2 rounded-[12px] opacity-35 group-hover:opacity-60 transition-opacity duration-200 blur-xl pointer-events-none"
          style={{ background: v.bloom }}
        />
        {btn}
      </div>
    )
  }
)

NeonButton.displayName = 'NeonButton'

export default NeonButton
