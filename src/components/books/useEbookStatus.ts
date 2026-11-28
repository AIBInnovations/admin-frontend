import { useCallback, useEffect, useRef, useState } from 'react'
import { booksService, type EbookStatus } from '@/services/books.service'
import { errorText, isJobActive } from './bookDisplay'

const POLL_MS = 2500

/**
 * The live file, its checks and the latest upload. While an upload is being
 * checked or converted it asks again every few seconds; it stops when the job
 * ends and when the component goes away.
 */
export function useEbookStatus(bookId: string | null, onFinished?: (status: EbookStatus) => void) {
  const [status, setStatus] = useState<EbookStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const alive = useRef(true)
  const request = useRef(0)
  const wasActive = useRef(false)
  const finished = useRef(onFinished)
  finished.current = onFinished

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const accept = useCallback((next: EbookStatus) => {
    if (!alive.current) return
    request.current += 1 // an older answer still on its way must not overwrite this one
    setStatus((prev) => ({ ...prev, ...next }))
    setError(null)
    const active = isJobActive(next.job)
    if (wasActive.current && !active && next.job) finished.current?.(next)
    wasActive.current = active
  }, [])

  const load = useCallback(async () => {
    if (!bookId) return
    const mine = ++request.current
    try {
      const res = await booksService.getEbookStatus(bookId)
      if (!alive.current || mine !== request.current) return
      if (res.success && res.data) accept(res.data)
    } catch (err) {
      if (!alive.current || mine !== request.current) return
      setError(errorText(err, 'The file details could not be loaded.'))
    }
  }, [bookId, accept])

  useEffect(() => {
    setStatus(null)
    wasActive.current = false
    void load()
  }, [load])

  const active = isJobActive(status?.job)
  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => { if (!document.hidden) void load() }, POLL_MS)
    return () => clearInterval(timer)
  }, [active, load])

  return { status, error, reload: load, accept, active }
}
