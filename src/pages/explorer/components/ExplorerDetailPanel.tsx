import { MousePointerClick } from 'lucide-react'
import { usePanelSelection } from '../context/PanelSelectionContext'
import { SubjectPanel } from '../panel/SubjectPanel'
import { PackagePanel } from '../panel/PackagePanel'
import { SeriesPanel } from '../panel/SeriesPanel'
import { ModulePanel } from '../panel/ModulePanel'
import { VideoPanel } from '../panel/VideoPanel'
import { BookPanel } from '../panel/BookPanel'
import { DocumentPanel, type DocPanelEntity } from '../panel/DocumentPanel'
import type { Subject, SubjectDetail } from '@/services/subjects.service'
import type { Package, PackageDetail, PackageDetailSeries, PackageDetailModule, PackageDetailVideo } from '@/services/packages.service'
import type { Book } from '@/services/books.service'

interface ExplorerDetailPanelProps {
  onRefresh?: () => void
}

/**
 * Resolves the current panel target (from PanelSelectionContext) to the right
 * entity editor. The target carries the entity object by reference, so no
 * extra fetch is needed to render.
 */
export function ExplorerDetailPanel({ onRefresh }: ExplorerDetailPanelProps) {
  const { target, clear } = usePanelSelection()

  if (!target) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
          <MousePointerClick className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-sm font-medium text-slate-500">Nothing selected</p>
        <p className="text-xs mt-1 max-w-[16rem] leading-relaxed">
          Pick an item from the list to view and edit its details here.
        </p>
      </div>
    )
  }

  switch (target.kind) {
    case 'subject':
      return <SubjectPanel entity={target.entity as Subject | SubjectDetail | null} onRefresh={onRefresh} onClose={clear} />
    case 'package':
      return <PackagePanel entity={target.entity as Package | PackageDetail | null} ctx={target.ctx} onRefresh={onRefresh} onClose={clear} />
    case 'series':
      return <SeriesPanel entity={target.entity as PackageDetailSeries | null} ctx={target.ctx} onRefresh={onRefresh} onClose={clear} />
    case 'module':
      return <ModulePanel entity={target.entity as PackageDetailModule | null} ctx={target.ctx} onRefresh={onRefresh} onClose={clear} />
    case 'video':
      return target.entity
        ? <VideoPanel entity={target.entity as PackageDetailVideo} onRefresh={onRefresh} onClose={clear} />
        : null
    case 'document':
      // Documents are always edited (no blank create in Phase 1).
      return target.entity
        ? <DocumentPanel entity={target.entity as DocPanelEntity} onRefresh={onRefresh} onClose={clear} />
        : null
    case 'book':
      return <BookPanel entity={target.entity as Book | null} onRefresh={onRefresh} onClose={clear} />
    default:
      return null
  }
}
