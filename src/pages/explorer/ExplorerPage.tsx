import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { parseExplorerPath, EXPLORER_BASE } from './parseExplorerPath'
import { useExplorerData } from './hooks/useExplorerData'
import { useProcessingPoll } from './hooks/useProcessingPoll'
import { ExplorerLayout } from './components/ExplorerLayout'
import { ExplorerTopBar } from './components/ExplorerTopBar'
import { ExplorerFocusCard } from './components/ExplorerFocusCard'
import { ExplorerChildrenPanel } from './components/ExplorerChildrenPanel'
import { ExplorerNotFound } from './components/ExplorerNotFound'

export function ExplorerPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const focus = useMemo(() => parseExplorerPath(pathname), [pathname])
  const data = useExplorerData(focus)

  useProcessingPoll(data.currentModule, data.refetch)

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
    if (focus.level !== 'root' && focus.level !== 'invalid') {
      if (data.missing === 'package' || data.missing === 'subject') {
        fallback = `${EXPLORER_BASE}/subjects/${focus.subjectId}`
      } else if (data.missing === 'series' && 'packageId' in focus) {
        fallback = `${EXPLORER_BASE}/subjects/${focus.subjectId}/packages/${focus.packageId}`
      } else if (data.missing === 'module' && 'seriesId' in focus) {
        fallback = `${EXPLORER_BASE}/subjects/${focus.subjectId}/packages/${focus.packageId}/series/${focus.seriesId}`
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
          onRefresh={data.refetch}
          loading={data.loading}
        />
      }
      focusCard={
        <ExplorerFocusCard
          focus={focus}
          loading={data.loading}
          subject={data.subject}
          packageDetail={data.packageDetail}
          currentSeries={data.currentSeries}
          currentModule={data.currentModule}
          onRefresh={data.refetch}
        />
      }
    >
      <ExplorerChildrenPanel focus={focus} data={data} onRefresh={data.refetch} />
    </ExplorerLayout>
  )
}
