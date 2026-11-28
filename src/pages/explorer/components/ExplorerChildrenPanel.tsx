import { ErrorState } from '@/components/common/detail'
import { useExplorerAccess } from '../access'
import type { ExplorerData } from '../hooks/useExplorerData'
import type { ExplorerFocus } from '../parseExplorerPath'
import { NoAccess } from './ExplorerEmptyState'
import { BooksCatalog } from './children/BooksCatalog'
import { ModuleChildren } from './children/ModuleChildren'
import { PackageChildren } from './children/PackageChildren'
import { RootChildren } from './children/RootChildren'
import { SeriesChildren } from './children/SeriesChildren'
import { SubjectChildren } from './children/SubjectChildren'
import { VideoChildren } from './children/VideoChildren'

export function ExplorerChildrenPanel({ focus, data }: { focus: ExplorerFocus; data: ExplorerData }) {
  const { can } = useExplorerAccess()

  if (data.error) {
    if (data.error.status === 403) return <NoAccess what={focus.level === 'books' || focus.level === 'book' ? 'books' : focus.level === 'root' ? 'subjects' : 'this'} />
    return <div className="p-4"><ErrorState title="This folder could not be loaded" message={data.error.message} onRetry={() => void data.refetch()} /></div>
  }

  const banner = data.stale && !data.loading && (
    <p role="alert" className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-warning/30 bg-warning-soft px-4 py-2 text-[13px] text-warning">
      The latest version could not be loaded. This is what was here before.
      <button type="button" onClick={() => void data.refetch()} className="font-semibold underline underline-offset-2">Try again</button>
    </p>
  )

  const body = () => {
    switch (focus.level) {
      case 'root': return <RootChildren data={data} focus={focus} />
      case 'books':
      case 'book': return <BooksCatalog data={data} />
      case 'subject': return <SubjectChildren data={data} focus={focus} />
      case 'invalid': return null
    }
    if (!can('package', 'read')) return <NoAccess what="packages" />
    switch (focus.level) {
      case 'package': return <PackageChildren data={data} focus={focus} />
      case 'series': return <SeriesChildren data={data} focus={focus} />
      case 'module': return <ModuleChildren data={data} focus={focus} />
      case 'video': return <VideoChildren data={data} />
    }
  }

  return <>{banner}{body()}</>
}
