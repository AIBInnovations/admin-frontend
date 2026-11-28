import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import type { ExplorerData } from '../hooks/useExplorerData'
import { EXPLORER_BASE, type ExplorerFocus } from '../parseExplorerPath'
import { targetKey, type CreateKind, type PanelEntityKind, type PanelTarget } from '../panel/panelTypes'
import { resolveTarget } from './resolveTarget'

/** What an open form tells the page about itself. */
export interface EditorHandle {
  /** Names the thing in the "Save or discard" question. */
  label: string
  dirty: boolean
  saving: boolean
  save: () => Promise<boolean>
  reset: () => void
}

interface PanelSelectionValue {
  target: PanelTarget | null
  /** Picked by the admin, not just the open folder's own details. */
  manual: boolean
  waiting: boolean
  isSelected: (kind: PanelEntityKind, id: string) => boolean
  select: (kind: PanelEntityKind, id: string) => void
  create: (kind: CreateKind) => void
  /** Close the editor (back to the folder's own details). */
  clear: () => void
  /** Go to another folder, asking first when there are unsaved edits. */
  go: (url: string) => void

  register: (handle: EditorHandle | null) => void
  handle: EditorHandle | null
  /** Something is waiting for the admin to save or discard. */
  asking: boolean
  answer: (choice: 'save' | 'discard' | 'keep') => Promise<void>
}

const PanelSelectionContext = createContext<PanelSelectionValue | null>(null)

interface ProviderProps { focus: ExplorerFocus; data: ExplorerData; children: ReactNode }

export function PanelSelectionProvider({ focus, data, children }: ProviderProps) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [handle, setHandle] = useState<EditorHandle | null>(null)
  const dirty = !!handle && (handle.dirty || handle.saving)
  useUnsavedChanges(dirty)

  const wanted = useMemo(() => resolveTarget(focus, data, params), [focus, data, params])
  const wantedKey = targetKey(wanted.target)

  // With unsaved edits the editor stays where it is, whatever the URL asks
  // for, until the admin saves or discards.
  const shown = useRef<{ target: PanelTarget | null; manual: boolean }>({ target: null, manual: false })
  // Closing counts as a switch too: on a phone the sheet would take the form with it.
  const held = !!handle?.dirty && (targetKey(shown.current.target) !== wantedKey || (shown.current.manual && !wanted.manual))
  const target = held ? shown.current.target : wanted.target
  const manual = held ? shown.current.manual : wanted.manual
  useEffect(() => { if (!held) shown.current = { target, manual } })

  const [pendingUrl, setPendingUrl] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  // Saved or discarded: now the move can happen.
  useEffect(() => {
    if (!leaving || dirty || !pendingUrl) return
    setLeaving(false)
    setPendingUrl(null)
    navigate(pendingUrl)
  }, [leaving, dirty, pendingUrl, navigate])

  const setItem = useCallback((next: { item?: string; create?: string } | null, replace: boolean) => {
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      p.delete('item')
      p.delete('new')
      if (next?.item) p.set('item', next.item)
      if (next?.create) p.set('new', next.create)
      return p
    }, { replace, preventScrollReset: true })
  }, [setParams])

  const hasItem = params.has('item') || params.has('new')
  const select = useCallback((kind: PanelEntityKind, id: string) => setItem({ item: `${kind}:${id}` }, hasItem), [setItem, hasItem])
  const create = useCallback((kind: CreateKind) => setItem({ create: kind }, hasItem), [setItem, hasItem])
  const go = useCallback((url: string) => {
    if (handle?.dirty) setPendingUrl(url)
    else navigate(url)
  }, [handle?.dirty, navigate])

  const onBook = focus.level === 'book' && !hasItem
  const clear = useCallback(() => { if (onBook) go(`${EXPLORER_BASE}/books`); else setItem(null, true) }, [onBook, go, setItem])

  // The URL points at something that was archived, moved or deleted.
  useEffect(() => {
    if (!wanted.lost || held) return
    toast.info('That item is no longer here.')
    clear()
  }, [wanted.lost, held, clear])

  const answer = useCallback(async (choice: 'save' | 'discard' | 'keep') => {
    if (!handle) return
    if (choice === 'keep') {
      setPendingUrl(null)
      const key = targetKey(shown.current.target)
      if (held) {
        const back = !shown.current.manual || !key ? null : key.startsWith('new:') ? { create: key.slice(4) } : { item: key }
        setItem(back, true)
      }
      return
    }
    if (choice === 'save') {
      if (!(await handle.save())) return
    } else {
      handle.reset()
    }
    if (pendingUrl) setLeaving(true)
  }, [handle, held, pendingUrl, setItem])

  const isSelected = useCallback((kind: PanelEntityKind, id: string) => manual && target?.kind === kind && target.id === id, [manual, target])

  const value = useMemo<PanelSelectionValue>(() => ({
    target, manual, waiting: wanted.waiting && !held, isSelected, select, create, clear, go,
    register: setHandle, handle, asking: held || (!!pendingUrl && !!handle?.dirty), answer,
  }), [target, manual, wanted.waiting, held, isSelected, select, create, clear, go, handle, pendingUrl, answer])

  return <PanelSelectionContext.Provider value={value}>{children}</PanelSelectionContext.Provider>
}

export function usePanelSelection(): PanelSelectionValue {
  const ctx = useContext(PanelSelectionContext)
  if (!ctx) throw new Error('usePanelSelection must be used within PanelSelectionProvider')
  return ctx
}
