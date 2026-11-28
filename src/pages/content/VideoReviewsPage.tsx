import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ViewModeToggle } from '@/components/videoReviews/ViewModeToggle'
import { ReviewListItem } from '@/components/videoReviews/ReviewListItem'
import { VideoReviewCard } from '@/components/videoReviews/VideoReviewCard'
import { TeacherReviewCard } from '@/components/videoReviews/TeacherReviewCard'
import { ReviewDrillDownView } from '@/components/videoReviews/ReviewDrillDownView'
import { SearchWithFilters } from '@/components/common/SearchBar/SearchWithFilters'
import type { FilterConfig } from '@/components/common/SearchBar/types'
import {
  videoReviewsService,
  type VideoReview,
  type VideoSummary,
  type TeacherSummary,
} from '@/services/videoReviews.service'
import { subjectsService } from '@/services/subjects.service'
import { packagesService } from '@/services/packages.service'
import { seriesService } from '@/services/series.service'
import { modulesService } from '@/services/modules.service'
import type { ViewMode } from '@/components/videoReviews/ViewModeToggle'
import { apiErrorMessage, ErrorState } from '@/components/common/detail'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { Search, MessageSquare } from 'lucide-react'

// Minimal option shape for filter dropdowns
type FilterOption = { _id: string; name: string }

const SORT_OPTIONS = [
  { label: 'Default (latest reviewed)', value: 'default' },
  { label: 'Upload date (newest)', value: 'upload_date' },
  { label: 'Most views', value: 'most_views' },
  { label: 'Most rated', value: 'most_rated' },
]

// ─── Drill-down state ─────────────────────────────────────────────────────────

type DrillDown =
  | { type: 'none' }
  | { type: 'video'; id: string; label?: string }
  | { type: 'teacher'; id: string; label?: string }

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-4 border-b border-border last:border-0">
          <Skeleton className="h-14 w-20 rounded shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="shrink-0 space-y-2 text-right">
            <Skeleton className="h-3 w-20 ml-auto" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CardGridSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <div
      className={`grid gap-4 grid-cols-1 sm:grid-cols-2 ${
        cols === 4 ? 'lg:grid-cols-3 xl:grid-cols-4' : 'lg:grid-cols-3'
      }`}
    >
      {Array.from({ length: cols * 2 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-3">
          {cols === 4 && <Skeleton className="aspect-video w-full rounded" />}
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}

function EmptyReviews({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <p className="text-sm font-medium text-muted-foreground">No reviews found</p>
      {search ? (
        <p className="text-xs text-muted-foreground mt-1">
          Try adjusting your search or filters
        </p>
      ) : (
        <p className="text-xs text-muted-foreground mt-1">
          Reviews will appear here once users start rating videos
        </p>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function VideoReviewsPage() {
  // The view lives in the URL, so Back, refresh and sharing work
  const [params, setParams] = useSearchParams()
  const modeParam = params.get('mode')
  const viewMode: ViewMode = modeParam === 'by-video' || modeParam === 'by-teacher' ? modeParam : 'list'
  const [drillLabel, setDrillLabel] = useState<{ id: string; label: string } | null>(null)
  const drillId = params.get('video') || params.get('teacher')
  const drillDown: DrillDown = !drillId
    ? { type: 'none' }
    : { type: params.get('video') ? 'video' : 'teacher', id: drillId, label: drillLabel?.id === drillId ? drillLabel.label : undefined }
  const openDrillDown = (type: 'video' | 'teacher', id: string, label: string) => {
    setDrillLabel({ id, label })
    setParams((prev) => { const next = new URLSearchParams(prev); next.set(type, id); return next })
  }
  const closeDrillDown = () => {
    setParams((prev) => { const next = new URLSearchParams(prev); next.delete('video'); next.delete('teacher'); return next })
  }

  const [search, setSearch] = useState(params.get('q') || '')
  const [query, setQuery] = useState(params.get('q') || '')
  const [page, setPage] = useState(Math.max(1, Number(params.get('page')) || 1))
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { nextFetchId, isStale } = useLatestFetch()

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  // Data per mode
  const [reviews, setReviews] = useState<VideoReview[]>([])
  const [videoSummaries, setVideoSummaries] = useState<VideoSummary[]>([])
  const [teacherSummaries, setTeacherSummaries] = useState<TeacherSummary[]>([])

  // ── By-video filters + sort ──────────────────────────────────────────────────
  const [subjectFilter, setSubjectFilter] = useState(params.get('subject') || 'all')
  const [packageFilter, setPackageFilter] = useState(params.get('package') || 'all')
  const [seriesFilter, setSeriesFilter] = useState(params.get('series') || 'all')
  const [moduleFilter, setModuleFilter] = useState(params.get('module') || 'all')
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.some((o) => o.value === params.get('sort')) ? params.get('sort')! : 'default')

  // Cascading option lists (subject -> package -> series -> module)
  const [subjects, setSubjects] = useState<FilterOption[]>([])
  const [packages, setPackages] = useState<FilterOption[]>([])
  const [seriesList, setSeriesList] = useState<FilterOption[]>([])
  const [modules, setModules] = useState<FilterOption[]>([])

  // Load subjects once
  useEffect(() => {
    subjectsService
      .getSubjects({ limit: 200, sort_by: 'name', sort_order: 'asc' })
      .then((r) => r.success && r.data && setSubjects(r.data.entities))
      .catch(() => {})
  }, [])

  // Packages depend on selected subject
  useEffect(() => {
    packagesService
      .getAll({ limit: 200, subject_id: subjectFilter !== 'all' ? subjectFilter : undefined })
      .then((r) => r.success && r.data && setPackages(r.data.entities))
      .catch(() => {})
  }, [subjectFilter])

  // Series depend on selected package
  useEffect(() => {
    seriesService
      .getAll({ limit: 300, package_id: packageFilter !== 'all' ? packageFilter : undefined })
      .then((r) => r.success && r.data && setSeriesList(r.data.entities))
      .catch(() => {})
  }, [packageFilter])

  // Modules depend on selected series
  useEffect(() => {
    modulesService
      .getAll({ limit: 500, series_id: seriesFilter !== 'all' ? seriesFilter : undefined })
      .then((r) => r.success && r.data && setModules(r.data.entities))
      .catch(() => {})
  }, [seriesFilter])

  // Reset child filters when a parent changes
  const handleFiltersChange = (f: Record<string, string>) => {
    if (f.subject !== subjectFilter) {
      setSubjectFilter(f.subject)
      setPackageFilter('all')
      setSeriesFilter('all')
      setModuleFilter('all')
    } else if (f.package !== packageFilter) {
      setPackageFilter(f.package)
      setSeriesFilter('all')
      setModuleFilter('all')
    } else if (f.series !== seriesFilter) {
      setSeriesFilter(f.series)
      setModuleFilter('all')
    } else if (f.module !== moduleFilter) {
      setModuleFilter(f.module)
    } else if (f.sort !== sortBy) {
      setSortBy(f.sort)
    }
  }

  const byVideoFilters: FilterConfig[] = [
    {
      key: 'subject', label: 'Subject', type: 'select', searchable: true, defaultValue: 'all',
      placeholder: 'Subject',
      options: [{ label: 'All subjects', value: 'all' }, ...subjects.map((s) => ({ label: s.name, value: s._id }))],
    },
    {
      key: 'package', label: 'Package', type: 'select', searchable: true, defaultValue: 'all',
      placeholder: 'Package',
      options: [{ label: 'All packages', value: 'all' }, ...packages.map((p) => ({ label: p.name, value: p._id }))],
    },
    {
      key: 'series', label: 'Series', type: 'select', searchable: true, defaultValue: 'all',
      placeholder: 'Series',
      options: [{ label: 'All series', value: 'all' }, ...seriesList.map((s) => ({ label: s.name, value: s._id }))],
    },
    {
      key: 'module', label: 'Module', type: 'select', searchable: true, defaultValue: 'all',
      placeholder: 'Module',
      options: [{ label: 'All modules', value: 'all' }, ...modules.map((m) => ({ label: m.name, value: m._id }))],
    },
    {
      key: 'sort', label: 'Sort', type: 'select', searchable: false, defaultValue: 'default',
      placeholder: 'Sort',
      options: SORT_OPTIONS,
    },
  ]

  const fetchData = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    const searchText = query || undefined
    try {
      if (viewMode === 'list') {
        const res = await videoReviewsService.getList({ page, limit: 20, search: searchText })
        if (isStale(fetchId)) return
        if (!res.success || !res.data) throw new Error(res.message || 'Failed to load reviews')
        setReviews(res.data.reviews)
        setTotalPages(res.data.pagination.totalPages)
        setTotal(res.data.pagination.total)
      } else if (viewMode === 'by-video') {
        const res = await videoReviewsService.getByVideo({
          page,
          limit: 12,
          search: searchText,
          subject_id: subjectFilter !== 'all' ? subjectFilter : undefined,
          package_id: packageFilter !== 'all' ? packageFilter : undefined,
          series_id: seriesFilter !== 'all' ? seriesFilter : undefined,
          module_id: moduleFilter !== 'all' ? moduleFilter : undefined,
          sort_by: sortBy !== 'default' ? sortBy : undefined,
          sort_order: 'desc',
        })
        if (isStale(fetchId)) return
        if (!res.success || !res.data) throw new Error(res.message || 'Failed to load video summaries')
        setVideoSummaries(res.data.videos)
        setTotalPages(res.data.pagination.totalPages)
        setTotal(res.data.pagination.total)
      } else {
        const res = await videoReviewsService.getByTeacher({ page, limit: 12, search: searchText })
        if (isStale(fetchId)) return
        if (!res.success || !res.data) throw new Error(res.message || 'Failed to load teacher summaries')
        setTeacherSummaries(res.data.teachers)
        setTotalPages(res.data.pagination.totalPages)
        setTotal(res.data.pagination.total)
      }
      setError(null)
    } catch (err) {
      if (!isStale(fetchId)) setError(apiErrorMessage(err, 'Failed to load reviews'))
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [viewMode, page, query, subjectFilter, packageFilter, seriesFilter, moduleFilter, sortBy, nextFetchId, isStale])

  useEffect(() => {
    if (drillDown.type === 'none') {
      fetchData()
    }
  }, [fetchData, drillDown.type])

  // Reset page when mode, search, filters or sort change
  useResetPageOnChange(setPage, [viewMode, query, subjectFilter, packageFilter, seriesFilter, moduleFilter, sortBy])

  // Keep the URL in step (the mode and drill-down are written where they change)
  useEffect(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      const write = (key: string, value: string, empty: string) => { if (value && value !== empty) next.set(key, value); else next.delete(key) }
      write('q', query, '')
      write('subject', subjectFilter, 'all')
      write('package', packageFilter, 'all')
      write('series', seriesFilter, 'all')
      write('module', moduleFilter, 'all')
      write('sort', sortBy, 'default')
      write('page', String(page), '1')
      return next.toString() === prev.toString() ? prev : next
    }, { replace: true })
  }, [query, subjectFilter, packageFilter, seriesFilter, moduleFilter, sortBy, page, setParams])

  const handleModeChange = (mode: ViewMode) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const key of ['video', 'teacher', 'page']) next.delete(key)
      if (mode === 'list') next.delete('mode')
      else next.set('mode', mode)
      return next
    }, { replace: true })
  }

  // ── Drill-down ──────────────────────────────────────────────────────────────
  if (drillDown.type !== 'none') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Video Reviews"
          breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Content' },
            { label: 'Video Reviews' },
          ]}
        />
        <ReviewDrillDownView
          type={drillDown.type}
          id={drillDown.id}
          label={drillDown.label}
          onBack={closeDrillDown}
        />
      </div>
    )
  }

  // ── Main view ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Video Reviews"
        description="View ratings and feedback submitted by users for video lectures"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Video Reviews' },
        ]}
      />

      {/* Toolbar: mode toggle + search/filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <ViewModeToggle value={viewMode} onChange={handleModeChange} />
          {viewMode !== 'by-video' && (
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  viewMode === 'list'
                    ? 'Search by user, teacher, video, package...'
                    : 'Search by teacher name...'
                }
                aria-label={viewMode === 'list' ? 'Search reviews' : 'Search teachers'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}
          {!loading && (
            <p className="text-xs text-muted-foreground shrink-0 sm:ml-auto">
              {total} {total === 1 ? 'result' : 'results'}
            </p>
          )}
        </div>

        {/* By-video: search + cascading filters (subject/package/series/module) + sort */}
        {viewMode === 'by-video' && (
          <SearchWithFilters
            value={search}
            onChange={setSearch}
            placeholder="Search by video title, teacher, package..."
            filters={byVideoFilters}
            activeFilters={{
              subject: subjectFilter,
              package: packageFilter,
              series: seriesFilter,
              module: moduleFilter,
              sort: sortBy,
            }}
            onFiltersChange={handleFiltersChange}
          />
        )}
      </div>

      {/* Content */}
      {error && !loading && <ErrorState title="The reviews could not be loaded" message={error} onRetry={fetchData} />}
      {!error && viewMode === 'list' && (
        <div>
          {loading ? (
            <ListSkeleton />
          ) : reviews.length === 0 ? (
            <EmptyReviews search={query} />
          ) : (
            <div>
              {reviews.map((r) => (
                <ReviewListItem key={r._id} review={r} />
              ))}
            </div>
          )}
        </div>
      )}

      {!error && viewMode === 'by-video' && (
        <div>
          {loading ? (
            <CardGridSkeleton cols={4} />
          ) : videoSummaries.length === 0 ? (
            <EmptyReviews search={query} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videoSummaries.map((s) => (
                <VideoReviewCard
                  key={s.video._id}
                  summary={s}
                  onClick={() =>
                    openDrillDown('video', s.video._id, `Reviews for: ${s.video.title}`)
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!error && viewMode === 'by-teacher' && (
        <div>
          {loading ? (
            <CardGridSkeleton cols={3} />
          ) : teacherSummaries.length === 0 ? (
            <EmptyReviews search={query} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teacherSummaries.map((s) => (
                <TeacherReviewCard
                  key={s.faculty._id}
                  summary={s}
                  onClick={() =>
                    openDrillDown('teacher', s.faculty._id, `Reviews for: ${s.faculty.name}`)
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && !error && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
