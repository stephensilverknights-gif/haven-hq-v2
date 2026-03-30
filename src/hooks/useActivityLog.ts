import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ActivityLogEntry } from '@/lib/types'

async function fetchActivityLog(issueId: string): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select(`
      *,
      user:profiles!activity_log_user_id_fkey(*)
    `)
    .eq('issue_id', issueId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as ActivityLogEntry[]
}

export function useActivityLog(issueId: string | null) {
  return useQuery({
    queryKey: ['activityLog', issueId],
    queryFn: () => fetchActivityLog(issueId!),
    enabled: !!issueId,
  })
}

export function useAddNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      issueId,
      userId,
      note,
    }: {
      issueId: string
      userId: string
      note: string
    }) => {
      const { error } = await supabase
        .from('activity_log')
        .insert({
          issue_id: issueId,
          user_id: userId,
          note,
        })

      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activityLog', variables.issueId] })
      queryClient.invalidateQueries({ queryKey: ['lastNotes'] })
    },
  })
}
