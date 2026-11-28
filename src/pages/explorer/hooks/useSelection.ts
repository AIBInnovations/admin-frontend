import { useCallback, useMemo, useState } from 'react'

export interface UseSelectionReturn {
  count: number
  ids: string[]
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  toggleAll: (ids: string[]) => void
  clear: () => void
  /** Keep only these selected (the ones that failed, after a bulk action). */
  replace: (ids: string[]) => void
}

/** Multi-select over the rows that exist now; rows that left the list are dropped. */
export function useSelection(available: { _id: string }[]): UseSelectionReturn {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const ids = useMemo(() => available.filter((x) => selected.has(x._id)).map((x) => x._id), [available, selected])

  const toggle = useCallback((id: string) => setSelected((prev) => {
    const next = new Set(prev)
    if (!next.delete(id)) next.add(id)
    return next
  }), [])
  const toggleAll = useCallback((all: string[]) => setSelected((prev) => {
    const next = new Set(prev)
    const every = all.every((id) => prev.has(id))
    all.forEach((id) => (every ? next.delete(id) : next.add(id)))
    return next
  }), [])
  const clear = useCallback(() => setSelected(new Set()), [])
  const replace = useCallback((next: string[]) => setSelected(new Set(next)), [])

  return { count: ids.length, ids, isSelected: (id) => selected.has(id), toggle, toggleAll, clear, replace }
}
