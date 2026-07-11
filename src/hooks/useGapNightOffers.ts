import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// One row per gap-night upsell opportunity the engine surfaced. Written by the
// Gap Night Opportunity Engine (haven-gap-night repo) into Supabase; read-only
// here. `sent` and `accepted` are crawl-derived ("yes"/""), not hand-entered.
export interface GapNightOffer {
  offer_id: string
  first_seen: string
  last_seen: string
  guest_name: string
  listing_name: string
  reservation_id: string
  direction: 'arrive_early' | 'extend'
  offered_night: string
  orig_arrival: string
  orig_departure: string
  discount_shown: string
  tier: string
  sent: string
  sent_date: string
  accepted: string
  accepted_date: string
  status: string
}

export function useGapNightOffers() {
  return useQuery({
    queryKey: ['gapNightOffers'],
    queryFn: async (): Promise<GapNightOffer[]> => {
      const { data, error } = await supabase
        .from('gap_night_offers')
        .select('*')
        .order('first_seen', { ascending: false })

      if (error) throw error
      return (data ?? []) as GapNightOffer[]
    },
  })
}
