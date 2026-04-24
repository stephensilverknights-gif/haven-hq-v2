import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Reservation } from '@/lib/types'

export function useReservations(propertyId: string | null) {
  return useQuery({
    queryKey: ['reservations', propertyId],
    queryFn: async (): Promise<Reservation[]> => {
      const lookback = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('property_id', propertyId!)
        .or(`check_in.gte.${lookback},check_out.gte.${lookback}`)
        .order('check_in', { ascending: true })

      if (error) throw error
      return data as Reservation[]
    },
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSyncReservations() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (propertyId?: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hostaway-reservations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(propertyId ? { property_id: propertyId } : {}),
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to sync reservations')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
    },
  })
}
