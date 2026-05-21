import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RootChildren } from './children/RootChildren'
import { SubjectChildren } from './children/SubjectChildren'
import { PackageChildren } from './children/PackageChildren'
import { SeriesChildren } from './children/SeriesChildren'
import { ModuleChildren } from './children/ModuleChildren'
import { VideoChildren } from './children/VideoChildren'
import { BooksCatalog } from './children/BooksCatalog'
import type { ExplorerFocus } from '../parseExplorerPath'
import type { ExplorerData } from '../hooks/useExplorerData'

interface ExplorerChildrenPanelProps {
  focus: ExplorerFocus
  data: ExplorerData
  onRefresh?: () => void
}

function isTheoryPackage(pkg: ExplorerData['packageDetail']): boolean {
  if (!pkg?.package_type_id) return false
  if (typeof pkg.package_type_id === 'object') {
    return (pkg.package_type_id as { name?: string }).name?.toLowerCase().includes('theory') ?? false
  }
  return false
}

export function ExplorerChildrenPanel({ focus, data, onRefresh }: ExplorerChildrenPanelProps) {
  const { loading, error, subjects, packages, packageDetail, currentSeries, currentModule, currentVideo } = data

  if (focus.level === 'invalid') return null

  // Surface fetch errors once the initial paint finishes — previously this was
  // silent and left the panel blank.
  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Couldn't load this view</h3>
        <p className="text-sm text-slate-400 max-w-xs mb-5 leading-relaxed">{error}</p>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </Button>
        )}
      </div>
    )
  }

  if (focus.level === 'root') {
    return (
      <RootChildren
        subjects={subjects}
        loading={loading}
        focus={focus}
        onRefresh={onRefresh}
        libraryDocuments={data.libraryDocuments}
      />
    )
  }

  if (focus.level === 'books' || focus.level === 'book') {
    return (
      <BooksCatalog
        books={data.books}
        loading={loading}
        focus={focus}
        onRefresh={onRefresh}
      />
    )
  }

  if (focus.level === 'subject') {
    return (
      <SubjectChildren
        packages={packages}
        loading={loading}
        focus={focus}
        onRefresh={onRefresh}
        subjectDocuments={data.subjectDocuments}
      />
    )
  }

  if (focus.level === 'package') {
    return (
      <PackageChildren
        packageDetail={packageDetail}
        loading={loading}
        focus={focus}
        onRefresh={onRefresh}
      />
    )
  }

  if (focus.level === 'series') {
    return (
      <SeriesChildren
        series={currentSeries}
        loading={loading}
        focus={focus}
        isTheory={isTheoryPackage(packageDetail)}
        onRefresh={onRefresh}
      />
    )
  }

  if (focus.level === 'module') {
    return (
      <ModuleChildren
        module={currentModule}
        focus={focus}
        loading={loading}
        onRefresh={onRefresh}
      />
    )
  }

  if (focus.level === 'video') {
    return (
      <VideoChildren
        video={currentVideo}
        videoTags={data.videoTags}
        videoReviews={data.videoReviews}
        videoReviewsTotal={data.videoReviewsTotal}
        loading={loading}
        onRefresh={onRefresh}
      />
    )
  }

  return null
}
