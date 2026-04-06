import { useEffect, useRef } from 'react'
import { format, isPast, differenceInMinutes } from 'date-fns'
import { RefreshCw } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useReservations, useSyncReservations } from '@/hooks/useReservations'

interface ReservationPickerProps {
  propertyId: string | null
  value: string
  onChange: (reservationId: string) => void
}

export default function ReservationPicker({ propertyId, value, onChange }: ReservationPickerProps) {
  const { data: reservations, isLoading, isFetched } = useReservations(propertyId)
  const syncMutation = useSyncReservations()
  const autoSyncedRef = useRef<string | null>(null)

  // Auto-sync when picker opens for a property:
  // - If no reservations cached yet, or
  // - If the most recent sync is older than 5 minutes
  useEffect(() => {
    if (!propertyId || syncMutation.isPending || !isFetched) return
    if (autoSyncedRef.current === propertyId) return // already auto-synced this property

    const needsSync = !reservations || reservations.length === 0 ||
      (reservations[0]?.synced_at && differenceInMinutes(new Date(), new Date(reservations[0].synced_at)) > 5)

    if (needsSync) {
      autoSyncedRef.current = propertyId
      syncMutation.mutate(propertyId)
    }
  }, [propertyId, isFetched])

  if (!propertyId) return null

  const hasReservations = reservations && reservations.length > 0

  return (
    <div>
      <label className="text-sm font-medium text-text-primary mb-1.5 block">
        Reservation
        <span className="text-text-muted font-normal ml-1">(optional)</span>
      </label>
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={value} onValueChange={onChange} disabled={!hasReservations && !isLoading}>
            <SelectTrigger className="rounded-[8px] min-h-[44px]">
              <SelectValue placeholder={
                isLoading ? 'Loading…' :
                hasReservations ? 'Select reservation' :
                'No reservations found'
              } />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {reservations?.map((r) => {
                const checkIn = r.check_in ? new Date(r.check_in) : null
                const checkOut = r.check_out ? new Date(r.check_out) : null
                const isPastRes = checkOut ? isPast(checkOut) : false

                return (
                  <SelectItem key={r.id} value={r.id}>
                    <span className={isPastRes ? 'opacity-50' : ''}>
                      <span className="font-medium">{r.guest_name ?? 'Guest'}</span>
                      <span className="text-text-muted ml-1.5 text-[12px]">
                        {checkIn ? format(checkIn, 'MMM d') : '?'}
                        {' — '}
                        {checkOut ? format(checkOut, 'MMM d') : '?'}
                      </span>
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
        <button
          onClick={() => syncMutation.mutate(propertyId ?? undefined)}
          disabled={syncMutation.isPending || !propertyId}
          className="flex items-center justify-center w-[44px] h-[44px] rounded-[8px] border border-border hover:border-haven-indigo/50 hover:bg-haven-indigo/10 text-text-muted hover:text-haven-indigo transition-all shrink-0 disabled:opacity-40"
          title="Sync from Hostaway"
        >
          <RefreshCw
            size={16}
            strokeWidth={1.5}
            className={syncMutation.isPending ? 'animate-spin' : ''}
          />
        </button>
      </div>
    </div>
  )
}
