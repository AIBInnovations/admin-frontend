import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ActionsProvider } from './actions/ActionsContext'
import { useExplorerAccess } from './access'
import { ExplorerChildrenPanel } from './components/ExplorerChildrenPanel'
import { ExplorerDetailPanel } from './components/ExplorerDetailPanel'
import { ExplorerLayout } from './components/ExplorerLayout'
import { ExplorerNotFound } from './components/ExplorerNotFound'
import { ExplorerTopBar } from './components/ExplorerTopBar'
import { CompactContext } from './context/CompactContext'
import { PanelSelectionProvider, usePanelSelection } from './context/PanelSelectionContext'
import { useExplorerData, type ExplorerData } from './hooks/useExplorerData'
import { useProcessingPoll } from './hooks/useProcessingPoll'
import { EXPLORER_BASE, parseExplorerPath, type ExplorerFocus } from './parseExplorerPath'
import { following } from './following'

const MISSING: Record<string, string> = {
  subject: 'That subject no longer exists.',
  package: 'That package no longer exists.',
  series: 'That series is no longer in this package.',
  module: 'That module is no longer in this series.',
  video: 'That video is no longer in this module.',
  book: 'That book no longer exists.',
}

/** Nearest place in the address that still exists. */
function fallbackFor(missing: string, focus: ExplorerFocus): string {
  if (missing === 'book') return `${EXPLORER_BASE}/books`
  if (!('subjectId' in focus) || missing === 'subject') return EXPLORER_BASE
  let url = `${EXPLORER_BASE}/subjects/${focus.subjectId}`
  if (missing === 'package' || !('packageId' in focus)) return url
  url += `/packages/${focus.packageId}`
  if (missing === 'series' || !('seriesId' in focus)) return url
  url += `/series/${focus.seriesId}`
  if (missing === 'module' || !('moduleId' in focus)) return url
  return `${url}/modules/${focus.moduleId}`
}

export function ExplorerPage() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const focus = useMemo(() => parseExplorerPath(pathname), [pathname])
  const data = useExplorerData(focus)
  useProcessingPoll(data.currentModule, data.refetch)

  useEffect(() => {
    if (focus.level !== 'invalid') return
    toast.error('That address does not exist.', { id: 'explorer-address' })
    navigate(focus.fallbackUrl, { replace: true })
  }, [focus, navigate])

  // Deleted or moved since the link was made. Said once per address.
  const handled = useRef<string | null>(null)
  useEffect(() => {
    if (!data.missing || data.loading || focus.level === 'invalid' || handled.current === pathname || following.url) return
    handled.current = pathname
    toast.error(MISSING[data.missing])
    navigate(fallbackFor(data.missing, focus), { replace: true })
  }, [data.missing, data.loading, focus, navigate, pathname])

  useEffect(() => {
    if (!data.movedToSubject || !('subjectId' in focus) || handled.current === pathname) return
    handled.current = pathname
    toast.info('This package is in another subject now.')
    navigate(pathname.replace(`/subjects/${focus.subjectId}/`, `/subjects/${data.movedToSubject}/`) + search, { replace: true })
  }, [data.movedToSubject, focus, navigate, pathname, search])

  if (focus.level === 'invalid') return <ExplorerNotFound />
  return (
    <PanelSelectionProvider focus={focus} data={data}>
      <ActionsProvider refresh={data.refetch}>
        <ExplorerWorkspace focus={focus} data={data} />
      </ActionsProvider>
    </PanelSelectionProvider>
  )
}

function ExplorerWorkspace({ focus, data }: { focus: ExplorerFocus; data: ExplorerData }) {
  const { viewer } = useExplorerAccess()
  const { target, manual, clear, select, asking } = usePanelSelection()
  // A phone is always compact (no room to dock the editor), so start there: the folder bar
  // is then in place from the first frame instead of pushing the list down a moment later.
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth < 704)
  const folder = focus.level !== 'root' && focus.level !== 'books' && target && target.id !== null ? target : null

  return (
    <CompactContext.Provider value={compact}>
      <ExplorerLayout
        viewer={viewer}
        topBar={<ExplorerTopBar focus={focus} data={data} />}
        detailPanel={<ExplorerDetailPanel focus={focus} data={data} />}
        sheetOpen={manual || asking}
        onSheetClose={clear}
        onCompactChange={setCompact}
      >
        {/* Narrow screens have no docked editor: this opens the folder's own details */}
        {compact && !manual && folder && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
            <p className="min-w-0 truncate text-[13px] text-muted-foreground">You are in a {folder.kind}</p>
            <Button size="sm" variant="outline" onClick={() => select(folder.kind as Parameters<typeof select>[0], folder.id)}><Pencil className="h-3.5 w-3.5" /> Details</Button>
          </div>
        )}
        <ExplorerChildrenPanel focus={focus} data={data} />
      </ExplorerLayout>
    </CompactContext.Provider>
  )
}
