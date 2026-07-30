import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { turnoverSupabase } from '@/lib/turnoverSupabase'

// Manual VA overrides recorded from the Restock panel, stored in the turnover
// project's restock_dismissals table (see supabase/003_restock_dismissals.sql).
// The burn engine reads these on each run and reclassifies the row (ordered ->
// in transit, delivered -> resolved). We ALSO read them here so a dismissal
// takes effect on the panel immediately, instead of waiting up to ~12h for the
// next engine run to regenerate the snapshot — and survives a page reload.
export type DismissAction = 'ordered' | 'delivered'

export interface RestockDismissal {
  unit: string
  item: string
  action: DismissAction
  dismissed_at: string
}

export function useRestockDismissals() {
  return useQuery({
    queryKey: ['restockDismissals'],
    queryFn: async (): Promise<RestockDismissal[]> => {
      if (!turnoverSupabase) return []
      const { data, error } = await turnoverSupabase
        .from('restock_dismissals')
        .select('unit,item,action,dismissed_at')
        .order('dismissed_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as RestockDismissal[]
    },
    staleTime: 60 * 1000,
  })
}

export function useDismissRestock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { unit: string; item: string; action: DismissAction }) => {
      if (!turnoverSupabase) {
        throw new Error('Turnover Supabase connection not configured')
      }
      const { error } = await turnoverSupabase
        .from('restock_dismissals')
        .insert({ unit: vars.unit, item: vars.item, action: vars.action })
      if (error) throw error
    },
    // refetch dismissals so the row drops off Order-now right away
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restockDismissals'] }),
  })
}

// A dismissal "covers" a row when it was recorded on or after the row's current
// flag date. A newer flag (after the dismissal) is NOT covered, so the row
// correctly reappears — mirroring the engine's reopen rule.
export function isRowDismissed(
  row: { unit: string; item: string; last_flag: string | null },
  dismissals: RestockDismissal[]
): boolean {
  if (!row.last_flag) return false
  const flagTime = new Date(`${row.last_flag}T00:00:00`).getTime()
  return dismissals.some(
    (d) =>
      d.unit === row.unit &&
      d.item === row.item &&
      new Date(d.dismissed_at).getTime() >= flagTime
  )
}
