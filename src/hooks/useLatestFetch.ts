import { useRef, useCallback, useEffect } from 'react'

/**
 * Prevents stale server responses from overwriting fresher state. Every call
 * receives a unique request id; the returned `isStale(id)` tells a fetch
 * handler whether its response should be applied or discarded.
 *
 * This fixes two race conditions surfaced by server-side search:
 *   1. Typing "abc" then "abcd" — the "abc" response may return AFTER "abcd"
 *      and overwrite fresh results with stale ones.
 *   2. Changing a filter while on page > 1 — the page-reset effect triggers
 *      a second fetch; whichever response returns last "wins", which may be
 *      the stale one.
 *
 * Also guards against setState-after-unmount: the ref is invalidated on
 * unmount so post-unmount responses are treated as stale.
 */
export function useLatestFetch() {
  const fetchIdRef = useRef(0)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const nextFetchId = useCallback(() => ++fetchIdRef.current, [])

  const isStale = useCallback(
    (id: number) => id !== fetchIdRef.current || !isMountedRef.current,
    [],
  )

  return { nextFetchId, isStale }
}
