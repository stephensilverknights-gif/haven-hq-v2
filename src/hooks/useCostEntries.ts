import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CostEntry, Reimbursable } from '@/lib/types'

async function fetchCostEntries(issueId: string): Promise<CostEntry[]> {
  const { data, error } = await supabase
    .from('cost_entries')
    .select(`
      *,
      logger:profiles!cost_entries_logged_by_fkey(*)
    `)
    .eq('issue_id', issueId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as CostEntry[]
}

export function useCostEntries(issueId: string | null) {
  return useQuery({
    queryKey: ['costEntries', issueId],
    queryFn: () => fetchCostEntries(issueId!),
    enabled: !!issueId,
  })
}

export function useAllCostEntries() {
  return useQuery({
    queryKey: ['allCostEntries'],
    queryFn: async (): Promise<CostEntry[]> => {
      const { data, error } = await supabase
        .from('cost_entries')
        .select(`
          *,
          logger:profiles!cost_entries_logged_by_fkey(*),
          issue:issues!cost_entries_issue_id_fkey(
            *,
            property:properties(*)
          )
        `)
        .order('date', { ascending: false })

      if (error) throw error
      return data as CostEntry[]
    },
  })
}

export function useAddCostEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      issue_id: string
      logged_by: string
      amount: number
      vendor_name?: string
      description: string
      receipt_url?: string
      reimbursable: Reimbursable
      reimbursable_from?: string
    }) => {
      const { error } = await supabase
        .from('cost_entries')
        .insert(input)

      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['costEntries', variables.issue_id] })
      queryClient.invalidateQueries({ queryKey: ['allCostEntries'] })
    },
  })
}
