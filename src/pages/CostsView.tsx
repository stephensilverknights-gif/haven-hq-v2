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
        <h2 className="text-xl font-semibold text-text-primary mb-4">Costs</h2>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
          <div className="bg-card-bg rounded-[12px] border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={16} strokeWidth={1.5} className="text-text-muted" />
              <span className="text-sm text-text-secondary">Total Spend</span>
            </div>
            <span className="text-2xl font-bold text-text-primary">
              ${summary.total.toFixed(2)}
            </span>
          </div>
          <div className="bg-card-bg rounded-[12px] border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={16} strokeWidth={1.5} className="text-amber-500" />
              <span className="text-sm text-text-secondary">Reimbursable Pending</span>
            </div>
            <span className="text-2xl font-bold text-text-primary">
              ${summary.reimbursable.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card-bg rounded-[12px] border border-border overflow-hidden">
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
                        <span className="text-amber-700 text-xs font-medium bg-amber-50 px-2 py-0.5 rounded-[20px] border border-amber-200">
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
