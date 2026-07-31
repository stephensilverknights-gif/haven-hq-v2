import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { turnoverSupabase } from '@/lib/turnoverSupabase'

// On-demand engine refresh. Asks the burn-engine workflow to run now (via the
// /api/run-restock function), then polls the REAL published snapshot timestamp
// until it actually advances — so "Updated" is only ever shown once the data
// has genuinely changed, never as a decorative guess. A live elapsed counter
// and an up-front "up to a minute" expectation keep it honest.
export type RefreshStatus = 'idle' | 'starting' | 'running' | 'done' | 'error'

const POLL_MS = 5000
const TIMEOUT_MS = 180_000 // GitHub runner spin-up + run; ~60-90s is typical

async function latestSnapshotMs(): Promise<number> {
  if (!turnoverSupabase) return 0
  const { data } = await turnoverSupabase
    .from('restock_states')
    .select('generated_at')
    .order('generated_at', { ascending: false })
    .limit(1)
  const g = data?.[0]?.generated_at
  return g ? new Date(g).getTime() : 0
}

export function useRestockRefresh() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<RefreshStatus>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const startedAtRef = useRef(0)
  const cancelRef = useRef(false)
  const inFlightRef = useRef(false)

  useEffect(() => {
    // stop the poll loop if the page unmounts mid-run
    return () => {
      cancelRef.current = true
    }
  }, [])

  // live 1s elapsed counter while running
  useEffect(() => {
    if (status !== 'running') return
    const id = setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [status])

  const trigger = useCallback(async () => {
    if (inFlightRef.current) return // one refresh at a time
    inFlightRef.current = true
    cancelRef.current = false
    setErrorMsg(null)
    setElapsed(0)
    setStatus('starting')

    const baseline = await latestSnapshotMs()

    try {
      const resp = await fetch('/api/run-restock', { method: 'POST' })
      if (!resp.ok) {
        let msg = 'Refresh could not be started — the 7am/1pm runs still keep this current.'
        try {
          const j = await resp.json()
          if (j?.error === 'not_configured') {
            msg = "On-demand refresh isn't set up yet (missing GitHub token)."
          } else if (j?.message) {
            msg = j.message
          }
        } catch {
          /* keep default */
        }
        setStatus('error')
        setErrorMsg(msg)
        inFlightRef.current = false
        return
      }
    } catch {
      setStatus('error')
      setErrorMsg('Could not reach the refresh service. The scheduled runs still keep this current.')
      inFlightRef.current = false
      return
    }

    startedAtRef.current = Date.now()
    setStatus('running')

    // poll the real snapshot until it advances past the baseline
    while (!cancelRef.current) {
      await new Promise((r) => setTimeout(r, POLL_MS))
      if (cancelRef.current) break
      let latest = 0
      try {
        latest = await latestSnapshotMs()
      } catch {
        /* transient — keep polling */
      }
      if (latest > baseline) {
        setStatus('done')
        qc.invalidateQueries({ queryKey: ['restockStates'] })
        qc.invalidateQueries({ queryKey: ['restockDismissals'] })
        inFlightRef.current = false
        return
      }
      if (Date.now() - startedAtRef.current > TIMEOUT_MS) {
        setStatus('error')
        setErrorMsg(
          'Still working — GitHub can be slow to start. It will refresh automatically when the run finishes.'
        )
        inFlightRef.current = false
        return
      }
    }
    inFlightRef.current = false
  }, [qc])

  return { status, elapsed, errorMsg, trigger }
}
