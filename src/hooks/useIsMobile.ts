import { useState, useEffect } from 'react'

// Returns true when viewport width is below the Tailwind `sm` breakpoint (640px).
// Fires synchronously on first render using matchMedia so there's no layout flash.

export function useIsMobile(): boolean {
  const query = '(max-width: 639px)'

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isMobile
}
