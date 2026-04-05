import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ProfileEmail {
  id: string
  email: string
  created_at: string
}

/**
 * Calls the admin_get_profile_emails() RPC — returns a map of profile_id → email.
 * Admin-only on the server side. Returns null for non-admins (RPC throws, caught here).
 */
async function fetchProfileEmails(): Promise<Record<string, string>> {
  const { data, error } = await supabase.rpc('admin_get_profile_emails')
  if (error) throw error
  const map: Record<string, string> = {}
  for (const row of (data ?? []) as ProfileEmail[]) {
    map[row.id] = row.email
  }
  return map
}

export function useProfileEmails(enabled: boolean = true) {
  return useQuery({
    queryKey: ['profileEmails'],
    queryFn: fetchProfileEmails,
    enabled,
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await supabase.rpc('admin_delete_user', {
        target_id: targetId,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProfiles'] })
      queryClient.invalidateQueries({ queryKey: ['teamProfiles'] })
      queryClient.invalidateQueries({ queryKey: ['profileEmails'] })
    },
  })
}
