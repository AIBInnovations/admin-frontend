import { SubjectFocus } from './focus/SubjectFocus'
import { PackageFocus } from './focus/PackageFocus'
import { SeriesFocus } from './focus/SeriesFocus'
import { ModuleFocus } from './focus/ModuleFocus'
import { FocusCardSkeleton } from './ExplorerSkeleton'
import type { ExplorerFocus } from '../parseExplorerPath'
import type { SubjectDetail } from '@/services/subjects.service'
import type { PackageDetail, PackageDetailSeries, PackageDetailModule } from '@/services/packages.service'

interface ExplorerFocusCardProps {
  focus: ExplorerFocus
  loading: boolean
  subject?: SubjectDetail
  packageDetail?: PackageDetail
  currentSeries?: PackageDetailSeries
  currentModule?: PackageDetailModule
  onRefresh?: () => void
}

export function ExplorerFocusCard({
  focus,
  loading,
  subject,
  packageDetail,
  currentSeries,
  currentModule,
  onRefresh,
}: ExplorerFocusCardProps) {
  if (focus.level === 'root' || focus.level === 'invalid') return null

  if (loading) {
    return <FocusCardSkeleton />
  }

  if (focus.level === 'subject' && subject) {
    return <SubjectFocus subject={subject} onRefresh={onRefresh} />
  }

  if (focus.level === 'package' && packageDetail) {
    return <PackageFocus pkg={packageDetail} focus={focus} onRefresh={onRefresh} />
  }

  if (focus.level === 'series' && currentSeries) {
    const isTheory =
      typeof packageDetail?.package_type_id === 'object'
        ? (packageDetail.package_type_id as { name?: string }).name?.toLowerCase().includes('theory') ?? false
        : false
    return (
      <SeriesFocus
        series={currentSeries}
        focus={focus}
        isTheory={isTheory}
        onRefresh={onRefresh}
      />
    )
  }

  if (focus.level === 'module' && currentModule) {
    return <ModuleFocus module={currentModule} focus={focus} onRefresh={onRefresh} />
  }

  return null
}
