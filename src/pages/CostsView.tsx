import { useMemo } from 'react'
import { format } from 'date-fns'
import { DollarSign } from 'lucide-react'
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
import type { Reimbursable } from '@/lib/types'

export default function CostsView() {
  const { data: entries, isLoading } = useAllCostEntries()

  const summary = useMemo(() => {
    if (!entries) return { total: 0, reimbursable: 0 }
    const total = entries.reduce((sum, e) => sum + Number(e.amount), 0)
    const reimbursable = entries
      .filter((e) => e.reimbursable !== 'none')
      .reduce((sum, e) => sum + Number(e.amount), 0)
    return { total, reimbursable }
  }, [entries])

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
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Property</TableHead>
                  <TableHead className="text-xs">Issue</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Vendor</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs">Reimbursable</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">Logged By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
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
