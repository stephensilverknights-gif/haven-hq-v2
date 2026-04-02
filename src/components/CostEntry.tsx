import { useState } from 'react'
import { DollarSign, Plus, Receipt, ArrowDownLeft, ArrowUpRight, Building, Wallet, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import UserAvatar from '@/components/UserAvatar'
import { useCostEntries, useAddCostEntry, useUpdateCostEntry, useDeleteCostEntry } from '@/hooks/useCostEntries'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import type { Reimbursable } from '@/lib/types'
import { cn } from '@/lib/utils'

// ── Entry type config ──────────────────────────────────────────────────────────

const ENTRY_TYPES: {
  value: Reimbursable
  label: string
  sublabel: string
  icon: typeof Wallet
  color: string
  badgeCn: string
}[] = [
  {
    value: 'none',
    label: 'Expense',
    sublabel: 'We paid this',
    icon: ArrowDownLeft,
    color: '#EF4444',
    badgeCn: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  {
    value: 'guest_owes',
    label: 'Guest Owes',
    sublabel: 'Request from guest',
    icon: ArrowUpRight,
    color: '#7B7CF8',
    badgeCn: 'bg-haven-indigo/10 text-haven-indigo border-haven-indigo/20',
  },
  {
    value: 'landlord_owes',
    label: 'Landlord',
    sublabel: 'Landlord owes us',
    icon: Building,
    color: '#D97706',
    badgeCn: 'bg-urgent-bg text-urgent-text border-urgent-border',
  },
  {
    value: 'haven_owes',
    label: 'Internal',
    sublabel: 'Haven absorbs this',
    icon: Wallet,
    color: '#059669',
    badgeCn: 'bg-watch-bg text-watch-text border-watch-border',
  },
]

function entryTypeConfig(reimbursable: Reimbursable) {
  return ENTRY_TYPES.find((t) => t.value === reimbursable) ?? ENTRY_TYPES[0]
}

// ── Component ──────────────────────────────────────────────────────────────────

interface CostEntryProps {
  issueId: string
}

export default function CostEntry({ issueId }: CostEntryProps) {
  const { user } = useAuth()
  const { data: entries, isLoading } = useCostEntries(issueId)
  const addCost = useAddCostEntry()
  const updateCost = useUpdateCostEntry()
  const deleteCost = useDeleteCostEntry()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [entryType, setEntryType] = useState<Reimbursable>('none')
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [description, setDescription] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  const resetForm = () => {
    setEntryType('none')
    setAmount('')
    setVendor('')
    setDescription('')
    setReceiptFile(null)
    setShowForm(false)
    setEditingId(null)
  }

  const startEdit = (entry: { id: string; amount: number; vendor_name?: string | null; description: string; reimbursable: Reimbursable }) => {
    setEditingId(entry.id)
    setAmount(String(entry.amount))
    setVendor(entry.vendor_name ?? '')
    setDescription(entry.description)
    setEntryType(entry.reimbursable)
    setReceiptFile(null)
    setShowForm(true)
    setConfirmDeleteId(null)
  }

  const handleSubmit = async () => {
    if (!amount || !description.trim() || !user) return

    if (editingId) {
      await updateCost.mutateAsync({
        id: editingId,
        issue_id: issueId,
        amount: parseFloat(amount),
        vendor_name: vendor.trim() || undefined,
        description: description.trim(),
        reimbursable: entryType,
      })
      resetForm()
      return
    }

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
      reimbursable: entryType,
      receipt_url: receiptUrl,
    })

    resetForm()
  }

  const total = entries?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0
  const isSaving = addCost.isPending || updateCost.isPending
  const canSubmit = !!amount && parseFloat(amount) > 0 && description.trim().length > 0

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign size={13} strokeWidth={1.5} />
          Money
          {total > 0 && (
            <span className="text-text-muted font-normal normal-case ml-0.5">
              · ${total.toFixed(2)}
            </span>
          )}
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-[12px] font-medium text-text-muted hover:text-haven-indigo transition-colors"
          >
            <Plus size={13} strokeWidth={2} />
            Add Entry
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-surface border border-border rounded-[10px] p-3 mb-3 space-y-3">

          {/* Entry type pills */}
          <div>
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
              Entry Type
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {ENTRY_TYPES.map(({ value, label, sublabel, icon: Icon, color }) => {
                const isSelected = entryType === value
                return (
                  <button
                    key={value}
                    onClick={() => setEntryType(value)}
                    className={cn(
                      'flex items-start gap-2 px-2.5 py-2 rounded-[8px] border text-left transition-all duration-150',
                      isSelected
                        ? 'border-current'
                        : 'bg-card-bg border-border text-text-secondary hover:bg-surface-hover'
                    )}
                    style={isSelected ? {
                      backgroundColor: color + '15',
                      borderColor: color + '60',
                      color,
                    } : {}}
                  >
                    <Icon size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold leading-tight">{label}</p>
                      <p className="text-[10px] opacity-70 leading-tight mt-0.5">{sublabel}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Amount + Vendor */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-text-muted mb-1 block">Amount ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="rounded-[8px] text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-text-muted mb-1 block">
                {entryType === 'guest_owes' ? 'Reason / Item' : 'Vendor'}
              </label>
              <Input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder={entryType === 'guest_owes' ? 'e.g. Pet Fee' : 'Vendor name'}
                className="rounded-[8px] text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1 block">Notes</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this for?"
              className="rounded-[8px] min-h-[50px] text-sm"
            />
          </div>

          {/* Receipt */}
          <div>
            <label className="text-[11px] font-medium text-text-muted mb-1 block">
              Receipt <span className="font-normal opacity-60">(optional)</span>
            </label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              className="text-xs text-text-secondary w-full"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit || isSaving}
              className="rounded-[8px] min-h-[44px] sm:min-h-0"
              style={{ backgroundColor: '#7B7CF8' }}
            >
              {isSaving ? 'Saving…' : editingId ? 'Update Entry' : 'Save Entry'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={resetForm}
              className="rounded-[8px] min-h-[44px] sm:min-h-0"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Entries list */}
      {isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : entries && entries.length > 0 ? (
        <div className="space-y-1.5">
          {entries.map((entry) => {
            const cfg = entryTypeConfig(entry.reimbursable)
            return (
              <div
                key={entry.id}
                className="flex items-start justify-between bg-surface rounded-[8px] px-3 py-2.5 gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-[13px] font-semibold text-text-primary">
                      ${Number(entry.amount).toFixed(2)}
                    </span>
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px] border',
                      cfg.badgeCn
                    )}>
                      <cfg.icon size={9} strokeWidth={2} />
                      {cfg.label}
                    </span>
                    {entry.vendor_name && (
                      <span className="text-[12px] text-text-muted">{entry.vendor_name}</span>
                    )}
                  </div>
                  <p className="text-[12px] text-text-secondary">{entry.description}</p>
                  {entry.receipt_url && (
                    <a
                      href={entry.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-haven-indigo hover:underline mt-0.5"
                    >
                      <Receipt size={10} strokeWidth={1.5} />
                      Receipt
                    </a>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {entry.logger && (
                    <UserAvatar initials={entry.logger.initials} size="sm" />
                  )}
                  {confirmDeleteId === entry.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-text-muted">Delete?</span>
                      <button
                        onClick={async () => {
                          await deleteCost.mutateAsync({ id: entry.id, issue_id: issueId })
                          setConfirmDeleteId(null)
                        }}
                        className="text-[10px] font-medium text-red-500 hover:text-red-600 px-1 py-0.5 rounded-[4px] hover:bg-red-500/10 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-[10px] font-medium text-text-muted hover:text-text-secondary px-1 py-0.5 rounded-[4px] hover:bg-surface-hover transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => startEdit(entry)}
                        className="p-1 rounded-[4px] text-text-muted hover:text-haven-indigo hover:bg-haven-indigo/10 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={11} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(entry.id)}
                        className="p-1 rounded-[4px] text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={11} strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : !showForm ? (
        <p className="text-[13px] text-text-muted italic">No entries yet.</p>
      ) : null}
    </div>
  )
}
