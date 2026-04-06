import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { IssueTypeRecord } from '@/lib/types'
import { ISSUE_TYPE_LABELS } from '@/lib/types'

async function fetchIssueTypes(): Promise<IssueTypeRecord[]> {
  const { data, error } = await supabase
    .from('issue_types')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data as IssueTypeRecord[]
}

export function useIssueTypes() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['issueTypes'],
    queryFn: fetchIssueTypes,
    staleTime: 5 * 60 * 1000,
  })

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('issue-types-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issue_types' }, () => {
        queryClient.invalidateQueries({ queryKey: ['issueTypes'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  // Build labels map: dynamic from DB, falling back to static for loading state
  const labels: Record<string, string> = { ...ISSUE_TYPE_LABELS }
  if (query.data) {
    for (const t of query.data) {
      labels[t.id] = t.label
    }
  }

  return {
    ...query,
    types: query.data ?? [],
    labels,
  }
}
