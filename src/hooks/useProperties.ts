import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Property } from '@/lib/types'

// ── Active properties only (used everywhere in the app) ───────────────────────

async function fetchProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('active', true)
    .order('market')
    .order('name')
  if (error) throw error
  return data as Property[]
}

export function useProperties() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
    staleTime: 1000 * 60 * 5,
  })
}

// ── All properties including inactive (Settings only) ─────────────────────────

async function fetchAllProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('market')
    .order('name')
  if (error) throw error
  return data as Property[]
}

export function useAllProperties() {
  return useQuery({
    queryKey: ['allProperties'],
    queryFn: fetchAllProperties,
    staleTime: 1000 * 60 * 2,
    retry: 3,
    retryDelay: 800,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['properties'] })
  queryClient.invalidateQueries({ queryKey: ['allProperties'] })
}

export function useCreateProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { name: string; market: string; color_tag: string }) => {
      const { error } = await supabase.from('properties').insert({
        name: vars.name,
        market: vars.market,
        color_tag: vars.color_tag,
        active: true,
      })
      if (error) throw error
    },
    onSuccess: () => invalidate(queryClient),
  })
}

export function useUpdateProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { id: string; name: string; market: string; color_tag: string }) => {
      const { error } = await supabase
        .from('properties')
        .update({ name: vars.name, market: vars.market, color_tag: vars.color_tag })
        .eq('id', vars.id)
      if (error) throw error
    },
    onSuccess: () => invalidate(queryClient),
  })
}

export function useTogglePropertyActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (vars: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('properties')
        .update({ active: vars.active })
        .eq('id', vars.id)
      if (error) throw error
    },
    onSuccess: () => invalidate(queryClient),
  })
}
