import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ChecklistItem, WorkflowTemplateStep } from '@/lib/types'

async function fetchChecklist(issueId: string): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('issue_checklist_items')
    .select(`*, completer:profiles!issue_checklist_items_completed_by_fkey(*)`)
    .eq('issue_id', issueId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data as ChecklistItem[]
}

export function useChecklist(issueId: string) {
  return useQuery({
    queryKey: ['checklist', issueId],
    queryFn: () => fetchChecklist(issueId),
    enabled: !!issueId,
  })
}

export function useToggleChecklistItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars: {
      itemId: string
      completed: boolean
      userId: string
      issueId: string
    }) => {
      const { error } = await supabase
        .from('issue_checklist_items')
        .update({
          completed: vars.completed,
          completed_by: vars.completed ? vars.userId : null,
          completed_at: vars.completed ? new Date().toISOString() : null,
        })
        .eq('id', vars.itemId)
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['checklist', vars.issueId] })
    },
  })
}

export function useApplyTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      issueId,
      steps,
    }: {
      issueId: string
      steps: WorkflowTemplateStep[]
    }) => {
      // Remove any existing checklist for this issue first
      await supabase.from('issue_checklist_items').delete().eq('issue_id', issueId)

      const items = steps.map((step) => ({
        issue_id: issueId,
        label: step.label,
        order_index: step.order,
      }))
      const { error } = await supabase.from('issue_checklist_items').insert(items)
      if (error) throw error
    },
    onSuccess: (_data, { issueId }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist', issueId] })
    },
  })
}
