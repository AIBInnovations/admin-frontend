import { useState, useCallback } from 'react'

export interface UseSelectionReturn {
  selected: Set<string>
  count: number
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  toggleAll: (ids: string[]) => void
  clear: () => void
}

export function useSelection(): UseSelectionReturn {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const allSelected = ids.every((id) => prev.has(id))
      if (allSelected) return new Set()
      return new Set(ids)
    })
  }, [])

  const clear = useCallback(() => setSelected(new Set()), [])

  return {
    selected,
    count: selected.size,
    isSelected: (id) => selected.has(id),
    toggle,
    toggleAll,
    clear,
  }
}
