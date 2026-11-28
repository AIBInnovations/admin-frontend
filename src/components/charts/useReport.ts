import { useCallback, useEffect, useRef, useState } from 'react'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { apiErrorMessage } from '@/components/common/detail'

export interface ReportState<T> {
  data: T | null
  /** Nothing to show yet. */
  loading: boolean
  /** Old numbers on screen, newer ones on the way. */
  refreshing: boolean
  /**
   * The last refresh failed: `data` is from an earlier key (another range or
   * filter) and must be shown as such, dimmed, with the error and a retry.
   */
  stale: boolean
  error: string | null
  status: number | null
  reload: () => void
}

/**
 * Loads a report whenever `key` changes. The last good data stays on screen
 * while newer data loads or fails, and a late answer never replaces a newer
 * one. Pass null to load nothing.
 */
export function useReport<T>(key: string | null, load: () => Promise<T>): ReportState<T> {
  const { nextFetchId, isStale } = useLatestFetch()
  const [data, setData] = useState<T | null>(null)
  const [busy, setBusy] = useState(key !== null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [attempt, setAttempt] = useState(0)
  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    const id = nextFetchId() // also cancels whatever was on its way
    if (key === null) { setBusy(false); return }
    setBusy(true)
    loadRef.current()
      .then((d) => {
        if (isStale(id)) return
        setData(d); setError(null); setStatus(null); setBusy(false)
      })
      .catch((err) => {
        if (isStale(id)) return
        setError(apiErrorMessage(err, err instanceof Error && err.message ? err.message : undefined))
        setStatus((err as { response?: { status?: number }; status?: number })?.response?.status ?? (err as { status?: number })?.status ?? null)
        setBusy(false)
      })
  }, [key, attempt, nextFetchId, isStale])

  const reload = useCallback(() => setAttempt((a) => a + 1), [])
  return { data, loading: busy && !data, refreshing: busy && !!data, stale: !busy && !!error && !!data, error, status, reload }
}
