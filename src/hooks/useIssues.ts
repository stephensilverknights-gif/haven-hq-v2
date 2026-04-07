import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Issue, Priority, IssueStatus } from '@/lib/types'

interface CreateIssueInput {
  property_id: string
  title: string
  description?: string
  type: string
  priority: Priority
  initial_note: string
  created_by: string
  reservation_id?: string
  due_date?: string
  assigned_cleaner?: string
}

async function fetchIssues(): Promise<Issue[]> {
  const { data, error } = await supabase
    .from('issues')
    .select(`
      *,
      property:properties(*),
      creator:profiles!issues_created_by_fkey(*),
      updater:profiles!issues_updated_by_fkey(*),
      reservation:reservations(*)
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
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
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
          reservation_id: input.reservation_id || null,
          due_date: input.due_date || null,
          assigned_cleaner: input.assigned_cleaner || null,
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

export function useUpdateIssueTitle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ issueId, title, userId }: { issueId: string; title: string; userId: string }) => {
      const { error } = await supabase
        .from('issues')
        .update({ title, updated_by: userId, updated_at: new Date().toISOString() })
        .eq('id', issueId)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['issues'] }) },
  })
}

export function useUpdateIssueProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ issueId, propertyId, userId }: { issueId: string; propertyId: string; userId: string }) => {
      const { error } = await supabase
        .from('issues')
        .update({ property_id: propertyId, updated_by: userId, updated_at: new Date().toISOString() })
        .eq('id', issueId)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['issues'] }) },
  })
}

export function useUpdateIssueReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ issueId, reservationId, userId }: { issueId: string; reservationId: string | null; userId: string }) => {
      const { error } = await supabase
        .from('issues')
        .update({ reservation_id: reservationId, updated_by: userId, updated_at: new Date().toISOString() })
        .eq('id', issueId)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['issues'] }) },
  })
}

export function useUpdateIssueDueDate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ issueId, dueDate, userId }: { issueId: string; dueDate: string | null; userId: string }) => {
      const { error } = await supabase
        .from('issues')
        .update({ due_date: dueDate, updated_by: userId, updated_at: new Date().toISOString() })
        .eq('id', issueId)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['issues'] }) },
  })
}

export function useUpdateIssueCleaner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ issueId, cleaner, userId }: { issueId: string; cleaner: string | null; userId: string }) => {
      const { error } = await supabase
        .from('issues')
        .update({ assigned_cleaner: cleaner, updated_by: userId, updated_at: new Date().toISOString() })
        .eq('id', issueId)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['issues'] }) },
  })
}

export function useReorderIssues() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      for (const { id, sort_order } of updates) {
        const { error } = await supabase
          .from('issues')
          .update({ sort_order })
          .eq('id', id)
        if (error) throw error
      }
    },
    // Optimistic update: apply new sort_order to cache immediately
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['issues'] })
      const previous = queryClient.getQueryData<Issue[]>(['issues'])

      if (previous) {
        const orderMap = new Map(updates.map(u => [u.id, u.sort_order]))
        queryClient.setQueryData<Issue[]>(['issues'], (old) =>
          old?.map(issue => {
            const newOrder = orderMap.get(issue.id)
            return newOrder !== undefined ? { ...issue, sort_order: newOrder } : issue
          }) ?? []
        )
      }

      return { previous }
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['issues'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
    },
  })
}
