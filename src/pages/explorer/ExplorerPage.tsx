import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { parseExplorerPath, EXPLORER_BASE } from './parseExplorerPath'
import { useExplorerData } from './hooks/useExplorerData'
import { useProcessingPoll } from './hooks/useProcessingPoll'
import { ExplorerLayout } from './components/ExplorerLayout'
import { ExplorerTopBar } from './components/ExplorerTopBar'
import { ExplorerChildrenPanel } from './components/ExplorerChildrenPanel'
import { ExplorerDetailPanel } from './components/ExplorerDetailPanel'
import { ExplorerNotFound } from './components/ExplorerNotFound'
import { PanelSelectionProvider, usePanelSelection } from './context/PanelSelectionContext'

export function ExplorerPage() {
  return (
    <PanelSelectionProvider>
      <ExplorerPageInner />
    </PanelSelectionProvider>
  )
}

function ExplorerPageInner() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const focus = useMemo(() => parseExplorerPath(pathname), [pathname])
  const data = useExplorerData(focus)
  const { setFocusDefault, clear } = usePanelSelection()

  useProcessingPoll(data.currentModule, data.refetch)

  // Navigating to a new node drops any manual panel selection and the stale
  // focus default (re-set below once the new node's data resolves).
  useEffect(() => { clear(); setFocusDefault(null) }, [pathname, clear, setFocusDefault])

  // Default the panel to the focused entity (no-op while a manual pick is open).
  useEffect(() => {
    if (focus.level === 'subject' && data.subject) {
      setFocusDefault({ kind: 'subject', entity: data.subject })
    } else if (focus.level === 'package' && data.packageDetail) {
      setFocusDefault({ kind: 'package', entity: data.packageDetail, ctx: { subjectId: focus.subjectId } })
    } else if (focus.level === 'series' && data.currentSeries) {
      setFocusDefault({ kind: 'series', entity: data.currentSeries, ctx: { packageId: focus.packageId } })
    } else if (focus.level === 'module' && data.currentModule) {
      setFocusDefault({ kind: 'module', entity: data.currentModule, ctx: { seriesId: focus.seriesId } })
    } else if (focus.level === 'video' && data.currentVideo) {
      setFocusDefault({ kind: 'video', entity: data.currentVideo, ctx: { moduleId: focus.moduleId } })
    } else if (focus.level === 'book' && data.book) {
      setFocusDefault({ kind: 'book', entity: data.book })
    } else if (focus.level === 'root' || focus.level === 'books') {
      setFocusDefault(null)
    }
  }, [focus, data.subject, data.packageDetail, data.currentSeries, data.currentModule, data.currentVideo, data.book, setFocusDefault])

  useEffect(() => {
    if (focus.level === 'invalid') {
      const messages: Record<typeof focus.reason, string> = {
        malformed: 'Invalid URL — redirecting to a safe location.',
        notfound: 'Content not found.',
        chain_mismatch: 'Path has changed — redirecting to nearest valid ancestor.',
      }
      toast.error(messages[focus.reason])
      navigate(focus.fallbackUrl, { replace: true })
    }
  }, [focus, navigate])

  // Chain-mismatch recovery: URL shape was valid but IDs don't chain
  // together in the actual tree (e.g. series not under this package, or
  // a deleted/moved entity). Redirect to the nearest valid ancestor.
  useEffect(() => {
    if (!data.missing || data.loading) return
    let fallback = EXPLORER_BASE
    if (data.missing === 'book') {
      fallback = `${EXPLORER_BASE}/books`
    } else if ('subjectId' in focus) {
      if (data.missing === 'package' || data.missing === 'subject') {
        fallback = `${EXPLORER_BASE}/subjects/${focus.subjectId}`
      } else if (data.missing === 'series' && 'packageId' in focus) {
        fallback = `${EXPLORER_BASE}/subjects/${focus.subjectId}/packages/${focus.packageId}`
      } else if (data.missing === 'module' && 'seriesId' in focus) {
        fallback = `${EXPLORER_BASE}/subjects/${focus.subjectId}/packages/${focus.packageId}/series/${focus.seriesId}`
      } else if (data.missing === 'video' && 'moduleId' in focus) {
        fallback = `${EXPLORER_BASE}/subjects/${focus.subjectId}/packages/${focus.packageId}/series/${focus.seriesId}/modules/${focus.moduleId}`
      }
    }
    toast.error('Path has changed — redirecting to nearest valid ancestor.')
    navigate(fallback, { replace: true })
  }, [data.missing, data.loading, focus, navigate])

  if (focus.level === 'invalid') {
    return <ExplorerNotFound reason={focus.reason} fallbackUrl={focus.fallbackUrl} />
  }

  return (
    <ExplorerLayout
      topBar={
        <ExplorerTopBar
          focus={focus}
          subjectName={data.subjectName}
          packageName={data.packageName}
          seriesName={data.seriesName}
          moduleName={data.moduleName}
          videoName={data.videoName}
          bookName={data.bookName}
          onRefresh={data.refetch}
          loading={data.loading}
        />
      }
      detailPanel={<ExplorerDetailPanel onRefresh={data.refetch} />}
    >
      <ExplorerChildrenPanel focus={focus} data={data} onRefresh={data.refetch} />
    </ExplorerLayout>
  )
}
