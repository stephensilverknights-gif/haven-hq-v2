import type { Issue, CostEntry } from '@/lib/types'
import type { RecentActivity } from '@/components/IssueCardV2'
import type { LastCompletedChecklistItem } from '@/hooks/useLastCompletedChecklist'

interface LastNote {
  note: string
  author: string
}

interface IssueCardV2PropsShape {
  title: string
  priority: Issue['priority']
  status: Issue['status']
  type: Issue['type']
  property: string
  market: string
  cost: number | null
  openedAt: string
  recentActivity: RecentActivity | null
  checkIn?: string | null
  checkOut?: string | null
  dueDate?: string | null
  assignedCleaner?: string | null
}

/**
 * Flattens a prod Issue (with joined property, aggregated costs, checklist &
 * activity_log signals) into the shape IssueCardV2 consumes.
 *
 * Recent-activity rules (agreed in design phase):
 *   1. If there's a completed checklist item → show "✓ {completer}: {label}"
 *   2. Else fall back to the latest activity_log note
 *   3. If neither exists → null (card hides the row)
 */
export function toIssueCardV2Props(
  issue: Issue,
  opts: {
    costEntries?: CostEntry[]              // all cost entries for THIS issue
    lastCompletedChecklistItem?: LastCompletedChecklistItem  // most recent done item
    lastNote?: LastNote                    // latest activity_log entry
  } = {}
): IssueCardV2PropsShape {
  const { costEntries, lastCompletedChecklistItem, lastNote } = opts

  const cost =
    costEntries && costEntries.length > 0
      ? costEntries.reduce((sum, c) => sum + Number(c.amount ?? 0), 0)
      : null

  let recentActivity: RecentActivity | null = null
  if (lastCompletedChecklistItem) {
    recentActivity = {
      kind: 'checklist_done',
      author: lastCompletedChecklistItem.completer_name,
      text: lastCompletedChecklistItem.label,
    }
  } else if (lastNote) {
    recentActivity = {
      kind: 'note',
      author: lastNote.author,
      text: lastNote.note,
    }
  }

  return {
    title: issue.title,
    priority: issue.priority,
    status: issue.status,
    type: issue.type,
    property: issue.property?.name ?? 'Unknown',
    market: issue.property?.market ?? '',
    cost: cost != null ? Math.round(cost) : null,
    openedAt: issue.created_at,
    recentActivity,
    checkIn: issue.reservation?.check_in ?? null,
    checkOut: issue.reservation?.check_out ?? null,
    dueDate: issue.due_date ?? null,
    assignedCleaner: issue.assigned_cleaner ?? null,
  }
}

/**
 * Batch helper: builds a per-issue cost-total map from a flat cost_entries
 * list. Used at the list level so every card gets its aggregate without
 * re-scanning the full array.
 */
export function buildCostTotalsByIssue(
  costEntries: CostEntry[] | undefined
): Record<string, number> {
  if (!costEntries) return {}
  const map: Record<string, number> = {}
  for (const c of costEntries) {
    map[c.issue_id] = (map[c.issue_id] ?? 0) + Number(c.amount ?? 0)
  }
  return map
}
