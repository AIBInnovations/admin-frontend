import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { PanelTarget } from '../panel/panelTypes'

interface PanelSelectionValue {
  /** Effective target shown in the panel: the manual pick, or the focus default. */
  target: PanelTarget | null
  /** Open the panel on a specific target (a manual selection). */
  select: (target: PanelTarget) => void
  /** Set the default target for the current focus node (used when nothing is picked). */
  setFocusDefault: (target: PanelTarget | null) => void
  /** Drop the manual selection — the panel reverts to the focus default. */
  clear: () => void
}

const PanelSelectionContext = createContext<PanelSelectionValue | null>(null)

export function PanelSelectionProvider({ children }: { children: ReactNode }) {
  const [manualTarget, setManualTarget] = useState<PanelTarget | null>(null)
  const [focusDefault, setFocusDefaultState] = useState<PanelTarget | null>(null)

  const select = useCallback((next: PanelTarget) => setManualTarget(next), [])
  const setFocusDefault = useCallback((next: PanelTarget | null) => setFocusDefaultState(next), [])
  const clear = useCallback(() => setManualTarget(null), [])

  const value = useMemo<PanelSelectionValue>(
    () => ({ target: manualTarget ?? focusDefault, select, setFocusDefault, clear }),
    [manualTarget, focusDefault, select, setFocusDefault, clear],
  )

  return <PanelSelectionContext.Provider value={value}>{children}</PanelSelectionContext.Provider>
}

export function usePanelSelection(): PanelSelectionValue {
  const ctx = useContext(PanelSelectionContext)
  if (!ctx) throw new Error('usePanelSelection must be used within PanelSelectionProvider')
  return ctx
}
