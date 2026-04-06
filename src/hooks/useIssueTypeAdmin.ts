import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useCreateIssueType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; label: string; icon?: string; sort_order?: number }) => {
      const { error } = await supabase.from('issue_types').insert({
        id: input.id,
        label: input.label,
        icon: input.icon ?? 'Circle',
        sort_order: input.sort_order ?? 99,
        active: true,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issueTypes'] })
    },
  })
}

export function useUpdateIssueType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; label?: string; icon?: string; sort_order?: number; active?: boolean }) => {
      const { id, ...updates } = input
      const { error } = await supabase.from('issue_types').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issueTypes'] })
    },
  })
}

export function useDeleteIssueType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft-delete: set active = false
      const { error } = await supabase.from('issue_types').update({ active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issueTypes'] })
    },
  })
}
