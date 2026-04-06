import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import IssueCardV2 from '@/components/IssueCardV2'
import { toIssueCardV2Props } from '@/lib/toIssueCardV2Props'
import { useUpdateIssuePriority } from '@/hooks/useIssues'
import { useAuth } from '@/contexts/AuthContext'
import type { Issue, Priority, CostEntry } from '@/lib/types'
import type { LastCompletedChecklistItem } from '@/hooks/useLastCompletedChecklist'

const PRIORITY_COLUMNS: { priority: Priority; label: string; color: string; shimmer: string }[] = [
  {
    priority: 'on_fire',
    label: 'On Fire',
    color: '#FF6B6B',
    shimmer: 'linear-gradient(90deg,transparent,rgba(239,68,68,0.35) 30%,rgba(239,68,68,0.15) 70%,transparent)',
  },
  {
    priority: 'urgent',
    label: 'Important',
    color: '#FBBF24',
    shimmer: 'linear-gradient(90deg,transparent,rgba(251,191,36,0.3) 30%,rgba(251,191,36,0.12) 70%,transparent)',
  },
  {
    priority: 'watch',
    label: 'Upcoming',
    color: '#34D399',
    shimmer: 'linear-gradient(90deg,transparent,rgba(52,211,153,0.25) 30%,rgba(52,211,153,0.1) 70%,transparent)',
  },
]

function DroppableColumn({
  id,
  label,
  color,
  shimmer,
  count,
  children,
}: {
  id: string
  label: string
  color: string
  shimmer: string
  count: number
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col min-w-[280px] flex-1"
      style={{
        borderRadius: '12px',
        border: `1px solid ${isOver ? color + '80' : 'rgba(123,124,248,0.15)'}`,
        background: isOver ? color + '08' : 'rgba(16,16,25,0.5)',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div className="px-3 py-2.5 flex items-center gap-2">
        <span
          className="w-[5px] h-[5px] rounded-full shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
        />
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color, textShadow: `0 0 6px ${color}59` }}
        >
          {label}
        </span>
        <span className="text-[11px] text-text-muted">· {count}</span>
      </div>
      <div className="relative h-[1px] mb-1">
        <div className="absolute left-0 right-0 top-0 h-[1px]" style={{ background: shimmer }} />
      </div>
      <div className="flex-1 px-2 pb-2 space-y-2 min-h-[100px]">
        {children}
      </div>
    </div>
  )
}

function DraggableCard({
  issue,
  costEntries,
  lastCompletedByIssue,
  lastNotes,
  selectedId,
  onSelect,
}: {
  issue: Issue
  costEntries: CostEntry[] | undefined
  lastCompletedByIssue: Record<string, LastCompletedChecklistItem> | undefined
  lastNotes: Record<string, { note: string; author: string } | undefined>
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: issue.id,
    data: { issue },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.4 : 1, cursor: 'grab' }}
    >
      <IssueCardV2
        {...toIssueCardV2Props(issue, {
          costEntries,
          lastCompletedChecklistItem: lastCompletedByIssue?.[issue.id],
          lastNote: lastNotes[issue.id],
        })}
        isSelected={selectedId === issue.id}
        onClick={() => onSelect(issue.id)}
      />
    </div>
  )
}

interface StatusBoardProps {
  issues: Issue[]
  lastNotes: Record<string, { note: string; author: string } | undefined>
  costEntriesByIssue: Record<string, CostEntry[]>
  lastCompletedByIssue: Record<string, LastCompletedChecklistItem> | undefined
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function StatusBoard({
  issues,
  lastNotes,
  costEntriesByIssue,
  lastCompletedByIssue,
  selectedId,
  onSelect,
}: StatusBoardProps) {
  const { user } = useAuth()
  const updatePriority = useUpdateIssuePriority()
  const [draggedIssue, setDraggedIssue] = useState<Issue | null>(null)

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  const sensors = useSensors(pointerSensor, touchSensor)

  // Only show active (non-resolved) issues in the board
  const activeIssues = issues.filter(i => i.status !== 'resolved')

  const grouped: Record<Priority, Issue[]> = {
    on_fire: activeIssues.filter(i => i.priority === 'on_fire'),
    urgent: activeIssues.filter(i => i.priority === 'urgent'),
    watch: activeIssues.filter(i => i.priority === 'watch'),
  }

  const handleDragStart = (event: DragStartEvent) => {
    const issue = event.active.data.current?.issue as Issue | undefined
    if (issue) setDraggedIssue(issue)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedIssue(null)
    const { active, over } = event
    if (!over || !user) return

    const issue = active.data.current?.issue as Issue | undefined
    if (!issue) return

    const targetPriority = over.id as Priority
    if (targetPriority === issue.priority) return

    // Priority changes don't require a note — just update immediately
    updatePriority.mutate({ issueId: issue.id, priority: targetPriority, userId: user.id })
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 themed-scroll">
        {PRIORITY_COLUMNS.map(({ priority, label, color, shimmer }) => (
          <DroppableColumn
            key={priority}
            id={priority}
            label={label}
            color={color}
            shimmer={shimmer}
            count={grouped[priority].length}
          >
            {grouped[priority].map((issue) => (
              <DraggableCard
                key={issue.id}
                issue={issue}
                costEntries={costEntriesByIssue[issue.id]}
                lastCompletedByIssue={lastCompletedByIssue}
                lastNotes={lastNotes}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
            {grouped[priority].length === 0 && (
              <p className="text-[12px] text-text-muted text-center py-6 italic">
                Drop here
              </p>
            )}
          </DroppableColumn>
        ))}
      </div>

      <DragOverlay>
        {draggedIssue && (
          <div style={{ width: 340, opacity: 0.9, transform: 'scale(1.02)' }}>
            <IssueCardV2
              {...toIssueCardV2Props(draggedIssue, {
                costEntries: costEntriesByIssue[draggedIssue.id],
                lastCompletedChecklistItem: lastCompletedByIssue?.[draggedIssue.id],
                lastNote: lastNotes[draggedIssue.id],
              })}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
