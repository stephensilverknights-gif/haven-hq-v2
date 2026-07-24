import { useQuery } from '@tanstack/react-query'
import { turnoverSupabase } from '@/lib/turnoverSupabase'

// One row per unit x item with its restock-cycle state. Written daily by the
// burn engine (haven-turnover/haven-burn-engine/run_digest.py) as a full
// snapshot sharing one generated_at; read-only here.
//
// States: OPEN (flagged, nothing ordered) / RE_OPENED (flagged again after the
// restock window — order didn't stick) / IN_TRANSIT (ordered, suppression
// window active: do NOT reorder) / PREDICTED_LOW (model estimate, no cleaner
// flag yet) / RESOLVED.
export interface RestockState {
  id: number
  unit: string
  item: string
  state: 'OPEN' | 'RE_OPENED' | 'IN_TRANSIT' | 'PREDICTED_LOW' | 'RESOLVED'
  severity: 'low' | 'empty' | null
  last_flag: string | null
  flags_in_episode: number | null
  last_order: string | null
  room_by: string | null
  days_since_flag: number | null
  est_stock: number | null
  threshold: number | null
  note: string | null
  generated_at: string
}

export function useRestockStates() {
  return useQuery({
    queryKey: ['restockStates'],
    queryFn: async (): Promise<RestockState[]> => {
      if (!turnoverSupabase) {
        throw new Error(
          'Turnover Supabase connection not configured (VITE_TURNOVER_SUPABASE_*)'
        )
      }
      const { data, error } = await turnoverSupabase
        .from('restock_states')
        .select('*')
        .order('unit', { ascending: true })

      if (error) throw error
      return (data ?? []) as RestockState[]
    },
    // the snapshot changes once a day — no need to hammer it
    staleTime: 5 * 60 * 1000,
  })
}
