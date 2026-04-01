import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Market {
  id: string
  name: string
  created_at: string
}

async function fetchMarkets(): Promise<Market[]> {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .order('name')
  if (error) throw error
  return data as Market[]
}

export function useMarkets() {
  return useQuery({
    queryKey: ['markets'],
    queryFn: fetchMarkets,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateMarket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('markets').insert({ name })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['markets'] }),
  })
}

export function useDeleteMarket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('markets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['markets'] }),
  })
}
