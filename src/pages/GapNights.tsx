import { useMemo } from 'react'
import { format } from 'date-fns'
import { Moon, Send, CheckCircle2, Percent } from 'lucide-react'
import TopNav from '@/components/TopNav'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useGapNightOffers, type GapNightOffer } from '@/hooks/useGapNightOffers'
import { cn } from '@/lib/utils'

const DIRECTION_LABEL: Record<string, string> = {
  arrive_early: 'Arrive early',
  extend: 'Extend',
}

// Date-only strings ("2026-07-08") parsed as local midnight so they don't slip a
// day in Pacific time.
function fmtDay(s: string): string {
  if (!s) return '—'
  const d = new Date(`${s}T00:00:00`)
  return isNaN(d.getTime()) ? '—' : format(d, 'MMM d')
}

function rate(accepted: number, sent: number): string {
  if (!sent) return '—'
  return `${Math.round((accepted / sent) * 100)}%`
}

// The money question: does a 30% offer convert as well as a 50% one?
function discountBreakdown(offers: GapNightOffer[]) {
  const buckets = new Map<string, { sent: number; accepted: number }>()
  for (const o of offers) {
    const pct = (o.discount_shown || '?').replace('%', '')
    const b = buckets.get(pct) ?? { sent: 0, accepted: 0 }
    if (o.sent === 'yes') b.sent += 1
    if (o.accepted === 'yes') b.accepted += 1
    buckets.set(pct, b)
  }
  return [...buckets.entries()]
    .filter(([pct]) => pct !== '?')
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([pct, b]) => ({ pct, ...b }))
}

export default function GapNights() {
  const { data: offers, isLoading, isError } = useGapNightOffers()

  const stats = useMemo(() => {
    const rows = offers ?? []
    const sent = rows.filter((o) => o.sent === 'yes').length
    const accepted = rows.filter((o) => o.accepted === 'yes').length
    return {
      total: rows.length,
      sent,
      accepted,
      acceptRate: rate(accepted, sent),
      byDiscount: discountBreakdown(rows),
    }
  }, [offers])

  const tiles = [
    { label: 'Offers tracked', value: String(stats.total), icon: Moon, color: '#9596FF', glow: 'rgba(123,124,248,0.25)', border: 'rgba(123,124,248,0.3)' },
    { label: 'Sent', value: String(stats.sent), icon: Send, color: '#60A5FA', glow: 'rgba(96,165,250,0.22)', border: 'rgba(96,165,250,0.3)' },
    { label: 'Accepted', value: String(stats.accepted), icon: CheckCircle2, color: '#34D399', glow: 'rgba(52,211,153,0.25)', border: 'rgba(52,211,153,0.3)' },
    { label: 'Accept rate', value: stats.acceptRate, icon: Percent, color: '#FBBF24', glow: 'rgba(251,191,36,0.22)', border: 'rgba(217,119,6,0.35)' },
  ]

  return (
    <div className="min-h-screen bg-page-bg">
      <TopNav onNewIssue={() => {}} />

      <main className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
        <h2
          className="text-xl font-semibold text-text-primary mb-1"
          style={{ textShadow: '0 0 12px rgba(123,124,248,0.3)' }}
        >
          Gap Nights
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Arrive-early / extend upsells, and how they convert. Sent and accepted
          are read automatically from guest threads and reservation changes.
        </p>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5">
          {tiles.map(({ label, value, icon: Icon, color, glow, border }) => (
            <div key={label} className="relative group">
              <div
                aria-hidden
                className="absolute -inset-[2px] rounded-[14px] opacity-25 group-hover:opacity-45 transition-opacity duration-200 blur-xl pointer-events-none"
                style={{ background: glow }}
              />
              <div
                className="relative bg-card-bg rounded-[12px] p-4"
                style={{
                  border: `1px solid ${border}`,
                  boxShadow: `0 1px 2px rgba(0,0,0,0.4), inset 0 0 0 1px ${border}20`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={16} strokeWidth={1.5} color={color} style={{ filter: `drop-shadow(0 0 3px ${color}80)` }} />
                  <span className="text-sm text-text-secondary">{label}</span>
                </div>
                <span className="text-2xl font-bold" style={{ color: '#E8E8F2', textShadow: `0 0 12px ${color}50` }}>
                  {value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Conversion by discount — the 30-vs-50 answer */}
        {stats.byDiscount.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-secondary mb-2">Conversion by discount</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {stats.byDiscount.map(({ pct, sent, accepted }) => (
                <div
                  key={pct}
                  className="bg-card-bg rounded-[12px] p-4"
                  style={{ border: '1px solid rgba(123,124,248,0.22)' }}
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-lg font-semibold text-text-primary">{pct}% off</span>
                    <span className="text-xl font-bold text-haven-indigo" style={{ textShadow: '0 0 12px rgba(123,124,248,0.4)' }}>
                      {rate(accepted, sent)}
                    </span>
                  </div>
                  <span className="text-xs text-text-muted">
                    {accepted} of {sent} sent accepted
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offer table */}
        <div
          className="bg-card-bg rounded-[12px] overflow-hidden"
          style={{
            border: '1px solid rgba(123,124,248,0.22)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(123,124,248,0.05)',
          }}
        >
          {isLoading ? (
            <p className="text-text-muted text-center py-10">Loading...</p>
          ) : isError ? (
            <p className="text-text-muted text-center py-10">
              No conversion data yet. The engine starts filling this once the
              Supabase table is set up.
            </p>
          ) : !offers || offers.length === 0 ? (
            <p className="text-text-muted text-center py-10">No offers logged yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Night</TableHead>
                  <TableHead className="text-xs">Guest</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Unit</TableHead>
                  <TableHead className="text-xs">Offer</TableHead>
                  <TableHead className="text-xs text-right">Disc</TableHead>
                  <TableHead className="text-xs">Sent</TableHead>
                  <TableHead className="text-xs">Accepted</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((o) => (
                  <TableRow key={o.offer_id}>
                    <TableCell className="text-sm whitespace-nowrap">{fmtDay(o.offered_night)}</TableCell>
                    <TableCell className="text-sm max-w-[160px] truncate">{o.guest_name || '—'}</TableCell>
                    <TableCell className="text-sm text-text-secondary hidden sm:table-cell max-w-[160px] truncate">
                      {o.listing_name || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {DIRECTION_LABEL[o.direction] ?? o.direction}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      {o.discount_shown ? `${o.discount_shown}%` : '—'}
                    </TableCell>
                    <TableCell>
                      <Pill on={o.sent === 'yes'} label={o.sent === 'yes' ? 'Sent' : 'No'} tone="sent" />
                    </TableCell>
                    <TableCell>
                      <Pill on={o.accepted === 'yes'} label={o.accepted === 'yes' ? 'Booked' : 'No'} tone="accepted" />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-xs text-text-muted capitalize">{o.status || '—'}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  )
}

function Pill({ on, label, tone }: { on: boolean; label: string; tone: 'sent' | 'accepted' }) {
  if (!on) return <span className="text-text-muted text-xs">—</span>
  const styles =
    tone === 'accepted'
      ? { background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.35)', boxShadow: '0 0 6px rgba(52,211,153,0.15)' }
      : { background: 'rgba(96,165,250,0.12)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.35)', boxShadow: '0 0 6px rgba(96,165,250,0.15)' }
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-[20px]')} style={styles}>
      {label}
    </span>
  )
}
