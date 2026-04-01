import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import PriorityBadge from '@/components/PriorityBadge'
import { useProperties } from '@/hooks/useProperties'
import { useCreateIssue } from '@/hooks/useIssues'
import { useApplyTemplate } from '@/hooks/useChecklist'
import { useWorkflowTemplates } from '@/hooks/useWorkflowTemplates'
import { useAuth } from '@/contexts/AuthContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { IssueType, Priority } from '@/lib/types'
import { ISSUE_TYPE_LABELS } from '@/lib/types'

interface NewIssueModalProps {
  open: boolean
  onClose: () => void
}

const easing = [0.16, 1, 0.3, 1] as const

export default function NewIssueModal({ open, onClose }: NewIssueModalProps) {
  const { user } = useAuth()
  const { data: properties } = useProperties()
  const { data: templates } = useWorkflowTemplates()
  const createIssue = useCreateIssue()
  const applyTemplate = useApplyTemplate()
  const isMobile = useIsMobile()

  const [propertyId, setPropertyId] = useState('')
  const [type, setType] = useState<IssueType | ''>('')
  const [priority, setPriority] = useState<Priority | ''>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [initialNote, setInitialNote] = useState('')
  const [templateId, setTemplateId] = useState<string>('none')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedTemplate = templates?.find((t) => t.id === templateId)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!propertyId) e.propertyId = 'Required'
    if (!type) e.type = 'Required'
    if (!priority) e.priority = 'Required'
    if (!title.trim()) e.title = 'Required'
    if (!initialNote.trim()) e.initialNote = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !user) return

    const issue = await createIssue.mutateAsync({
      property_id: propertyId,
      title: title.trim(),
      description: description.trim() || undefined,
      type: type as IssueType,
      priority: priority as Priority,
      initial_note: initialNote.trim(),
      created_by: user.id,
    })

    // Apply workflow template if selected
    if (selectedTemplate && issue?.id) {
      await applyTemplate.mutateAsync({
        issueId: issue.id,
        steps: selectedTemplate.steps,
      })
    }

    // Reset and close
    setPropertyId('')
    setType('')
    setPriority('')
    setTitle('')
    setDescription('')
    setInitialNote('')
    setTemplateId('none')
    setErrors({})
    onClose()
  }

  const isSaving = createIssue.isPending || applyTemplate.isPending

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Modal / Bottom Sheet */}
          <motion.div
            initial={isMobile ? { y: '100%', opacity: 1 } : { opacity: 0, scale: 0.97, y: 8 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%', opacity: 1 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: isMobile ? 0.28 : 0.22, ease: easing }}
            drag={isMobile ? 'y' : false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onClose()
            }}
            className={
              isMobile
                ? 'fixed inset-x-0 bottom-0 z-50'
                : 'fixed inset-0 z-50 flex items-center justify-center p-4'
            }
          >
            <div
              className={
                isMobile
                  ? 'bg-card-bg rounded-t-[16px] border border-border border-b-0 shadow-xl w-full max-h-[92vh] overflow-y-auto'
                  : 'bg-card-bg rounded-[12px] border border-border shadow-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto'
              }
            >
              {/* Drag handle — mobile only */}
              {isMobile && (
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-zinc-300 rounded-full" />
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-text-primary">New Task</h2>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] text-text-muted hover:text-text-secondary transition-colors -mr-2"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
                {/* Property */}
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">
                    Property
                  </label>
                  <Select value={propertyId} onValueChange={setPropertyId}>
                    <SelectTrigger className="rounded-[8px] min-h-[44px]">
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        if (!properties?.length) return null
                        const markets = [...new Set(properties.map(p => p.market))]
                        return markets.map((market, mi) => (
                          <SelectGroup key={market}>
                            <SelectLabel className="text-[11px] font-semibold uppercase tracking-wider text-text-muted px-2 pt-2 pb-1">
                              {market}
                            </SelectLabel>
                            {properties.filter(p => p.market === market).map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                            {mi < markets.length - 1 && <SelectSeparator />}
                          </SelectGroup>
                        ))
                      })()}
                    </SelectContent>
                  </Select>
                  {errors.propertyId && (
                    <p className="text-xs text-red-600 mt-1">{errors.propertyId}</p>
                  )}
                </div>

                {/* Type */}
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">
                    Task Type
                  </label>
                  <Select value={type} onValueChange={(v) => setType(v as IssueType)}>
                    <SelectTrigger className="rounded-[8px] min-h-[44px]">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(ISSUE_TYPE_LABELS) as [IssueType, string][]).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="text-xs text-red-600 mt-1">{errors.type}</p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">
                    Priority
                  </label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                    <SelectTrigger className="rounded-[8px] min-h-[44px]">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_fire"><PriorityBadge priority="on_fire" /></SelectItem>
                      <SelectItem value="urgent"><PriorityBadge priority="urgent" /></SelectItem>
                      <SelectItem value="watch"><PriorityBadge priority="watch" /></SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.priority && (
                    <p className="text-xs text-red-600 mt-1">{errors.priority}</p>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">
                    Title
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief description of the issue"
                    className="rounded-[8px] min-h-[44px]"
                  />
                  {errors.title && (
                    <p className="text-xs text-red-600 mt-1">{errors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">
                    Description
                    <span className="text-text-muted font-normal ml-1">(optional)</span>
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Additional context or details"
                    className="rounded-[8px] min-h-[80px]"
                  />
                </div>

                {/* Workflow Template */}
                {templates && templates.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-text-primary mb-1.5 block">
                      Workflow Template
                      <span className="text-text-muted font-normal ml-1">(optional)</span>
                    </label>
                    <Select value={templateId} onValueChange={setTemplateId}>
                      <SelectTrigger className="rounded-[8px] min-h-[44px]">
                        <SelectValue placeholder="None — no checklist" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None — no checklist</SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <span className="flex items-center gap-2">
                              <ListChecks size={13} strokeWidth={1.5} />
                              {t.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Step preview */}
                    <AnimatePresence>
                      {selectedTemplate && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="mt-2 overflow-hidden"
                        >
                          <div className="bg-zinc-50 border border-zinc-200 rounded-[8px] p-3 space-y-1.5">
                            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                              {selectedTemplate.steps.length} steps will be added
                            </p>
                            {selectedTemplate.steps.map((step, i) => (
                              <div key={step.id} className="flex items-start gap-2">
                                <span className="text-[11px] font-semibold text-text-muted w-4 shrink-0 mt-px">
                                  {i + 1}
                                </span>
                                <span className="text-[12px] text-text-secondary leading-snug">
                                  {step.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Initial Note */}
                <div>
                  <label className="text-sm font-medium text-text-primary mb-1.5 block">
                    Initial Note
                  </label>
                  <Textarea
                    value={initialNote}
                    onChange={(e) => setInitialNote(e.target.value)}
                    placeholder="What's happening right now? This becomes the first activity entry."
                    className="rounded-[8px] min-h-[80px]"
                  />
                  {errors.initialNote && (
                    <p className="text-xs text-red-600 mt-1">{errors.initialNote}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2 pb-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="rounded-[8px] min-h-[44px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-[8px] font-medium min-h-[44px]"
                    style={{ backgroundColor: '#5B5BD6' }}
                  >
                    {isSaving ? 'Creating…' : 'Create Task'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
