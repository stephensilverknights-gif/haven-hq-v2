import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, GripVertical, X, ChevronRight, Building2, MapPin } from 'lucide-react'
import TopNav from '@/components/TopNav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useAuth } from '@/contexts/AuthContext'
import type { WorkflowTemplate, WorkflowTemplateStep, Property } from '@/lib/types'

// ── Markets section ────────────────────────────────────────────────────────────

function MarketsSection() {
  const { data: markets } = useMarkets()
  const { data: allProperties } = useAllProperties()
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
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-text-primary">Markets</h2>
        <p className="text-[13px] text-text-muted mt-0.5">
          Markets group your properties. Select from this list when adding a property.
        </p>
      </div>

      {/* Add market input */}
      <div className="flex gap-2 mb-4">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder="e.g. North Idaho"
          className="rounded-[8px] text-sm flex-1"
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!newName.trim() || createMarket.isPending}
          className="rounded-[8px] gap-1.5 shrink-0"
          style={{ backgroundColor: '#5B5BD6' }}
        >
          <Plus size={14} strokeWidth={1.5} />
          Add
        </Button>
      </div>

      {/* Market list */}
      {markets && markets.length > 0 ? (
        <div className="space-y-2">
          {markets.map((market) => {
            const count = propertiesPerMarket(market.name)
            return (
              <div
                key={market.id}
                className="bg-card-bg border border-border rounded-[10px] px-4 py-3 flex items-center gap-3"
              >
                <MapPin size={14} strokeWidth={1.5} className="text-text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-text-primary">{market.name}</p>
                  {count > 0 && (
                    <p className="text-[12px] text-text-muted">
                      {count} {count === 1 ? 'property' : 'properties'}
                    </p>
                  )}
                </div>
                {confirmDeleteId === market.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        await deleteMarket.mutateAsync(market.id)
                        setConfirmDeleteId(null)
                      }}
                      className="text-[12px] font-medium text-red-500 hover:text-red-600 px-2 py-1 rounded-[6px] transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[12px] text-text-muted hover:text-text-secondary px-1 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(market.id)}
                    disabled={count > 0}
                    title={count > 0 ? 'Reassign properties before deleting' : 'Delete market'}
                    className="shrink-0 w-7 h-7 flex items-center justify-center text-text-muted hover:text-red-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors rounded-[6px] hover:bg-red-500/10"
                  >
                    <Trash2 size={13} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="border border-dashed border-border rounded-[12px] py-8 text-center">
          <MapPin size={22} strokeWidth={1} className="text-text-muted mx-auto mb-2 opacity-40" />
          <p className="text-sm text-text-muted">No markets yet — add one above</p>
        </div>
      )}
    </section>
  )
}

// ── Property form (create / edit) ─────────────────────────────────────────────

function PropertyForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial?: Property
  onSave: (name: string, market: string) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const { data: markets } = useMarkets()
  const [name, setName] = useState(initial?.name ?? '')
  const [market, setMarket] = useState(initial?.market ?? '')

  const valid = name.trim().length > 0 && market.length > 0

  return (
    <div className="bg-surface border border-border rounded-[12px] p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">
            Property Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sherman Arms"
            className="rounded-[8px] text-sm"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">
            Market
          </label>
          {markets && markets.length > 0 ? (
            <Select value={market} onValueChange={setMarket}>
              <SelectTrigger className="rounded-[8px] text-sm min-h-[40px]">
                <SelectValue placeholder="Select market" />
              </SelectTrigger>
              <SelectContent>
                {markets.map((m) => (
                  <SelectItem key={m.id} value={m.name}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-[13px] text-text-muted pt-2">
              Add a market above first.
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={() => onSave(name.trim(), market)}
          disabled={!valid || isSaving}
          className="rounded-[8px]"
          style={{ backgroundColor: '#5B5BD6' }}
        >
          {isSaving ? 'Saving…' : initial ? 'Save Changes' : 'Add Property'}
        </Button>
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
    <div className={`bg-card-bg border border-border rounded-[12px] px-4 py-3 flex items-center gap-3 ${!property.active ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-text-primary leading-tight">{property.name}</p>
        <p className="text-[12px] text-text-muted">{property.market}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* Active toggle */}
        <button
          onClick={onToggleActive}
          disabled={isToggling}
          className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
            property.active ? 'bg-haven-indigo' : 'bg-zinc-600'
          }`}
          title={property.active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
              property.active ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-[12px] font-medium text-text-secondary hover:text-haven-indigo transition-colors px-2 py-1 rounded-[6px] hover:bg-haven-indigo/10"
        >
          <Pencil size={13} strokeWidth={1.5} />
          Edit
        </button>
      </div>
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
    onChange(
      steps
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, order: i }))
    )
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
          <span className="text-[11px] font-semibold text-text-muted w-5 text-right shrink-0">
            {idx + 1}
          </span>
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
    <div className="bg-surface border border-border rounded-[12px] p-4 space-y-4">
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
        <Button
          size="sm"
          onClick={() => onSave(name.trim(), description.trim(), steps)}
          disabled={!valid || isSaving}
          className="rounded-[8px]"
          style={{ backgroundColor: '#5B5BD6' }}
        >
          {isSaving ? 'Saving…' : initial ? 'Save Changes' : 'Create Template'}
        </Button>
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
    <div className="bg-card-bg border border-border rounded-[12px] p-4">
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Settings() {
  const { user } = useAuth()

  // Templates
  const { data: templates, isLoading, isError, refetch } = useWorkflowTemplates()
  const createTemplate = useCreateWorkflowTemplate()
  const updateTemplate = useUpdateWorkflowTemplate()
  const deleteTemplate = useDeleteWorkflowTemplate()
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  // Properties
  const { data: allProperties } = useAllProperties()
  const createProperty = useCreateProperty()
  const updateProperty = useUpdateProperty()
  const toggleActive = useTogglePropertyActive()
  const [creatingProperty, setCreatingProperty] = useState(false)
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null)

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
          <p className="text-sm text-text-muted">Manage markets, properties, workflow templates, and app configuration.</p>
        </div>

        {/* Markets */}
        <MarketsSection />

        <Separator className="mb-10" />

        {/* Properties section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Properties</h2>
              <p className="text-[13px] text-text-muted mt-0.5">
                Active properties appear in task forms. Toggle off to hide without deleting.
              </p>
            </div>
            {!creatingProperty && (
              <Button
                size="sm"
                onClick={() => { setCreatingProperty(true); setEditingPropertyId(null) }}
                className="rounded-[8px] gap-1.5 shrink-0"
                style={{ backgroundColor: '#5B5BD6' }}
              >
                <Plus size={14} strokeWidth={1.5} />
                Add Property
              </Button>
            )}
          </div>

          <AnimatePresence>
            {creatingProperty && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="mb-3"
              >
                <PropertyForm
                  onSave={async (name, market) => {
                    await createProperty.mutateAsync({ name, market })
                    setCreatingProperty(false)
                  }}
                  onCancel={() => setCreatingProperty(false)}
                  isSaving={createProperty.isPending}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {allProperties && allProperties.length > 0 ? (
            <div className="space-y-2">
              {allProperties.map((property) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {editingPropertyId === property.id ? (
                    <PropertyForm
                      initial={property}
                      onSave={async (name, market) => {
                        await updateProperty.mutateAsync({ id: property.id, name, market })
                        setEditingPropertyId(null)
                      }}
                      onCancel={() => setEditingPropertyId(null)}
                      isSaving={updateProperty.isPending}
                    />
                  ) : (
                    <PropertyRow
                      property={property}
                      onEdit={() => { setEditingPropertyId(property.id); setCreatingProperty(false) }}
                      onToggleActive={() => toggleActive.mutate({ id: property.id, active: !property.active })}
                      isToggling={toggleActive.isPending}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          ) : !creatingProperty ? (
            <div className="border border-dashed border-border rounded-[12px] py-8 text-center">
              <Building2 size={22} strokeWidth={1} className="text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-sm text-text-muted">No properties yet</p>
            </div>
          ) : null}
        </section>

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
              <Button
                size="sm"
                onClick={() => { setCreatingTemplate(true); setEditingTemplateId(null) }}
                className="rounded-[8px] gap-1.5 shrink-0"
                style={{ backgroundColor: '#5B5BD6' }}
              >
                <Plus size={14} strokeWidth={1.5} />
                New Template
              </Button>
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
