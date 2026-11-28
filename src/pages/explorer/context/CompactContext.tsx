import { createContext, useContext } from 'react'

/** True when the editor is a side sheet (phone, narrow window) instead of docked. */
export const CompactContext = createContext(false)
export const useCompact = () => useContext(CompactContext)
