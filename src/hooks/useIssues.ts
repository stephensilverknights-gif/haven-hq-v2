import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Issue, IssueType, Priority, IssueStatus } from '@/lib/types'

interface CreateIssueInput {
  property_id: string
  title: string
  description?: string
  type: IssueType
  priority: Priority
  initial_note: string
  created_by: string
}

async function fetchIssues(): Promise<Issue[]> {
  const { data, error } = await supabase
    .from('issues')
    .select(`
      *,
      property:properties(*),
      creator:profiles!issues_created_by_fkey(*),
      updater:profiles!issues_updated_by_fkey(*)
    `)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as Issue[]
}

// Fetches all activity log entries at once — no dependency on issueIds, fires in parallel
async function fetchLastNotes(): Promise<Record<string, { note: string; author: string }>> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('issue_id, note, user:profiles!activity_log_user_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) throw error

  const noteMap: Record<string, { note: string; author: string }> = {}
  for (const entry of data ?? []) {
    if (!noteMap[entry.issue_id]) {
      // Supabase returns joined rows as array; grab first element
      const userRow = Array.isArray(entry.user) ? entry.user[0] : entry.user
      noteMap[entry.issue_id] = {
        note: entry.note as string,
        author: (userRow as { name?: string } | null)?.name ?? '',
      }
    }
  }
  return noteMap
}

export function useIssues() {
  const queryClient = useQueryClient()

  const issuesQuery = useQuery({
    queryKey: ['issues'],
    queryFn: fetchIssues,
    retry: 3,
    retryDelay: 800,
  })

  // Stable query key — fires in parallel with issues, not after them
  const lastNotesQuery = useQuery({
    queryKey: ['lastNotes'],
    queryFn: fetchLastNotes,
  })

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('issues-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => {
        queryClient.invalidateQueries({ queryKey: ['issues'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, () => {
        queryClient.invalidateQueries({ queryKey: ['lastNotes'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  const issues = issuesQuery.data ?? []

  const priorityOrder: Record<Priority, number> = { on_fire: 0, urgent: 1, watch: 2 }

  const sortedIssues = [...issues]
    .filter(i => i.status !== 'resolved')
    .sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (pDiff !== 0) return pDiff
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

  const counts = {
    on_fire: issues.filter(i => i.priority === 'on_fire' && i.status !== 'resolved').length,
    urgent: issues.filter(i => i.priority === 'urgent' && i.status !== 'resolved').length,
    watch: issues.filter(i => i.priority === 'watch' && i.status !== 'resolved').length,
  }

  return {
    issues: sortedIssues,
    allIssues: issues,
    lastNotes: lastNotesQuery.data ?? {} as Record<string, { note: string; author: string }>,
    counts,
    isLoading: issuesQuery.isLoading,
    error: issuesQuery.error,
  }
}

export function useCreateIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateIssueInput) => {
      // Create the issue
      const { data: issue, error: issueError } = await supabase
        .from('issues')
        .insert({
          property_id: input.property_id,
          title: input.title,
          description: input.description || null,
          type: input.type,
          priority: input.priority,
          status: 'in_progress',
          created_by: input.created_by,
        })
        .select()
        .single()

      if (issueError) throw issueError

      // Create the first activity log entry
      const { error: logError } = await supabase
        .from('activity_log')
        .insert({
          issue_id: issue.id,
          user_id: input.created_by,
          note: input.initial_note,
          status_to: 'in_progress',
        })

      if (logError) throw logError

      return issue
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['lastNotes'] })
    },
  })
}

export function useUpdateIssuePriority() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      issueId,
      priority,
      userId,
    }: {
      issueId: string
      priority: Priority
      userId: string
    }) => {
      const { error } = await supabase
        .from('issues')
        .update({
          priority,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', issueId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
    },
  })
}

export function useUpdateIssueStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      issueId,
      status,
      note,
      userId,
      previousStatus,
    }: {
      issueId: string
      status: IssueStatus
      note: string
      userId: string
      previousStatus: string
    }) => {
      const updates: Record<string, unknown> = {
        status,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      }
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('issues')
        .update(updates)
        .eq('id', issueId)

      if (updateError) throw updateError

      const { error: logError } = await supabase
        .from('activity_log')
        .insert({
          issue_id: issueId,
          user_id: userId,
          note,
          status_from: previousStatus,
          status_to: status,
        })

      if (logError) throw logError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      queryClient.invalidateQueries({ queryKey: ['lastNotes'] })
      queryClient.invalidateQueries({ queryKey: ['activityLog'] })
    },
  })
}
