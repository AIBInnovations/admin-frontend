import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Form-state for a detail-panel editor with dirty tracking.
 *
 * - `buildInitial` produces the starting values; it is re-run whenever
 *   `resetKey` changes (e.g. the selected entity id), so switching entities
 *   while the panel stays open repopulates the fields.
 * - `dirty` compares current values against the committed baseline.
 * - On a successful save the caller calls `commit(next)` to rebaseline.
 */
export function usePanelForm<T extends object>(buildInitial: () => T, resetKey: string) {
  const buildRef = useRef(buildInitial)
  buildRef.current = buildInitial

  const [values, setValues] = useState<T>(() => buildInitial())
  const baseline = useRef<T>(values)

  useEffect(() => {
    const init = buildRef.current()
    baseline.current = init
    setValues(init)
  }, [resetKey])

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const patch = useCallback((partial: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...partial }))
  }, [])

  const reset = useCallback(() => setValues(baseline.current), [])

  const commit = useCallback((next: T) => {
    baseline.current = next
    setValues(next)
  }, [])

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(baseline.current),
    [values],
  )

  return { values, set, patch, setValues, reset, commit, dirty }
}
