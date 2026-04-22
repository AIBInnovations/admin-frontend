import { useEffect, useRef } from 'react'

/**
 * Resets the page to 1 when any of the watched values change — but skips the
 * initial render so that URL-provided `?page=N` values are respected on first
 * load. Without this skip, landing on /entities?page=3&search=foo would reset
 * to page 1 on mount.
 */
export function useResetPageOnChange(
  setCurrentPage: (page: number) => void,
  deps: unknown[],
) {
  const hasMountedRef = useRef(false)

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      return
    }
    setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
