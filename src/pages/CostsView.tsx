import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { DollarSign, ArrowUp, ArrowDown } from 'lucide-react'
import TopNav from '@/components/TopNav'
import UserAvatar from '@/components/UserAvatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAllCostEntries } from '@/hooks/useCostEntries'
import { REIMBURSABLE_LABELS } from '@/lib/types'
import type { CostEntry, Reimbursable } from '@/lib/types'
import { cn } from '@/lib/utils'

type SortField = 'date' | 'property' | 'amount' | 'reimbursable' | 'logged_by'
type SortDir = 'asc' | 'desc'

function getSortValue(entry: CostEntry, field: SortField): string | number {
  switch (field) {
    case 'date':
      return entry.date
    case 'property':
      return (entry.issue?.property?.name ?? '').toLowerCase()
    case 'amount':
      return Number(entry.amount)
    case 'reimbursable':
      return entry.reimbursable
    case 'logged_by':
      return (entry.logger?.name ?? '').toLowerCase()
  }
}

export default function CostsView() {
  const { data: entries, isLoading } = useAllCostEntries()
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const summary = useMemo(() => {
    if (!entries) return { total: 0, reimbursable: 0 }
    const total = entries.reduce((sum, e) => sum + Number(e.amount), 0)
    const reimbursable = entries
      .filter((e) => e.reimbursable !== 'none')
      .reduce((sum, e) => sum + Number(e.amount), 0)
    return { total, reimbursable }
  }, [entries])

  const sortedEntries = useMemo(() => {
    if (!entries) return []
    return [...entries].sort((a, b) => {
      const aVal = getSortValue(a, sortField)
      const bVal = getSortValue(b, sortField)
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [entries, sortField, sortDir])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(field === 'amount' ? 'desc' : 'asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    const Icon = sortDir === 'asc' ? ArrowUp : ArrowDown
    return <Icon size={11} strokeWidth={2} className="inline ml-0.5 text-haven-indigo" />
  }

  return (
    <div className="min-h-screen bg-page-bg">
      <TopNav onNewIssue={() => {}} />

      <main className="max-w-6xl mx-auto px-4 py-4 sm:px-6 sm:py-6">
        <h2
          className="text-xl font-semibold text-text-primary mb-4"
          style={{ textShadow: '0 0 12px rgba(123,124,248,0.3)' }}
        >
          Costs
        </h2>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
          {/* Total Spend — indigo neon */}
          <div className="relative group">
            <div
              aria-hidden
              className="absolute -inset-[2px] rounded-[14px] opacity-25 group-hover:opacity-45 transition-opacity duration-200 blur-xl pointer-events-none"
              style={{ background: 'rgba(123,124,248,0.25)' }}
            />
            <div
              className="relative bg-card-bg rounded-[12px] p-4"
              style={{
                border: '1px solid rgba(123,124,248,0.3)',
                boxShadow:
                  '0 1px 2px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(123,124,248,0.05)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <DollarSign
                  size={16}
                  strokeWidth={1.5}
                  color="#9596FF"
                  style={{ filter: 'drop-shadow(0 0 3px rgba(123,124,248,0.5))' }}
                />
                <span className="text-sm text-text-secondary">Total Spend</span>
              </div>
              <span
                className="text-2xl font-bold"
                style={{
                  color: '#E8E8F2',
                  textShadow: '0 0 12px rgba(123,124,248,0.3)',
                }}
              >
                ${summary.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Reimbursable Pending — amber neon */}
          <div className="relative group">
            <div
              aria-hidden
              className="absolute -inset-[2px] rounded-[14px] opacity-25 group-hover:opacity-45 transition-opacity duration-200 blur-xl pointer-events-none"
              style={{ background: 'rgba(251,191,36,0.25)' }}
            />
            <div
              className="relative bg-card-bg rounded-[12px] p-4"
              style={{
                border: '1px solid rgba(217,119,6,0.35)',
                boxShadow:
                  '0 1px 2px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(217,119,6,0.06)',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <DollarSign
                  size={16}
                  strokeWidth={1.5}
                  color="#FBBF24"
                  style={{ filter: 'drop-shadow(0 0 3px rgba(251,191,36,0.5))' }}
                />
                <span className="text-sm text-text-secondary">Reimbursable Pending</span>
              </div>
              <span
                className="text-2xl font-bold"
                style={{
                  color: '#E8E8F2',
                  textShadow: '0 0 12px rgba(251,191,36,0.3)',
                }}
              >
                ${summary.reimbursable.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div
          className="bg-card-bg rounded-[12px] overflow-hidden"
          style={{
            border: '1px solid rgba(123,124,248,0.22)',
            boxShadow:
              '0 1px 2px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(123,124,248,0.05)',
          }}
        >
          {isLoading ? (
            <p className="text-text-muted text-center py-10">Loading...</p>
          ) : !entries || entries.length === 0 ? (
            <p className="text-text-muted text-center py-10">No costs logged yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className={cn('text-xs cursor-pointer select-none hover:text-text-primary transition-colors', sortField === 'date' && 'text-haven-indigo')}
                    onClick={() => toggleSort('date')}
                  >
                    Date<SortIcon field="date" />
                  </TableHead>
                  <TableHead
                    className={cn('text-xs cursor-pointer select-none hover:text-text-primary transition-colors', sortField === 'property' && 'text-haven-indigo')}
                    onClick={() => toggleSort('property')}
                  >
                    Property<SortIcon field="property" />
                  </TableHead>
                  <TableHead className="text-xs">Issue</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Vendor</TableHead>
                  <TableHead
                    className={cn('text-xs text-right cursor-pointer select-none hover:text-text-primary transition-colors', sortField === 'amount' && 'text-haven-indigo')}
                    onClick={() => toggleSort('amount')}
                  >
                    Amount<SortIcon field="amount" />
                  </TableHead>
                  <TableHead
                    className={cn('text-xs cursor-pointer select-none hover:text-text-primary transition-colors', sortField === 'reimbursable' && 'text-haven-indigo')}
                    onClick={() => toggleSort('reimbursable')}
                  >
                    Reimbursable<SortIcon field="reimbursable" />
                  </TableHead>
                  <TableHead
                    className={cn('text-xs hidden sm:table-cell cursor-pointer select-none hover:text-text-primary transition-colors', sortField === 'logged_by' && 'text-haven-indigo')}
                    onClick={() => toggleSort('logged_by')}
                  >
                    Logged By<SortIcon field="logged_by" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      {format(new Date(entry.date), 'MMM d')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.issue?.property?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {entry.issue?.title ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary hidden sm:table-cell">
                      {entry.vendor_name ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      ${Number(entry.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.reimbursable !== 'none' ? (
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-[20px]"
                          style={{
                            background: 'rgba(251,191,36,0.12)',
                            color: '#FBBF24',
                            border: '1px solid rgba(217,119,6,0.35)',
                            textShadow: '0 0 4px rgba(217,119,6,0.4)',
                            boxShadow:
                              '0 0 6px rgba(217,119,6,0.15), inset 0 0 3px rgba(217,119,6,0.06)',
                          }}
                        >
                          {REIMBURSABLE_LABELS[entry.reimbursable as Reimbursable]}
                        </span>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {entry.logger && (
                        <UserAvatar
                          initials={entry.logger.initials}
                          name={entry.logger.name}
                          size="sm"
                        />
                      )}
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
