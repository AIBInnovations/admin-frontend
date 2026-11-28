import { usePanelSelection } from '../context/PanelSelectionContext'
import type { ExplorerData } from '../hooks/useExplorerData'
import { BookPanel } from '../panel/BookPanel'
import { DocumentPanel, type DocPanelEntity } from '../panel/DocumentPanel'
import { ModulePanel } from '../panel/ModulePanel'
import { PackagePanel } from '../panel/PackagePanel'
import { SeriesPanel } from '../panel/SeriesPanel'
import { SubjectPanel } from '../panel/SubjectPanel'
import { UpcomingVideoPanel } from '../panel/UpcomingVideoPanel'
import { VideoPanel } from '../panel/VideoPanel'
import { targetKey } from '../panel/panelTypes'
import type { ExplorerFocus } from '../parseExplorerPath'
import type { AnyPackage } from '../types'
import type { Book } from '@/services/books.service'
import type { PackageDetailModule, PackageDetailSeries, PackageDetailVideo } from '@/services/packages.service'
import type { Subject } from '@/services/subjects.service'
import { useExplorerAccess } from '../access'
import { NoAccess } from './ExplorerEmptyState'
import { PanelSkeleton } from './ExplorerSkeleton'
import { ExplorerSummary } from './ExplorerSummary'

/** The docked editor: the form of whatever is selected, or the folder at a glance. */
export function ExplorerDetailPanel({ focus, data }: { focus: ExplorerFocus; data: ExplorerData }) {
  const { target, waiting } = usePanelSelection()
  const { can } = useExplorerAccess()
  const refresh = data.refetch

  if (!target) {
    if (waiting) return <PanelSkeleton />
    if (focus.level === 'root' || focus.level === 'books' || focus.level === 'book') return <ExplorerSummary focus={focus} data={data} />
    return <p className="px-6 py-14 text-center text-sm text-muted-foreground">Details appear here once the folder has loaded.</p>
  }
  if (target.kind !== 'upcoming' && !can(target.kind, 'read')) return <NoAccess what={`${target.kind}s`.replace('seriess', 'series')} />

  // A new key per item: each form starts from that item's own values.
  const key = targetKey(target)!
  const entity = target.entity
  switch (target.kind) {
    case 'subject': return <SubjectPanel key={key} entity={entity as Subject | null} onRefresh={refresh} />
    case 'package': return <PackagePanel key={key} entity={entity as AnyPackage | null} ctx={target.ctx} onRefresh={refresh} />
    case 'series': return <SeriesPanel key={key} entity={entity as PackageDetailSeries | null} ctx={target.ctx} onRefresh={refresh} />
    case 'module': return <ModulePanel key={key} entity={entity as PackageDetailModule | null} ctx={target.ctx} onRefresh={refresh} />
    case 'video': return <VideoPanel key={key} entity={entity as PackageDetailVideo} onRefresh={refresh} />
    case 'upcoming': return <UpcomingVideoPanel key={key} ctx={target.ctx} onRefresh={refresh} />
    case 'document': return <DocumentPanel key={key} entity={entity as DocPanelEntity} onRefresh={refresh} />
    case 'book': return <BookPanel key={key} entity={entity as Book | null} onRefresh={refresh} />
  }
}
