import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Check,
  Eye,
  EyeOff,
  BookOpen,
  Save,
} from 'lucide-react'
import TopNav from '@/components/TopNav'
import { useAuth } from '@/contexts/AuthContext'
import {
  useAllScenarios,
  useCreateScenario,
  useUpdateScenario,
  useHavenStandards,
  useUpdateHavenStandard,
} from '@/hooks/useTraining'
import type { ScenarioInput } from '@/hooks/useTraining'
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  TRAINING_ISSUE_TYPE_LABELS,
} from '@/lib/training-types'
import type { Difficulty, TrainingIssueType, Scenario } from '@/lib/training-types'
import { cn } from '@/lib/utils'

type Tab = 'scenarios' | 'standards'
type DifficultyFilter = 'all' | Difficulty
type StatusFilter = 'all' | 'active' | 'inactive' | 'pending'

const EMPTY_FORM: ScenarioInput = {
  title: '',
  difficulty: 'medium',
  property: '',
  issue_type: 'maintenance',
  brief: '',
  guest_persona: '',
  haven_standard: '',
  source: 'handcrafted',
  approved: false,
  active: false,
}

// ── Scenario Form ────────────────────────────────────────────────────────────

function ScenarioForm({
  initial,
  onSave,
  onCancel,
  saving,
  isEdit,
}: {
  initial: ScenarioInput
  onSave: (data: ScenarioInput) => void
  onCancel: () => void
  saving: boolean
  isEdit: boolean
}) {
  const [form, setForm] = useState<ScenarioInput>(initial)

  const set = (key: keyof ScenarioInput, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const valid =
    form.title.trim() &&
    form.brief.trim() &&
    form.guest_persona.trim() &&
    form.haven_standard.trim()

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-text-primary">
        {isEdit ? 'Edit Scenario' : 'New Scenario'}
      </h3>

      {/* Title */}
      <div>
        <label className="text-xs text-text-secondary font-medium uppercase tracking-wider">
          Title
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="e.g., Broken AC During Heat Wave"
          className="mt-1 w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-haven-indigo/50"
        />
      </div>

      {/* Difficulty + Issue Type row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-text-secondary font-medium uppercase tracking-wider">
            Difficulty
          </label>
          <div className="mt-1 flex gap-1">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
              const colors = DIFFICULTY_COLORS[d]
              return (
                <button
                  key={d}
                  onClick={() => set('difficulty', d)}
                  className={cn(
                    'flex-1 text-xs font-medium py-1.5 rounded-[8px] border transition-colors cursor-pointer',
                    form.difficulty === d
                      ? cn(colors.bg, colors.text, colors.border)
                      : 'text-text-muted border-border hover:border-border'
                  )}
                >
                  {DIFFICULTY_LABELS[d]}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label className="text-xs text-text-secondary font-medium uppercase tracking-wider">
            Issue Type
          </label>
          <select
            value={form.issue_type}
            onChange={(e) => set('issue_type', e.target.value)}
            className="mt-1 w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-haven-indigo/50 cursor-pointer"
          >
            {Object.entries(TRAINING_ISSUE_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Property */}
      <div>
        <label className="text-xs text-text-secondary font-medium uppercase tracking-wider">
          Property (optional)
        </label>
        <input
          type="text"
          value={form.property ?? ''}
          onChange={(e) => set('property', e.target.value || null)}
          placeholder="e.g., Lolo Loft 101"
          className="mt-1 w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-haven-indigo/50"
        />
      </div>

      {/* Brief */}
      <div>
        <label className="text-xs text-text-secondary font-medium uppercase tracking-wider">
          Scenario Brief
        </label>
        <textarea
          value={form.brief}
          onChange={(e) => set('brief', e.target.value)}
          placeholder="Describe the situation the trainee will face..."
          rows={3}
          className="mt-1 w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-haven-indigo/50"
        />
      </div>

      {/* Guest Persona */}
      <div>
        <label className="text-xs text-text-secondary font-medium uppercase tracking-wider">
          Guest Persona
        </label>
        <textarea
          value={form.guest_persona}
          onChange={(e) => set('guest_persona', e.target.value)}
          placeholder="Describe how this guest behaves, their emotional state, what they want..."
          rows={3}
          className="mt-1 w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-haven-indigo/50"
        />
      </div>

      {/* Haven Standard */}
      <div>
        <label className="text-xs text-text-secondary font-medium uppercase tracking-wider">
          Haven Standard (expected resolution)
        </label>
        <textarea
          value={form.haven_standard}
          onChange={(e) => set('haven_standard', e.target.value)}
          placeholder="What Haven expects the correct response to be..."
          rows={3}
          className="mt-1 w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-haven-indigo/50"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          className="text-sm text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!valid || saving}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium transition-all duration-200 cursor-pointer',
            valid && !saving
              ? 'text-white bg-haven-indigo/20 border border-haven-indigo/60 hover:bg-haven-indigo/30'
              : 'text-text-muted bg-surface border border-border cursor-not-allowed'
          )}
        >
          <Save size={14} strokeWidth={1.5} />
          {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  )
}

// ── Scenario Row ─────────────────────────────────────────────────────────────

function ScenarioRow({
  scenario,
  index,
  onEdit,
  onToggleActive,
  onToggleApproved,
}: {
  scenario: Scenario
  index: number
  onEdit: () => void
  onToggleActive: () => void
  onToggleApproved: () => void
}) {
  const diff = scenario.difficulty
  const diffColors = DIFFICULTY_COLORS[diff]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.02, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'bg-card-bg rounded-[10px] neon-border p-4 transition-colors',
        !scenario.active && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onEdit}
              className="text-sm font-medium text-text-primary hover:text-haven-indigo transition-colors cursor-pointer text-left"
            >
              {scenario.title}
            </button>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full border shrink-0',
                diffColors.bg,
                diffColors.text,
                diffColors.border
              )}
            >
              {DIFFICULTY_LABELS[diff]}
            </span>
            <span className="text-[10px] text-text-muted">
              {TRAINING_ISSUE_TYPE_LABELS[scenario.issue_type as TrainingIssueType] ?? scenario.issue_type}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1 line-clamp-2">
            {scenario.brief}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-text-muted">
              Used {scenario.times_used}x
            </span>
            {scenario.avg_score_when_used != null && (
              <span className="text-[10px] text-text-muted">
                Avg score: {scenario.avg_score_when_used}
              </span>
            )}
            <span className="text-[10px] text-text-muted capitalize">
              {scenario.source}
            </span>
          </div>
        </div>

        {/* Toggle buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleApproved}
            title={scenario.approved ? 'Approved — click to unapprove' : 'Not approved — click to approve'}
            className={cn(
              'flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-[6px] border transition-colors cursor-pointer',
              scenario.approved
                ? 'text-watch-text border-watch-border bg-watch-bg'
                : 'text-text-muted border-border hover:border-text-muted'
            )}
          >
            <Check size={12} strokeWidth={2} />
            {scenario.approved ? 'Approved' : 'Approve'}
          </button>
          <button
            onClick={onToggleActive}
            title={scenario.active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
            className={cn(
              'flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-[6px] border transition-colors cursor-pointer',
              scenario.active
                ? 'text-haven-indigo border-haven-indigo/30 bg-haven-indigo/10'
                : 'text-text-muted border-border hover:border-text-muted'
            )}
          >
            {scenario.active ? <Eye size={12} strokeWidth={1.5} /> : <EyeOff size={12} strokeWidth={1.5} />}
            {scenario.active ? 'Active' : 'Inactive'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Haven Standards Tab ──────────────────────────────────────────────────────

function StandardsEditor() {
  const { data: standards, isLoading } = useHavenStandards()
  const updateStandard = useUpdateHavenStandard()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  if (isLoading) {
    return <div className="text-sm text-text-secondary py-8 text-center">Loading standards...</div>
  }

  if (!standards || standards.length === 0) {
    return <div className="text-sm text-text-muted py-8 text-center">No haven standards found.</div>
  }

  return (
    <div className="flex flex-col gap-3">
      {standards.map((std, i) => {
        const isEditing = editingId === std.id
        return (
          <motion.div
            key={std.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, delay: i * 0.02, ease: [0.16, 1, 0.3, 1] }}
            className="bg-card-bg rounded-[10px] neon-border p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-haven-indigo uppercase tracking-wider">
                {TRAINING_ISSUE_TYPE_LABELS[std.issue_type as TrainingIssueType] ?? std.issue_type}
              </span>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await updateStandard.mutateAsync({ id: std.id, standard_text: editText })
                      setEditingId(null)
                    }}
                    disabled={updateStandard.isPending}
                    className="flex items-center gap-1 text-xs text-haven-indigo hover:text-haven-indigo-hover cursor-pointer"
                  >
                    <Save size={12} strokeWidth={1.5} />
                    {updateStandard.isPending ? 'Saving...' : 'Save'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingId(std.id)
                    setEditText(std.standard_text)
                  }}
                  className="text-xs text-text-muted hover:text-haven-indigo cursor-pointer"
                >
                  Edit
                </button>
              )}
            </div>
            {isEditing ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={4}
                className="w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-haven-indigo/50"
              />
            ) : (
              <p className="text-sm text-text-primary leading-relaxed">
                {std.standard_text}
              </p>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ScenarioManager() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const { data: scenarios, isLoading } = useAllScenarios()
  const createScenario = useCreateScenario()
  const updateScenario = useUpdateScenario()

  const [activeTab, setActiveTab] = useState<Tab>('scenarios')
  const [diffFilter, setDiffFilter] = useState<DifficultyFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null)

  // Filter scenarios
  const filtered = useMemo(() => {
    if (!scenarios) return []
    return scenarios.filter((s) => {
      if (diffFilter !== 'all' && s.difficulty !== diffFilter) return false
      if (statusFilter === 'active' && !s.active) return false
      if (statusFilter === 'inactive' && s.active) return false
      if (statusFilter === 'pending' && s.approved) return false
      return true
    })
  }, [scenarios, diffFilter, statusFilter])

  // Admin gate
  if (profile && !profile.is_training_admin) {
    return (
      <div className="h-screen flex flex-col bg-page-bg">
        <TopNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-text-secondary text-sm">Admin access required.</p>
            <button
              onClick={() => navigate('/training')}
              className="mt-3 text-sm text-haven-indigo hover:underline cursor-pointer"
            >
              Back to Training
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleCreate = async (data: ScenarioInput) => {
    await createScenario.mutateAsync(data)
    setShowForm(false)
  }

  const handleUpdate = async (data: ScenarioInput) => {
    if (!editingScenario) return
    await updateScenario.mutateAsync({ id: editingScenario.id, ...data })
    setEditingScenario(null)
    setShowForm(false)
  }

  const handleToggleActive = (s: Scenario) => {
    updateScenario.mutate({ id: s.id, active: !s.active })
  }

  const handleToggleApproved = (s: Scenario) => {
    updateScenario.mutate({ id: s.id, approved: !s.approved })
  }

  return (
    <div className="h-screen flex flex-col bg-page-bg">
      <TopNav />

      <main className="flex-1 overflow-y-auto themed-scroll">
        <div className="max-w-2xl mx-auto px-4 py-5 sm:px-6 sm:py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Scenario Manager</h2>
              <p className="text-sm text-text-secondary mt-0.5">
                {scenarios?.length ?? 0} scenarios
              </p>
            </div>
            {activeTab === 'scenarios' && !showForm && (
              <button
                onClick={() => {
                  setEditingScenario(null)
                  setShowForm(true)
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-sm font-medium text-white transition-all duration-200 hover:scale-[1.03] cursor-pointer"
                style={{
                  background: 'rgba(123, 124, 248, 0.15)',
                  border: '1.5px solid rgba(123, 124, 248, 0.7)',
                  boxShadow: '0 0 8px rgba(123, 124, 248, 0.3)',
                }}
              >
                <Plus size={16} strokeWidth={1.5} />
                New Scenario
              </button>
            )}
          </motion.div>

          {/* Tab Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.03, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-1 p-1 bg-surface rounded-[10px] neon-border mb-5"
          >
            {(['scenarios', 'standards'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab)
                  setShowForm(false)
                  setEditingScenario(null)
                }}
                className={cn(
                  'relative flex-1 text-sm font-medium py-2 rounded-[8px] transition-colors cursor-pointer',
                  activeTab === tab
                    ? 'text-white'
                    : 'text-text-secondary hover:text-text-primary'
                )}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="mgr-tab-bg"
                    className="absolute inset-0 rounded-[8px]"
                    style={{
                      background: 'rgba(123, 124, 248, 0.12)',
                      border: '1px solid rgba(123, 124, 248, 0.4)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  {tab === 'scenarios' ? 'Scenarios' : (
                    <>
                      <BookOpen size={14} strokeWidth={1.5} />
                      Haven Standards
                    </>
                  )}
                </span>
              </button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {activeTab === 'scenarios' ? (
              <motion.div
                key="scenarios"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Create/Edit Form */}
                <AnimatePresence>
                  {showForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-card-bg rounded-[10px] border border-haven-indigo/20 p-5 mb-5">
                        <ScenarioForm
                          initial={
                            editingScenario
                              ? {
                                  title: editingScenario.title,
                                  difficulty: editingScenario.difficulty,
                                  property: editingScenario.property,
                                  issue_type: editingScenario.issue_type,
                                  brief: editingScenario.brief,
                                  guest_persona: editingScenario.guest_persona,
                                  haven_standard: editingScenario.haven_standard,
                                  source: editingScenario.source,
                                  approved: editingScenario.approved,
                                  active: editingScenario.active,
                                }
                              : EMPTY_FORM
                          }
                          onSave={editingScenario ? handleUpdate : handleCreate}
                          onCancel={() => {
                            setShowForm(false)
                            setEditingScenario(null)
                          }}
                          saving={createScenario.isPending || updateScenario.isPending}
                          isEdit={!!editingScenario}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Filters */}
                {!showForm && (
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {/* Difficulty filter */}
                    {(['all', 'easy', 'medium', 'hard'] as DifficultyFilter[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDiffFilter(d)}
                        className={cn(
                          'text-xs font-medium px-2.5 py-1 rounded-full border transition-colors cursor-pointer',
                          diffFilter === d
                            ? d === 'all'
                              ? 'text-haven-indigo border-haven-indigo/40 bg-haven-indigo/10'
                              : cn(DIFFICULTY_COLORS[d as Difficulty].text, DIFFICULTY_COLORS[d as Difficulty].border, DIFFICULTY_COLORS[d as Difficulty].bg)
                            : 'text-text-muted border-border'
                        )}
                      >
                        {d === 'all' ? 'All' : DIFFICULTY_LABELS[d as Difficulty]}
                      </button>
                    ))}

                    <span className="text-text-muted text-xs">|</span>

                    {/* Status filter */}
                    {(['all', 'active', 'inactive', 'pending'] as StatusFilter[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={cn(
                          'text-xs font-medium px-2.5 py-1 rounded-full border transition-colors cursor-pointer capitalize',
                          statusFilter === s
                            ? 'text-haven-indigo border-haven-indigo/40 bg-haven-indigo/10'
                            : 'text-text-muted border-border'
                        )}
                      >
                        {s === 'pending' ? 'Unapproved' : s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Scenario List */}
                {isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-text-secondary text-sm">Loading scenarios...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-text-muted text-sm">No scenarios match your filters.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filtered.map((s, i) => (
                      <ScenarioRow
                        key={s.id}
                        scenario={s}
                        index={i}
                        onEdit={() => {
                          setEditingScenario(s)
                          setShowForm(true)
                        }}
                        onToggleActive={() => handleToggleActive(s)}
                        onToggleApproved={() => handleToggleApproved(s)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="standards"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              >
                <StandardsEditor />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
