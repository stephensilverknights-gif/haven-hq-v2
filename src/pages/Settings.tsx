import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, GripVertical, X, ChevronRight, Building2, MapPin, ChevronDown, Settings2, Tag } from 'lucide-react'
import TopNav from '@/components/TopNav'
import NeonButton from '@/components/NeonButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  useWorkflowTemplates,
  useCreateWorkflowTemplate,
  useUpdateWorkflowTemplate,
  useDeleteWorkflowTemplate,
} from '@/hooks/useWorkflowTemplates'
import {
  useAllProperties,
  useCreateProperty,
  useUpdateProperty,
  useTogglePropertyActive,
} from '@/hooks/useProperties'
import { useMarkets, useCreateMarket, useDeleteMarket } from '@/hooks/useMarkets'
import { useIssueTypes } from '@/hooks/useIssueTypes'
import { useCreateIssueType, useUpdateIssueType } from '@/hooks/useIssueTypeAdmin'
import { useAuth } from '@/contexts/AuthContext'
import type { WorkflowTemplate, WorkflowTemplateStep, Property, IssueTypeRecord } from '@/lib/types'
import { cn } from '@/lib/utils'

// ── Property form (create / edit) ─────────────────────────────────────────────

function PropertyForm({
  initial,
  lockedMarket,
  onSave,
  onCancel,
  isSaving,
}: {
  initial?: Property
  lockedMarket?: string
  onSave: (name: string, market: string, hostawayListingId?: string) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [hostawayId, setHostawayId] = useState(initial?.hostaway_listing_id ?? '')
  const market = lockedMarket ?? initial?.market ?? ''

  const valid = name.trim().length > 0 && market.length > 0

  return (
    <div className="bg-surface neon-border rounded-[10px] p-3 space-y-3">
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">
            Property Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && valid && !isSaving) onSave(name.trim(), market, hostawayId.trim() || undefined) }}
            placeholder="e.g. Sherman Arms"
            className="rounded-[8px] text-sm"
            autoFocus
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">
          Hostaway Listing ID <span className="font-normal normal-case">(optional)</span>
        </label>
        <Input
          value={hostawayId}
          onChange={(e) => setHostawayId(e.target.value)}
          placeholder="e.g. 123456"
          className="rounded-[8px] text-sm"
        />
      </div>
      <div className="flex gap-2">
        <NeonButton
          size="sm"
          withBloom={false}
          onClick={() => onSave(name.trim(), market, hostawayId.trim() || undefined)}
          disabled={!valid || isSaving}
        >
          {isSaving ? 'Saving…' : initial ? 'Save' : 'Add Property'}
        </NeonButton>
        <Button size="sm" variant="outline" onClick={onCancel} className="rounded-[8px]">
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ── Property row ──────────────────────────────────────────────────────────────

function PropertyRow({
  property,
  onEdit,
  onToggleActive,
  isToggling,
}: {
  property: Property
  onEdit: () => void
  onToggleActive: () => void
  isToggling: boolean
}) {
  return (
    <div className={cn(
      'bg-card-bg neon-border rounded-[10px] px-3 py-2.5 flex items-center gap-3',
      !property.active && 'opacity-40'
    )}>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text-primary leading-tight truncate">{property.name}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggleActive}
          disabled={isToggling}
          className={cn(
            'relative w-8 h-[18px] rounded-full transition-colors duration-200 focus:outline-none shrink-0',
            property.active ? 'bg-haven-indigo' : 'bg-zinc-600'
          )}
          title={property.active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
        >
          <span className={cn(
            'absolute top-0.5 left-0.5 w-[14px] h-[14px] bg-white rounded-full shadow transition-transform duration-200',
            property.active ? 'translate-x-[14px]' : 'translate-x-0'
          )} />
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-[12px] font-medium text-text-secondary hover:text-haven-indigo transition-colors px-2 py-1 rounded-[6px] hover:bg-haven-indigo/10"
        >
          <Pencil size={12} strokeWidth={1.5} />
          Edit
        </button>
      </div>
    </div>
  )
}

// ── Market group (collapsible) ─────────────────────────────────────────────────

function MarketGroup({
  marketName,
  properties,
  createProperty,
  updateProperty,
  toggleActive,
}: {
  marketName: string
  properties: Property[]
  createProperty: ReturnType<typeof useCreateProperty>
  updateProperty: ReturnType<typeof useUpdateProperty>
  toggleActive: ReturnType<typeof useTogglePropertyActive>
}) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const activeCount = properties.filter(p => p.active).length

  return (
    <div
      className="rounded-[12px] overflow-hidden"
      style={{
        border: '1px solid rgba(123,124,248,0.22)',
        boxShadow: 'inset 0 0 0 1px rgba(123,124,248,0.04)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface hover:bg-surface-hover transition-colors text-left"
      >
        <ChevronDown
          size={15}
          strokeWidth={2}
          className={cn('text-text-muted transition-transform duration-200 shrink-0', !open && '-rotate-90')}
        />
        <MapPin size={14} strokeWidth={1.5} className="text-text-muted shrink-0" />
        <span className="text-[13px] font-semibold text-text-primary flex-1">{marketName}</span>
        <span className="text-[11px] text-text-muted font-medium shrink-0">
          {activeCount}/{properties.length} active
        </span>
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-2 space-y-1.5 border-t border-border">
              {properties.map((property) => (
                <div key={property.id}>
                  {editingId === property.id ? (
                    <PropertyForm
                      initial={property}
                      lockedMarket={marketName}
                      onSave={async (name, market, hostawayListingId) => {
                        await updateProperty.mutateAsync({ id: property.id, name, market, hostaway_listing_id: hostawayListingId })
                        setEditingId(null)
                      }}
                      onCancel={() => setEditingId(null)}
                      isSaving={updateProperty.isPending}
                    />
                  ) : (
                    <PropertyRow
                      property={property}
                      onEdit={() => { setEditingId(property.id); setAdding(false) }}
                      onToggleActive={() => toggleActive.mutate({ id: property.id, active: !property.active })}
                      isToggling={toggleActive.isPending}
                    />
                  )}
                </div>
              ))}

              {/* Add property form */}
              <AnimatePresence>
                {adding && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <PropertyForm
                      lockedMarket={marketName}
                      onSave={async (name, market, hostawayListingId) => {
                        await createProperty.mutateAsync({ name, market, hostaway_listing_id: hostawayListingId })
                        setAdding(false)
                      }}
                      onCancel={() => setAdding(false)}
                      isSaving={createProperty.isPending}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {!adding && !editingId && (
                <button
                  onClick={() => setAdding(true)}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-text-muted hover:text-haven-indigo transition-colors px-1 py-1 mt-0.5"
                >
                  <Plus size={13} strokeWidth={2} />
                  Add property
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Manage Markets accordion ───────────────────────────────────────────────────

function ManageMarkets({ allProperties }: { allProperties: Property[] | undefined }) {
  const [open, setOpen] = useState(false)
  const { data: markets } = useMarkets()
  const createMarket = useCreateMarket()
  const deleteMarket = useDeleteMarket()
  const [newName, setNewName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const propertiesPerMarket = (marketName: string) =>
    allProperties?.filter((p) => p.market === marketName).length ?? 0

  const handleAdd = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    await createMarket.mutateAsync(trimmed)
    setNewName('')
  }

  return (
    <div
      className="rounded-[12px] overflow-hidden mb-4"
      style={{
        border: '1px solid rgba(123,124,248,0.22)',
        boxShadow: 'inset 0 0 0 1px rgba(123,124,248,0.04)',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-surface hover:bg-surface-hover transition-colors text-left"
      >
        <Settings2 size={14} strokeWidth={1.5} className="text-text-muted shrink-0" />
        <span className="text-[13px] font-semibold text-text-primary flex-1">Manage Markets</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={cn('text-text-muted transition-transform duration-200 shrink-0', !open && '-rotate-90')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 space-y-3 border-t border-border">
              {/* Add input */}
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                  placeholder="New market name…"
                  className="rounded-[8px] text-sm flex-1 h-9"
                />
                <NeonButton
                  size="sm"
                  withBloom={false}
                  onClick={handleAdd}
                  disabled={!newName.trim() || createMarket.isPending}
                  className="h-9 gap-1 shrink-0 flex items-center"
                >
                  <Plus size={13} strokeWidth={1.5} />
                  Add
                </NeonButton>
              </div>

              {/* Market list */}
              {markets && markets.length > 0 ? (
                <div className="space-y-1.5">
                  {markets.map((market) => {
                    const count = propertiesPerMarket(market.name)
                    return (
                      <div
                        key={market.id}
                        className="flex items-center gap-2 bg-card-bg border border-border rounded-[8px] px-3 py-2"
                      >
                        <span className="flex-1 text-[13px] font-medium text-text-primary">{market.name}</span>
                        {count > 0 && (
                          <span className="text-[11px] text-text-muted shrink-0">
                            {count} {count === 1 ? 'property' : 'properties'}
                          </span>
                        )}
                        {confirmDeleteId === market.id ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={async () => {
                                await deleteMarket.mutateAsync(market.id)
                                setConfirmDeleteId(null)
                              }}
                              className="text-[11px] font-medium text-red-500 hover:text-red-600 transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[11px] text-text-muted hover:text-text-secondary transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(market.id)}
                            disabled={count > 0}
                            title={count > 0 ? 'Reassign properties before deleting' : 'Delete market'}
                            className="shrink-0 w-6 h-6 flex items-center justify-center text-text-muted hover:text-red-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors rounded-[4px] hover:bg-red-500/10"
                          >
                            <Trash2 size={12} strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[13px] text-text-muted text-center py-2">No markets yet</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Step editor ───────────────────────────────────────────────────────────────

function StepEditor({
  steps,
  onChange,
}: {
  steps: WorkflowTemplateStep[]
  onChange: (steps: WorkflowTemplateStep[]) => void
}) {
  const addStep = () => {
    const newStep: WorkflowTemplateStep = {
      id: crypto.randomUUID(),
      label: '',
      order: steps.length,
    }
    onChange([...steps, newStep])
  }

  const updateLabel = (id: string, label: string) => {
    onChange(steps.map((s) => (s.id === id ? { ...s, label } : s)))
  }

  const removeStep = (id: string) => {
    onChange(steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i })))
  }

  const moveStep = (id: string, direction: 'up' | 'down') => {
    const idx = steps.findIndex((s) => s.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === steps.length - 1) return
    const newSteps = [...steps]
    const swap = direction === 'up' ? idx - 1 : idx + 1
    ;[newSteps[idx], newSteps[swap]] = [newSteps[swap], newSteps[idx]]
    onChange(newSteps.map((s, i) => ({ ...s, order: i })))
  }

  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-2"
        >
          <span className="text-[11px] font-semibold text-text-muted w-5 text-right shrink-0">{idx + 1}</span>
          <Input
            value={step.label}
            onChange={(e) => updateLabel(step.id, e.target.value)}
            placeholder={`Step ${idx + 1}`}
            className="rounded-[8px] text-sm flex-1 h-9"
          />
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              onClick={() => moveStep(step.id, 'up')}
              disabled={idx === 0}
              className="w-5 h-4 flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-20 transition-colors"
            >
              <ChevronRight size={11} strokeWidth={2} className="-rotate-90" />
            </button>
            <button
              onClick={() => moveStep(step.id, 'down')}
              disabled={idx === steps.length - 1}
              className="w-5 h-4 flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-20 transition-colors"
            >
              <ChevronRight size={11} strokeWidth={2} className="rotate-90" />
            </button>
          </div>
          <button
            onClick={() => removeStep(step.id)}
            className="shrink-0 w-7 h-7 flex items-center justify-center text-text-muted hover:text-red-500 transition-colors rounded-[6px] hover:bg-red-500/10"
          >
            <X size={13} strokeWidth={1.5} />
          </button>
        </motion.div>
      ))}
      <button
        onClick={addStep}
        className="flex items-center gap-1.5 text-[13px] text-haven-indigo hover:text-haven-indigo/80 font-medium transition-colors mt-1"
      >
        <Plus size={14} strokeWidth={1.5} />
        Add step
      </button>
    </div>
  )
}

// ── Template form (create / edit) ─────────────────────────────────────────────

function TemplateForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial?: WorkflowTemplate
  onSave: (name: string, description: string, steps: WorkflowTemplateStep[]) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [steps, setSteps] = useState<WorkflowTemplateStep[]>(initial?.steps ?? [])

  const valid = name.trim().length > 0 && steps.length > 0 && steps.every((s) => s.label.trim())

  return (
    <div className="bg-surface neon-border rounded-[12px] p-4 space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">
            Template Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. ECI / LCO Request"
            className="rounded-[8px] text-sm"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">
            Description <span className="font-normal normal-case">(optional)</span>
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="When is this template used?"
            className="rounded-[8px] text-sm"
          />
        </div>
      </div>
      <Separator />
      <div>
        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 block">
          Steps
        </label>
        <StepEditor steps={steps} onChange={setSteps} />
      </div>
      <div className="flex gap-2 pt-1">
        <NeonButton
          size="sm"
          withBloom={false}
          onClick={() => onSave(name.trim(), description.trim(), steps)}
          disabled={!valid || isSaving}
        >
          {isSaving ? 'Saving…' : initial ? 'Save Changes' : 'Create Template'}
        </NeonButton>
        <Button size="sm" variant="outline" onClick={onCancel} className="rounded-[8px]">
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ── Template row ──────────────────────────────────────────────────────────────

function TemplateRow({
  template,
  onEdit,
  onDelete,
}: {
  template: WorkflowTemplate
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="bg-card-bg neon-border rounded-[12px] p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-text-primary">{template.name}</h3>
          {template.description && (
            <p className="text-[13px] text-text-muted mt-0.5">{template.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="flex items-center gap-1 text-[12px] font-medium text-text-secondary hover:text-haven-indigo transition-colors px-2 py-1 rounded-[6px] hover:bg-haven-indigo/10"
          >
            <Pencil size={13} strokeWidth={1.5} />
            Edit
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onDelete}
                className="text-[12px] font-medium text-red-500 hover:text-red-600 px-2 py-1 rounded-[6px] transition-colors"
              >
                Confirm delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[12px] text-text-muted hover:text-text-secondary px-1 py-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center w-7 h-7 text-text-muted hover:text-red-500 transition-colors rounded-[6px] hover:bg-red-500/10"
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {template.steps.map((step, i) => (
          <span
            key={step.id}
            className="inline-flex items-center gap-1 text-[11px] text-text-muted bg-surface border border-border rounded-[6px] px-2 py-0.5"
          >
            <span className="font-semibold text-text-secondary">{i + 1}</span>
            {step.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Task type row ────────────────────────────────────────────────────────────

function TaskTypeRow({
  issueType,
  onToggleActive,
  isToggling,
}: {
  issueType: IssueTypeRecord
  onToggleActive: () => void
  isToggling: boolean
}) {
  return (
    <div className={cn(
      'bg-card-bg neon-border rounded-[10px] px-3 py-2.5 flex items-center gap-3',
      !issueType.active && 'opacity-40'
    )}>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text-primary leading-tight truncate">{issueType.label}</p>
        <p className="text-[11px] text-text-muted">{issueType.id}</p>
      </div>
      <button
        onClick={onToggleActive}
        disabled={isToggling}
        className={cn(
          'relative w-8 h-[18px] rounded-full transition-colors duration-200 focus:outline-none shrink-0',
          issueType.active ? 'bg-haven-indigo' : 'bg-zinc-600'
        )}
        title={issueType.active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
      >
        <span className={cn(
          'absolute top-0.5 left-0.5 w-[14px] h-[14px] bg-white rounded-full shadow transition-transform duration-200',
          issueType.active ? 'translate-x-[14px]' : 'translate-x-0'
        )} />
      </button>
    </div>
  )
}

// ── Task types section ───────────────────────────────────────────────────────

function TaskTypesSection() {
  const { types: issueTypes } = useIssueTypes()
  const createType = useCreateIssueType()
  const updateType = useUpdateIssueType()
  const [adding, setAdding] = useState(false)
  const [newSlug, setNewSlug] = useState('')
  const [newLabel, setNewLabel] = useState('')

  const handleAdd = async () => {
    const slug = newSlug.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const label = newLabel.trim()
    if (!slug || !label) return
    await createType.mutateAsync({ id: slug, label, sort_order: issueTypes.length })
    setNewSlug('')
    setNewLabel('')
    setAdding(false)
  }

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Task Types</h2>
          <p className="text-[13px] text-text-muted mt-0.5">
            Categories shown in the Task Type dropdown. Toggle off to hide.
          </p>
        </div>
        {!adding && (
          <NeonButton
            size="sm"
            withBloom={false}
            onClick={() => setAdding(true)}
            className="gap-1.5 shrink-0 flex items-center"
          >
            <Plus size={14} strokeWidth={1.5} />
            New Type
          </NeonButton>
        )}
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="mb-3"
          >
            <div className="bg-surface neon-border rounded-[10px] p-3 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">
                    Label
                  </label>
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Reservation"
                    className="rounded-[8px] text-sm"
                    autoFocus
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">
                    Slug
                  </label>
                  <Input
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    placeholder="e.g. reservation"
                    className="rounded-[8px] text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <NeonButton
                  size="sm"
                  withBloom={false}
                  onClick={handleAdd}
                  disabled={!newSlug.trim() || !newLabel.trim() || createType.isPending}
                >
                  {createType.isPending ? 'Adding…' : 'Add Type'}
                </NeonButton>
                <Button size="sm" variant="outline" onClick={() => setAdding(false)} className="rounded-[8px]">
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {issueTypes.length > 0 ? (
        <div className="space-y-1.5">
          {issueTypes.map((t) => (
            <TaskTypeRow
              key={t.id}
              issueType={t}
              onToggleActive={() => updateType.mutate({ id: t.id, active: !t.active })}
              isToggling={updateType.isPending}
            />
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-border rounded-[12px] py-10 text-center">
          <Tag size={22} strokeWidth={1} className="text-text-muted mx-auto mb-2 opacity-40" />
          <p className="text-sm text-text-muted">No task types defined</p>
        </div>
      )}
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Settings() {
  const { user } = useAuth()

  const { data: templates, isLoading, isError, refetch } = useWorkflowTemplates()
  const createTemplate = useCreateWorkflowTemplate()
  const updateTemplate = useUpdateWorkflowTemplate()
  const deleteTemplate = useDeleteWorkflowTemplate()
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  const { data: allProperties } = useAllProperties()
  const { data: markets } = useMarkets()
  const createProperty = useCreateProperty()
  const updateProperty = useUpdateProperty()
  const toggleActive = useTogglePropertyActive()

  // Group properties by market, preserving market order
  const groupedByMarket = useMemo(() => {
    if (!markets || !allProperties) return []
    const groups = markets.map((m) => ({
      marketName: m.name,
      properties: allProperties.filter((p) => p.market === m.name),
    }))
    // Any properties with a market not in the markets list
    const knownMarkets = new Set(markets.map((m) => m.name))
    const orphaned = allProperties.filter((p) => !knownMarkets.has(p.market))
    if (orphaned.length > 0) {
      groups.push({ marketName: 'Other', properties: orphaned })
    }
    return groups
  }, [markets, allProperties])

  const handleCreate = async (name: string, description: string, steps: WorkflowTemplateStep[]) => {
    if (!user) return
    await createTemplate.mutateAsync({ name, description, steps, createdBy: user.id })
    setCreatingTemplate(false)
  }

  const handleUpdate = async (id: string, name: string, description: string, steps: WorkflowTemplateStep[]) => {
    await updateTemplate.mutateAsync({ id, name, description, steps })
    setEditingTemplateId(null)
  }

  const handleDelete = async (id: string) => {
    await deleteTemplate.mutateAsync(id)
  }

  return (
    <div className="min-h-screen bg-page-bg">
      <TopNav onNewIssue={() => {}} />

      <main className="max-w-3xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-1">Settings</h1>
          <p className="text-sm text-text-muted">Manage markets, properties, and workflow templates.</p>
        </div>

        {/* Properties section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Properties</h2>
              <p className="text-[13px] text-text-muted mt-0.5">
                Grouped by market. Toggle off to hide a property without deleting it.
              </p>
            </div>
          </div>

          {/* Manage Markets accordion */}
          <ManageMarkets allProperties={allProperties} />

          {/* Market groups */}
          {groupedByMarket.length > 0 ? (
            <div className="space-y-2">
              {groupedByMarket.map(({ marketName, properties }) => (
                <MarketGroup
                  key={marketName}
                  marketName={marketName}
                  properties={properties}
                  createProperty={createProperty}
                  updateProperty={updateProperty}
                  toggleActive={toggleActive}
                />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-[12px] py-10 text-center">
              <Building2 size={22} strokeWidth={1} className="text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-sm text-text-muted">Add a market above, then add properties to it</p>
            </div>
          )}
        </section>

        <Separator className="mb-10" />

        {/* Task Types section */}
        <TaskTypesSection />

        <Separator className="mb-10" />

        {/* Workflow Templates section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Workflow Templates</h2>
              <p className="text-[13px] text-text-muted mt-0.5">
                Reusable step checklists that attach to tasks — same process every time.
              </p>
            </div>
            {!creatingTemplate && (
              <NeonButton
                size="sm"
                withBloom={false}
                onClick={() => { setCreatingTemplate(true); setEditingTemplateId(null) }}
                className="gap-1.5 shrink-0 flex items-center"
              >
                <Plus size={14} strokeWidth={1.5} />
                New Template
              </NeonButton>
            )}
          </div>

          <AnimatePresence>
            {creatingTemplate && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="mb-4"
              >
                <TemplateForm
                  onSave={handleCreate}
                  onCancel={() => setCreatingTemplate(false)}
                  isSaving={createTemplate.isPending}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading && !isError ? (
            <p className="text-sm text-text-muted py-6 text-center">Loading templates…</p>
          ) : isError ? (
            <div className="text-center py-6">
              <p className="text-sm text-text-muted mb-2">Couldn't load templates.</p>
              <button onClick={() => refetch()} className="text-sm text-haven-indigo hover:underline">Try again</button>
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="space-y-3">
              {templates.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {editingTemplateId === template.id ? (
                    <TemplateForm
                      initial={template}
                      onSave={(name, desc, steps) => handleUpdate(template.id, name, desc, steps)}
                      onCancel={() => setEditingTemplateId(null)}
                      isSaving={updateTemplate.isPending}
                    />
                  ) : (
                    <TemplateRow
                      template={template}
                      onEdit={() => { setEditingTemplateId(template.id); setCreatingTemplate(false) }}
                      onDelete={() => handleDelete(template.id)}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          ) : !creatingTemplate ? (
            <div className="border border-dashed border-border rounded-[12px] py-10 text-center">
              <GripVertical size={24} strokeWidth={1} className="text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-sm text-text-muted">No templates yet</p>
              <p className="text-[13px] text-text-muted mt-0.5">
                Create one to attach repeatable step checklists to tasks.
              </p>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  )
}
