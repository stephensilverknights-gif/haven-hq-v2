import { useState } from 'react'
import { DollarSign, Plus, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import UserAvatar from '@/components/UserAvatar'
import { useCostEntries, useAddCostEntry } from '@/hooks/useCostEntries'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Reimbursable } from '@/lib/types'
import { REIMBURSABLE_LABELS } from '@/lib/types'

interface CostEntryProps {
  issueId: string
}

export default function CostEntry({ issueId }: CostEntryProps) {
  const { user } = useAuth()
  const { data: entries, isLoading } = useCostEntries(issueId)
  const addCost = useAddCostEntry()
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [description, setDescription] = useState('')
  const [reimbursable, setReimbursable] = useState<Reimbursable>('none')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  const handleSubmit = async () => {
    if (!amount || !description.trim() || !user) return

    let receiptUrl: string | undefined

    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop()
      const path = `${issueId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(path, receiptFile)

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(path)
        receiptUrl = urlData.publicUrl
      }
    }

    await addCost.mutateAsync({
      issue_id: issueId,
      logged_by: user.id,
      amount: parseFloat(amount),
      vendor_name: vendor.trim() || undefined,
      description: description.trim(),
      reimbursable,
      receipt_url: receiptUrl,
    })

    setAmount('')
    setVendor('')
    setDescription('')
    setReimbursable('none')
    setReceiptFile(null)
    setShowForm(false)
  }

  const total = entries?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
          <DollarSign size={14} strokeWidth={1.5} />
          Costs
          {total > 0 && (
            <span className="text-text-muted font-normal ml-1">
              (${total.toFixed(2)})
            </span>
          )}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="text-xs gap-1 min-h-[44px] sm:min-h-0"
        >
          <Plus size={14} strokeWidth={1.5} />
          Add Cost
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-surface rounded-[8px] p-3 mb-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">
                Amount ($)
              </label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="rounded-[8px] text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1 block">
                Vendor
              </label>
              <Input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Vendor name"
                className="rounded-[8px] text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for?"
              className="rounded-[8px] min-h-[50px] text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">
              Reimbursable
            </label>
            <Select
              value={reimbursable}
              onValueChange={(v) => setReimbursable(v as Reimbursable)}
            >
              <SelectTrigger className="rounded-[8px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(REIMBURSABLE_LABELS) as [Reimbursable, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">
              Receipt
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              className="text-xs text-text-secondary"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!amount || !description.trim() || addCost.isPending}
              className="rounded-[8px] min-h-[44px] sm:min-h-0"
              style={{ backgroundColor: '#7B7CF8' }}
            >
              {addCost.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
              className="rounded-[8px] min-h-[44px] sm:min-h-0"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Entries list */}
      {isLoading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : entries && entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between bg-surface rounded-[8px] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  ${Number(entry.amount).toFixed(2)}
                  {entry.vendor_name && (
                    <span className="text-text-muted font-normal"> — {entry.vendor_name}</span>
                  )}
                </p>
                <p className="text-xs text-text-muted truncate">{entry.description}</p>
                {entry.receipt_url && (
                  <a
                    href={entry.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-haven-indigo hover:underline mt-0.5"
                  >
                    <Receipt size={10} strokeWidth={1.5} />
                    View receipt
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {entry.logger && (
                  <UserAvatar initials={entry.logger.initials} size="sm" />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">No costs logged yet.</p>
      )}
    </div>
  )
}
