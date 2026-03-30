import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { WorkflowTemplate, WorkflowTemplateStep } from '@/lib/types'

async function fetchTemplates(): Promise<WorkflowTemplate[]> {
  const { data, error } = await supabase
    .from('workflow_templates')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as WorkflowTemplate[]
}

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: ['workflowTemplates'],
    queryFn: fetchTemplates,
    retry: 3,
    retryDelay: 800,
  })
}

export function useCreateWorkflowTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      name,
      description,
      steps,
      createdBy,
    }: {
      name: string
      description?: string
      steps: WorkflowTemplateStep[]
      createdBy: string
    }) => {
      const { data, error } = await supabase
        .from('workflow_templates')
        .insert({ name, description: description || null, steps, created_by: createdBy })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflowTemplates'] }),
  })
}

export function useUpdateWorkflowTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      steps,
    }: {
      id: string
      name: string
      description?: string
      steps: WorkflowTemplateStep[]
    }) => {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ name, description: description || null, steps, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflowTemplates'] }),
  })
}

export function useDeleteWorkflowTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workflow_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflowTemplates'] }),
  })
}
