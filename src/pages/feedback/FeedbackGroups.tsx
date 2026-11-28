import { useEffect, useState } from 'react'
import { useNavigate, type SetURLSearchParams } from 'react-router-dom'
import { GraduationCap, UserCircle, Video as VideoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/common/DataTable'
import { formatCount } from '@/lib/format'
import { seriesService } from '@/services/series.service'
import { modulesService } from '@/services/modules.service'
import { feedbackService, type FacultyFeedbackRow, type FeedbackScope, type VideoFeedbackRow } from '@/services/feedback.service'
import { AverageRating, Change } from './components/figures'
import { StaleNotice } from './components/StaleNotice'
import { FilterSelect, SearchField, type Option, type useFilterOptions } from './components/filters'
import { pageOf, patchParams, useRemote } from './remote'
import { facultyName, istDay, pathText } from './lib'

export interface ViewProps {
  params: URLSearchParams
  setParams: SetURLSearchParams
  update: (patch: Record<string, string | null>) => void
  scope: FeedbackScope
  options: ReturnType<typeof useFilterOptions>
}

const PAGE_SIZE = 20
const COMMON_SORTS = [
  { value: 'lowest', label: 'Lowest rating first' },
  { value: 'highest', label: 'Highest rating first' },
  { value: 'most_open', label: 'Most to handle first' },
  { value: 'most_rated', label: 'Most reviews first' },
  { value: 'name', label: 'Name, A to Z' },
]
const VIDEO_SORTS = [
  ...COMMON_SORTS,
  { value: 'most_views', label: 'Most views first' },
  { value: 'upload_date', label: 'Newest upload first' },
]

const num = (n: number) => <span className="tabular-nums">{formatCount(n)}</span>
const right = { headerClassName: 'whitespace-nowrap text-right', cellClassName: 'text-right' }

/** Average watched by one viewer. */
export function watchTime(total: number, viewers: number): string {
  const s = Math.round(total / Math.max(viewers, 1))
  if (s < 1) return 'None'
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60)
  return h ? `${h}h ${m}m` : m ? `${m}m` : `${s}s`
}

function useGoToPage(params: URLSearchParams, setParams: SetURLSearchParams) {
  return (p: number) => setParams(patchParams(params, { page: p > 1 ? String(p) : null }, true))
}

export function ByFacultyView({ params, setParams, update, scope, options }: ViewProps) {
  const navigate = useNavigate()
  const page = pageOf(params)
  const sort = COMMON_SORTS.some((s) => s.value === params.get('sort')) ? params.get('sort')! : ''
  const q = params.get('q') || ''
  const query = { ...scope, search: q || undefined, sort: sort || undefined }
  const { data, loading, error, refresh } = useRemote(`faculty:${page}:${JSON.stringify(query)}`, () => feedbackService.byFaculty({ ...query, page, limit: PAGE_SIZE }))
  const goToPage = useGoToPage(params, setParams)
  const filtered = !!(q || scope.faculty_id || scope.subject_id || scope.package_id || scope.from)
  const range = new URLSearchParams()
  for (const k of ['range', 'from', 'to']) { const v = params.get(k); if (v) range.set(k, v) }
  const open = (r: FacultyFeedbackRow) => navigate(r.faculty
    ? `/feedback/faculty/${r.faculty._id}${range.size ? `?${range}` : ''}`
    : `/feedback?status=all&faculty=none${range.size ? `&${range}` : ''}`)

  const columns: ColumnDef<FacultyFeedbackRow>[] = [
    {
      id: 'faculty', header: 'Faculty',
      cell: (r) => (
        <div className="flex min-w-[200px] items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            {r.faculty?.photo_url ? <img src={r.faculty.photo_url} alt="" className="h-full w-full object-cover" /> : <UserCircle aria-hidden="true" className="h-5 w-5 text-muted-foreground" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{facultyName(r.faculty)}</span>
            <span className="block max-w-[260px] truncate text-xs text-muted-foreground">{r.faculty ? r.faculty.subjects.map((s) => s.name).join(', ') || 'No subject' : 'Videos that name nobody'}</span>
          </span>
        </div>
      ),
    },
    { id: 'average', header: 'Average', cell: (r) => <AverageRating value={r.average} count={r.rating_count} /> },
    ...(scope.from ? [{ id: 'change', header: 'Change', cell: (r: FacultyFeedbackRow) => <span className="whitespace-nowrap text-[13px]"><Change value={r.change?.average} /></span> }] : []),
    { id: 'reviews', header: 'Reviews', ...right, cell: (r) => num(r.review_count) },
    { id: 'low', header: 'Low', ...right, cell: (r) => <span className={r.low_count ? 'font-medium text-danger tabular-nums' : 'tabular-nums'}>{formatCount(r.low_count)}</span> },
    { id: 'open', header: 'To handle', ...right, cell: (r) => num(r.attention_count) },
    // Only this faculty's videos that have a review in the period, so it is
    // smaller than the faculty's whole catalogue on the Faculty pages.
    { id: 'videos', header: 'Reviewed videos', ...right, cell: (r) => <span className="tabular-nums" title={`${formatCount(r.video_count)} ${r.video_count === 1 ? 'video' : 'videos'} with at least one review${scope.from ? ' in this period' : ''}`}>{formatCount(r.video_count)}</span> },
    { id: 'latest', header: 'Last review', headerClassName: 'whitespace-nowrap', cell: (r) => <span className="whitespace-nowrap text-sm">{istDay(r.latest_at)}</span> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <SearchField value={q} onChange={(v) => update({ q: v || null })} label="Search faculty" />
        {options.subjects.length > 0 && <FilterSelect label="Subject" anyLabel="Any subject" searchable value={scope.subject_id || ''} options={options.subjects} onChange={(v) => update({ subject: v, package: null })} />}
        <FilterSelect label="Sort" anyLabel="Latest review first" value={sort} options={COMMON_SORTS} onChange={(v) => update({ sort: v })} />
        {filtered && <Button variant="ghost" onClick={() => update({ q: null, faculty: null, subject: null, package: null, range: null, from: null, to: null })}>Clear filters</Button>}
      </div>
      {data && <StaleNotice error={error?.message} onRetry={refresh} />}
      <DataTable
        data={data?.faculty ?? []}
        columns={columns}
        isLoading={loading && !data}
        error={data ? null : error?.message}
        onRetry={refresh}
        onRowClick={open}
        getRowKey={(r) => r.faculty?._id ?? 'none'}
        pagination={{ currentPage: page, totalPages: data?.pagination.totalPages ?? 1, totalCount: data?.pagination.total ?? 0, onPageChange: goToPage }}
        emptyState={{
          icon: GraduationCap,
          title: filtered ? 'No faculty match these filters' : 'No reviews yet',
          description: filtered ? undefined : 'Faculty appear here when students review their videos.',
        }}
      />
    </div>
  )
}

export function ByVideoView({ params, setParams, update, scope, options }: ViewProps) {
  const navigate = useNavigate()
  const page = pageOf(params)
  const sort = VIDEO_SORTS.some((s) => s.value === params.get('sort')) ? params.get('sort')! : ''
  const q = params.get('q') || ''
  const query = { ...scope, search: q || undefined, sort: sort || undefined }
  const { data, loading, error, refresh } = useRemote(`video:${page}:${JSON.stringify(query)}`, () => feedbackService.byVideo({ ...query, page, limit: PAGE_SIZE }))
  const goToPage = useGoToPage(params, setParams)
  const filtered = !!(q || scope.faculty_id || scope.subject_id || scope.package_id || scope.series_id || scope.module_id || scope.from)

  const [series, setSeries] = useState<Option[]>([])
  const [modules, setModules] = useState<Option[]>([])
  useEffect(() => {
    let live = true
    if (!scope.package_id) { setSeries([]); return }
    seriesService.getAll({ limit: 200, package_id: scope.package_id } as never)
      .then((r) => { if (live) setSeries((r.data?.entities ?? []).map((x) => ({ value: x._id, label: x.name }))) }).catch(() => {})
    return () => { live = false }
  }, [scope.package_id])
  useEffect(() => {
    let live = true
    if (!scope.series_id) { setModules([]); return }
    modulesService.getAll({ limit: 200, series_id: scope.series_id } as never)
      .then((r) => { if (live) setModules((r.data?.entities ?? []).map((x) => ({ value: x._id, label: x.name }))) }).catch(() => {})
    return () => { live = false }
  }, [scope.series_id])

  const columns: ColumnDef<VideoFeedbackRow>[] = [
    {
      id: 'video', header: 'Video',
      cell: (r) => (
        <div className="flex min-w-[240px] items-center gap-3">
          <span className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
            {r.video?.thumbnail_url ? <img src={r.video.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <VideoIcon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />}
          </span>
          <span className="min-w-0">
            <span className="block max-w-[250px] truncate text-sm font-medium">{r.video?.title || 'Deleted video'}{r.video?.archived && <span className="font-normal text-muted-foreground"> (archived)</span>}</span>
            <span className="block max-w-[250px] truncate text-xs text-muted-foreground" title={pathText(r)}>{pathText(r) || 'No course'}</span>
          </span>
        </div>
      ),
    },
    { id: 'faculty', header: 'Faculty', cell: (r) => <span className="block max-w-[160px] truncate text-sm">{facultyName(r.faculty)}</span> },
    {
      id: 'average', header: 'Average',
      cell: (r) => (
        <>
          <AverageRating value={r.average} count={r.rating_count} />
          {scope.from && <span className="block whitespace-nowrap text-xs"><Change value={r.change?.average} /></span>}
        </>
      ),
    },
    { id: 'reviews', header: 'Reviews', ...right, cell: (r) => num(r.review_count) },
    { id: 'low', header: 'Low', ...right, cell: (r) => <span className={r.low_count ? 'font-medium text-danger tabular-nums' : 'tabular-nums'}>{formatCount(r.low_count)}</span> },
    { id: 'open', header: 'To handle', ...right, cell: (r) => num(r.attention_count) },
    { id: 'plays', header: 'Plays', ...right, cell: (r) => num(r.video?.view_count ?? 0) },
    { id: 'viewers', header: 'Viewers', ...right, cell: (r) => num(r.video?.unique_viewer_count ?? 0) },
    { id: 'watch', header: 'Avg watch', ...right, cell: (r) => <span className="whitespace-nowrap tabular-nums">{r.video ? watchTime(r.video.total_watch_seconds, r.video.unique_viewer_count) : 'None'}</span> },
    { id: 'latest', header: 'Last review', headerClassName: 'whitespace-nowrap', cell: (r) => <span className="whitespace-nowrap text-sm">{istDay(r.latest_at)}</span> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <SearchField value={q} onChange={(v) => update({ q: v || null })} label="Search video or faculty" />
        {options.faculty.length > 0 && <FilterSelect label="Faculty" anyLabel="Any faculty" searchable value={scope.faculty_id || ''} options={options.faculty} onChange={(v) => update({ faculty: v })} />}
        {options.subjects.length > 0 && <FilterSelect label="Subject" anyLabel="Any subject" searchable value={scope.subject_id || ''} options={options.subjects} onChange={(v) => update({ subject: v, package: null, series: null, module: null })} />}
        {options.packages.length > 0 && <FilterSelect label="Package" anyLabel="Any package" searchable value={scope.package_id || ''} options={options.packages.filter((p) => !scope.subject_id || p.subject === scope.subject_id)} onChange={(v) => update({ package: v, series: null, module: null })} />}
        {scope.package_id && <FilterSelect label="Series" anyLabel="Any series" searchable value={scope.series_id || ''} options={series} onChange={(v) => update({ series: v, module: null })} />}
        {scope.series_id && <FilterSelect label="Module" anyLabel="Any module" searchable value={scope.module_id || ''} options={modules} onChange={(v) => update({ module: v })} />}
        <FilterSelect label="Sort" anyLabel="Latest review first" value={sort} options={VIDEO_SORTS} onChange={(v) => update({ sort: v })} />
        {filtered && <Button variant="ghost" onClick={() => update({ q: null, faculty: null, subject: null, package: null, series: null, module: null, range: null, from: null, to: null })}>Clear filters</Button>}
      </div>
      {data && <StaleNotice error={error?.message} onRetry={refresh} />}
      <DataTable
        data={data?.videos ?? []}
        columns={columns}
        isLoading={loading && !data}
        error={data ? null : error?.message}
        onRetry={refresh}
        onRowClick={(r) => navigate(`/feedback/videos/${r.video_id}`)}
        getRowKey={(r) => r.video_id}
        pagination={{ currentPage: page, totalPages: data?.pagination.totalPages ?? 1, totalCount: data?.pagination.total ?? 0, onPageChange: goToPage }}
        emptyState={{
          icon: VideoIcon,
          title: filtered ? 'No videos match these filters' : 'No reviews yet',
          description: filtered ? undefined : 'Videos appear here when students review them.',
        }}
      />
    </div>
  )
}
