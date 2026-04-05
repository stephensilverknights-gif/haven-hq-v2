import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface LastCompletedChecklistItem {
  issue_id: string
  label: string
  completed_at: string
  completer_name: string
}

/**
 * Fetches the most recent completed checklist item per issue in a single query.
 * Returns a map keyed by issue_id for O(1) lookup on the issues list.
 *
 * Used by IssueCardV2 to show "Hannah: ✓ Drained pump" in the activity row when
 * a checklist exists and has at least one completed item. Falls back to the
 * activity_log note via `useIssues().lastNotes` when no checklist item is done.
 */
async function fetchLastCompletedChecklistItems(): Promise<
  Record<string, LastCompletedChecklistItem>
> {
  const { data, error } = await supabase
    .from('issue_checklist_items')
    .select(
      `issue_id, label, completed_at,
       completer:profiles!issue_checklist_items_completed_by_fkey(name)`
    )
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(2000)

  if (error) throw error

  // First-seen wins (already ordered desc by completed_at), so each issue_id
  // captures only its most-recently-completed item.
  const map: Record<string, LastCompletedChecklistItem> = {}
  for (const row of data ?? []) {
    if (map[row.issue_id]) continue
    const completer = row.completer as { name?: string } | { name: string }[] | null
    const completerName = Array.isArray(completer)
      ? completer[0]?.name
      : completer?.name
    map[row.issue_id] = {
      issue_id: row.issue_id,
      label: row.label,
      completed_at: row.completed_at,
      completer_name: completerName ?? 'Someone',
    }
  }
  return map
}

export function useLastCompletedChecklist() {
  return useQuery({
    queryKey: ['lastCompletedChecklist'],
    queryFn: fetchLastCompletedChecklistItems,
  })
}
