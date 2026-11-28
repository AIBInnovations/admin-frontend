import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ContentMovePicker, type PickItem } from '@/components/modules/ContentMovePicker'
import type { MoveKind, MoveResult } from '@/services/contentMove.service'
import type { EntityType } from '@/services/publish.service'
import { EXPLORER_BASE, parseExplorerPath } from '../parseExplorerPath'
import { loadPackage } from '../hooks/useExplorerData'
import { following } from '../following'
import type { PanelEntityKind } from '../panel/panelTypes'
import { usePanelSelection } from '../context/PanelSelectionContext'
import type { BulkClassification } from '../dialogs/bulkImpact'
import { ArchiveWithImpactDialog } from '../dialogs/ArchiveWithImpactDialog'
import { BulkImpactDialog } from '../dialogs/BulkImpactDialog'
import { DeleteSubjectDialog } from '../dialogs/DeleteSubjectDialog'
import { KeyboardHelpDialog } from '../components/popovers/KeyboardHelpDialog'
import { MoveDocumentDialog } from '../dialogs/MoveDocumentDialog'
import { PublishDialog } from '../dialogs/PublishDialog'
import { RawJsonDrawer } from '../components/popovers/RawJsonDrawer'
import { CreateDocumentDialog } from '../forms/CreateDocumentDialog'
import { CreateVideoDialog } from '../forms/CreateVideoDialog'

export interface BulkItem { id: string; name: string }

export interface BulkRequest {
  title: string
  actionLabel: string
  doneLabel: string
  destructive?: boolean
  items: BulkItem[]
  /** Per-item check before running. Left out when there is nothing to warn about. */
  classify?: (id: string) => Promise<BulkClassification>
  runOne: (id: string) => Promise<unknown>
  /** Ids that did not work stay selected. */
  onDone: (failedIds: string[]) => void
}

export interface DocumentPlace {
  subjectId?: string
  seriesId?: string
  seriesName?: string
  packageOptions?: { _id: string; name: string }[]
}

export type ExplorerRequest =
  | { type: 'publish'; entityType: EntityType; kind: PanelEntityKind; id: string; name: string; status: 'draft' | 'published' }
  | { type: 'archive'; kind: 'video' | 'document'; id: string; name: string }
  | { type: 'move'; id: string; name: string }
  | { type: 'deleteSubject'; id: string; name: string }
  | { type: 'json'; name: string; data: unknown }
  | { type: 'bulk'; request: BulkRequest }
  | { type: 'shortcuts' }
  | { type: 'uploadVideo'; moduleId: string }
  | { type: 'newDocument'; place: DocumentPlace }
  /** Move or copy videos, move modules or series (the full-page picker). */
  | { type: 'moveContent'; kind: MoveKind; items: PickItem[]; onDone?: () => void }

interface ActionsValue { open: (request: ExplorerRequest) => void }

const ActionsContext = createContext<ActionsValue | null>(null)

export function useActions(): ActionsValue {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error('useActions must be used within ActionsProvider')
  return ctx
}

/**
 * Everything that needs a question or a form of its own. One of each for the
 * whole page: a 200-row list does not carry hundreds of closed dialogs.
 */
export function ActionsProvider({ refresh, children }: { refresh: () => Promise<void>; children: ReactNode }) {
  const [request, setRequest] = useState<ExplorerRequest | null>(null)
  const open = useCallback((r: ExplorerRequest) => setRequest(r), [])
  const close = useCallback(() => setRequest(null), [])
  const value = useMemo(() => ({ open }), [open])
  const { isSelected, clear } = usePanelSelection()
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()
  // Where to go once the picker is closed. Not at once: while a full-page form is open
  // the address carries an extra "#edit" entry that is taken off (history back) when it
  // closes, and that would undo a navigation made in the same moment.
  const follow = useRef<string | null>(null)
  useEffect(() => {
    if (!follow.current || request || hash === '#edit') return
    const url = follow.current
    follow.current = null
    navigate(url, { replace: true })
    following.url = null
  }, [request, hash, pathname, navigate])

  /** After a move: follow the open folder to its new place, close the editor on a moved item, reload. */
  const moved = useCallback(async (kind: MoveKind, result: MoveResult) => {
    const request0 = request
    if (request0?.type === 'moveContent') request0.onDone?.()
    const t = result.target
    const ids = new Set(result.items.map((i) => i.id))
    const focus = parseExplorerPath(pathname)
    const editorKind = kind === 'module-move' ? 'module' : kind === 'series-move' ? 'series' : 'video'
    if (kind !== 'video-copy' && [...ids].some((id) => isSelected(editorKind, id))) clear()
    // The open folder itself moved: follow it to its new address
    let next: string | null = null
    if (kind !== 'video-copy' && t.subject_id && t.package_id) {
      const base = `${EXPLORER_BASE}/subjects/${t.subject_id}/packages/${t.package_id}`
      if (kind === 'video-move' && focus.level === 'video' && ids.has(focus.videoId) && t.series_id && t.module_id) {
        next = `${base}/series/${t.series_id}/modules/${t.module_id}/videos/${focus.videoId}${search}`
      } else if (kind === 'module-move' && (focus.level === 'module' || focus.level === 'video') && ids.has(focus.moduleId) && t.series_id) {
        next = `${base}/series/${t.series_id}/modules/${focus.moduleId}${focus.level === 'video' ? `/videos/${focus.videoId}` : ''}`
      } else if (kind === 'series-move' && (focus.level === 'series' || focus.level === 'module' || focus.level === 'video') && ids.has(focus.seriesId)) {
        next = pathname.replace(`/packages/${focus.packageId}/series/${focus.seriesId}`, `/packages/${t.package_id}/series/${focus.seriesId}`)
      }
    }
    if (next && t.package_id) {
      // Its new folder must already know it, or the page would say it is gone
      following.url = next
      await loadPackage(t.package_id).catch(() => {})
      follow.current = next
      setRequest(null)
      return
    }
    setRequest(null)
    await refresh()
  }, [request, pathname, search, isSelected, clear, refresh])

  const done = useCallback(async () => {
    // What was open in the editor is about to leave this list
    if (request?.type === 'archive' && isSelected(request.kind, request.id)) clear()
    if (request?.type === 'move' && isSelected('document', request.id)) clear()
    setRequest(null)
    await refresh()
  }, [request, refresh, isSelected, clear])

  return (
    <ActionsContext.Provider value={value}>
      {children}
      {request?.type === 'publish' && <PublishDialog {...request} onClose={close} onSuccess={done} />}
      {request?.type === 'archive' && <ArchiveWithImpactDialog {...request} onClose={close} onSuccess={done} />}
      {request?.type === 'move' && <MoveDocumentDialog documentId={request.id} documentTitle={request.name} onClose={close} onSuccess={done} />}
      {request?.type === 'deleteSubject' && <DeleteSubjectDialog subjectId={request.id} subjectName={request.name} onClose={close} onSuccess={done} />}
      {request?.type === 'bulk' && <BulkImpactDialog request={request.request} onClose={close} onFinished={refresh} />}
      {request?.type === 'uploadVideo' && <CreateVideoDialog moduleId={request.moduleId} onClose={close} onSuccess={done} />}
      {request?.type === 'newDocument' && <CreateDocumentDialog {...request.place} onClose={close} onSuccess={done} />}
      {request?.type === 'moveContent' && <ContentMovePicker kind={request.kind} items={request.items} onClose={close} onDone={(result) => moved(request.kind, result)} />}
      <RawJsonDrawer open={request?.type === 'json'} onClose={close} label={request?.type === 'json' ? request.name : ''} data={request?.type === 'json' ? request.data : null} />
      <KeyboardHelpDialog open={request?.type === 'shortcuts'} onClose={close} />
    </ActionsContext.Provider>
  )
}
