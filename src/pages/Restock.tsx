import { useMemo } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { AlertTriangle, Package, Truck, TrendingDown } from 'lucide-react'
import TopNav from '@/components/TopNav'
import AmazonExportUpload from '@/components/AmazonExportUpload'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRestockStates, type RestockState } from '@/hooks/useRestockStates'

// Date-only strings ("2026-07-28") parsed as local midnight so they don't slip
// a day in Pacific time (same convention as GapNights).
function fmtDay(s: string | null): string {
  if (!s) return '—'
  const d = new Date(`${s}T00:00:00`)
  return isNaN(d.getTime()) ? '—' : format(d, 'MMM d')
}

function itemLabel(item: string): string {
  return item.replace(/_/g, ' ')
}

function SeverityPill({ severity }: { severity: RestockState['severity'] }) {
  if (!severity) return <span className="text-text-muted text-xs">—</span>
  const empty = severity === 'empty'
  const styles = empty
    ? { background: 'rgba(248,113,113,0.12)', color: '#F87171', border: '1px solid rgba(248,113,113,0.35)', boxShadow: '0 0 6px rgba(248,113,113,0.15)' }
    : { background: 'rgba(251,191,36,0.12)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.35)', boxShadow: '0 0 6px rgba(251,191,36,0.15)' }
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-[20px]" style={styles}>
      {empty ? 'Empty' : 'Low'}
    </span>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-card-bg rounded-[12px] overflow-hidden mb-6"
      style={{
        border: '1px solid rgba(123,124,248,0.22)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(123,124,248,0.05)',
      }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ color, glow, children }: { color: string; glow: string; children: React.ReactNode }) {
  return (
    <h3
      className="text-sm font-semibold px-4 pt-4 pb-1"
      style={{ color, textShadow: `0 0 10px ${glow}` }}
    >
      {children}
    </h3>
  )
}

export default function Restock() {
  const { data: states, isLoading, isError, error } = useRestockStates()

  const groups = useMemo(() => {
    const rows = states ?? []
    const orderNow = rows
      .filter((r) => r.state === 'OPEN' || r.state === 'RE_OPENED')
      .sort((a, b) => {
        // RE_OPENED first, then empty before low, then oldest flag first
        if ((a.state === 'RE_OPENED') !== (b.state === 'RE_OPENED')) {
          return a.state === 'RE_OPENED' ? -1 : 1
        }
        if ((a.severity === 'empty') !== (b.severity === 'empty')) {
          return a.severity === 'empty' ? -1 : 1
        }
        return (b.days_since_flag ?? 0) - (a.days_since_flag ?? 0)
      })
    const inTransit = rows
      .filter((r) => r.state === 'IN_TRANSIT')
      .sort((a, b) => (a.room_by ?? '').localeCompare(b.room_by ?? ''))
    const predicted = rows.filter((r) => r.state === 'PREDICTED_LOW')
    const generatedAt = rows.length ? new Date(rows[0].generated_at) : null
    return { orderNow, inTransit, predicted, generatedAt }
  }, [states])

  const tiles = [
    { label: 'Order now', value: String(groups.orderNow.length), icon: AlertTriangle, color: '#F87171', glow: 'rgba(248,113,113,0.25)', border: 'rgba(248,113,113,0.3)' },
    { label: 'In transit', value: String(groups.inTransit.length), icon: Truck, color: '#60A5FA', glow: 'rgba(96,165,250,0.22)', border: 'rgba(96,165,250,0.3)' },
    { label: 'Predicted low', value: String(groups.predicted.length), icon: TrendingDown, color: '#FBBF24', glow: 'rgba(251,191,36,0.22)', border: 'rgba(217,119,6,0.35)' },
    { label: 'Units tracked', value: String(new Set((states ?? []).map((r) => r.unit)).size), icon: Package, color: '#9596FF', glow: 'rgba(123,124,248,0.25)', border: 'rgba(123,124,248,0.3)' },
  ]

  // Snapshot older than ~26h means the daily run didn't happen
  const snapshotStale =
    groups.generatedAt !== null &&
    Date.now() - groups.generatedAt.getTime() > 26 * 60 * 60 * 1000

  return (
    <div className="min-h-screen bg-page-bg">
      <TopNav onNewIssue={() => {}} />

      <main className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
        <h2
          className="text-xl font-semibold text-text-primary mb-1"
          style={{ textShadow: '0 0 12px rgba(123,124,248,0.3)' }}
        >
          Restock
        </h2>
        <p className="text-sm text-text-secondary mb-1">
          Per-unit supply state from cleaner flags + Amazon orders + turnover
          burn. Items already ordered sit in "In transit" — don't reorder those.
        </p>
        <p className="text-xs text-text-muted mb-4">
          {groups.generatedAt
            ? `Snapshot ${formatDistanceToNow(groups.generatedAt, { addSuffix: true })}`
            : ' '}
          {snapshotStale && (
            <span className="text-[#FBBF24]"> — stale, daily run may have missed</span>
          )}
        </p>

        {/* VA daily upload */}
        <AmazonExportUpload />

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

        {isLoading ? (
          <SectionCard>
            <p className="text-text-muted text-center py-10">Loading...</p>
          </SectionCard>
        ) : isError ? (
          <SectionCard>
            <p className="text-text-muted text-center py-10 px-6">
              No restock data yet.{' '}
              {String(error).includes('restock_states')
                ? 'The restock_states table hasn’t been created in the turnover project — apply supabase/001_restock_states.sql, then run the burn engine.'
                : 'The burn engine fills this once its daily run publishes a snapshot.'}
            </p>
          </SectionCard>
        ) : !states || states.length === 0 ? (
          <SectionCard>
            <p className="text-text-muted text-center py-10">
              Snapshot is empty — nothing flagged, nothing predicted low.
            </p>
          </SectionCard>
        ) : (
          <>
            {/* ORDER NOW */}
            <SectionCard>
              <SectionTitle color="#F87171" glow="rgba(248,113,113,0.35)">
                Order now ({groups.orderNow.length})
              </SectionTitle>
              <p className="text-xs text-text-muted px-4 pb-1 -mt-0.5">
                Every line here needs an order placed today. "Order again" rows
                already had one — it never made it to the room, so re-order it.
              </p>
              {groups.orderNow.length === 0 ? (
                <p className="text-text-muted text-center py-8">Nothing needs ordering.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Unit</TableHead>
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-xs">Flag</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">Flagged</TableHead>
                      <TableHead className="text-xs hidden sm:table-cell">Why</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.orderNow.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-medium whitespace-nowrap">{r.unit}</TableCell>
                        <TableCell className="text-sm capitalize">{itemLabel(r.item)}</TableCell>
                        <TableCell><SeverityPill severity={r.severity} /></TableCell>
                        <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                          {fmtDay(r.last_flag)}
                          {r.days_since_flag != null && (
                            <span className="text-xs text-text-muted"> ({r.days_since_flag}d)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-text-muted hidden sm:table-cell max-w-[340px]">
                          {r.state === 'RE_OPENED'
                            ? `Order again — ordered ${fmtDay(r.last_order)} but cleaners still flag it low. Didn't reach the room or wasn't enough.`
                            : 'Order it — nothing has been ordered for this flag.'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </SectionCard>

            {/* IN TRANSIT */}
            <SectionCard>
              <SectionTitle color="#60A5FA" glow="rgba(96,165,250,0.35)">
                In transit — don't reorder ({groups.inTransit.length})
              </SectionTitle>
              {groups.inTransit.length === 0 ? (
                <p className="text-text-muted text-center py-8">Nothing on the way.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Unit</TableHead>
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">Ordered</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">In room by</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.inTransit.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-medium whitespace-nowrap">{r.unit}</TableCell>
                        <TableCell className="text-sm capitalize">{itemLabel(r.item)}</TableCell>
                        <TableCell className="text-sm text-text-secondary whitespace-nowrap">{fmtDay(r.last_order)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap" style={{ color: '#60A5FA' }}>
                          ~{fmtDay(r.room_by)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </SectionCard>

            {/* PREDICTED LOW */}
            {groups.predicted.length > 0 && (
              <SectionCard>
                <SectionTitle color="#FBBF24" glow="rgba(251,191,36,0.35)">
                  Predicted low — no cleaner flag yet ({groups.predicted.length})
                </SectionTitle>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Unit</TableHead>
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-xs text-right whitespace-nowrap">Est. stock</TableHead>
                      <TableHead className="text-xs text-right whitespace-nowrap">Threshold</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.predicted.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-medium whitespace-nowrap">{r.unit}</TableCell>
                        <TableCell className="text-sm capitalize">{itemLabel(r.item)}</TableCell>
                        <TableCell className="text-sm text-right" style={{ color: '#FBBF24' }}>
                          {r.est_stock ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-right text-text-secondary">
                          {r.threshold ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>
            )}
          </>
        )}
      </main>
    </div>
  )
}
