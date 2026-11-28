import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ExternalLink, GraduationCap, UserCircle, Video as VideoIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, DataTablePagination, type ColumnDef } from '@/components/common/DataTable'
import { DateRangeFilter, rangeFromParams, rangeToParams } from '@/components/common/DateRangeFilter'
import { DetailHeader, DetailSkeleton, ErrorState, Section, Stat, StatusPill } from '@/components/common/detail'
import { formatCount } from '@/lib/format'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { feedbackService, type FeedbackFigures, type FeedbackListParams, type FeedbackScope, type TrendPoint, type VideoFeedbackRow } from '@/services/feedback.service'
import { AverageRating, Change, Hint, RatingBars, RatingTrend } from './components/figures'
import { FilterSelect, SearchField } from './components/filters'
import { ReviewList } from './components/ReviewList'
import { StaleNotice } from './components/StaleNotice'
import { watchTime } from './FeedbackGroups'
import { pageOf, patchParams, useRemote } from './remote'
import { average, explorerHref, facultyName, pathText, plural, STATUS_LABEL, STATUSES } from './lib'

const PAGE_SIZE = 20
const RATINGS = ['1,2', '1', '2', '3', '4', '5', 'none']

function Figures({ figures, trend, href }: { figures: FeedbackFigures; trend: TrendPoint[]; href: (patch: Record<string, string>) => string }) {
  return (
    <>
      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Average rating" value={average(figures.average)} hint={<Hint text={plural(figures.rating_count, 'rating')} change={figures.change && <Change value={figures.change.average} />} />} />
        <Stat label="Low ratings (1 or 2 stars)" value={formatCount(figures.low_count)} href={href({ status: 'all', rating: '1,2' })} hint={<Hint text={figures.rating_count ? `${Math.round((figures.low_count / figures.rating_count) * 100)}% of ratings` : 'No ratings'} change={figures.change && <Change value={figures.change.low_count} goodWhenUp={false} />} />} />
        <Stat label="Open" value={formatCount(figures.open_count)} href={href({ status: 'open' })} hint={`${formatCount(figures.unassigned_count)} not assigned`} />
        <Stat label="With a comment" value={formatCount(figures.comment_count)} href={href({ status: 'all', comment: 'true' })} hint={plural(figures.review_count, 'review')} />
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Ratings"><RatingBars figures={figures} hrefFor={(n) => href({ status: 'all', rating: String(n) })} /></Section>
        <Section title="Average by month" description="Every month with ratings, up to the last 12"><RatingTrend points={trend} /></Section>
      </div>
    </>
  )
}

/** The reviews under one lecturer or one video, with the same filters as the inbox in short form. */
function ScopedReviews({ scope, hideVideo, hideFaculty }: { scope: FeedbackScope; hideVideo?: boolean; hideFaculty?: boolean }) {
  const [params, setParams] = useSearchParams()
  const page = pageOf(params)
  const status = [...STATUSES as string[], 'open', 'attention', 'all'].includes(params.get('status') || '') ? params.get('status')! : 'all'
  const rating = RATINGS.includes(params.get('rating') || '') ? params.get('rating')! : ''
  const comment = ['true', 'false'].includes(params.get('comment') || '') ? params.get('comment')! : ''
  const q = params.get('q') || ''
  const query: FeedbackListParams = {
    ...scope, search: q || undefined, rating: rating || undefined, has_comment: comment || undefined,
    attention: status === 'attention' ? 'true' : undefined,
    status: ['attention', 'all'].includes(status) ? undefined : status,
  }
  const { data, loading, error, refresh } = useRemote(`scoped:${page}:${JSON.stringify(query)}`, () => feedbackService.list({ ...query, page, limit: PAGE_SIZE }))
  const update = (patch: Record<string, string | null>) => setParams(patchParams(params, patch), { replace: true })
  const total = data?.pagination.total ?? 0
  const totalPages = data?.pagination.totalPages ?? 1
  const filtered = status !== 'all' || !!rating || !!comment || !!q
  const clear = () => update({ status: null, rating: null, comment: null, q: null })
  const count = (k: keyof NonNullable<typeof data>['counts']) => (data ? ` (${formatCount(data.counts[k])})` : '')

  useEffect(() => {
    if (!loading && data && data.reviews.length === 0 && total > 0 && page > totalPages) {
      setParams(patchParams(params, { page: totalPages > 1 ? String(totalPages) : null }, true), { replace: true })
    }
  }, [loading, data, total, page, totalPages, params, setParams])

  return (
    <div id="reviews" className="space-y-3">
      <Section title="Reviews" description={data ? plural(total, 'review') : undefined} flush>
        <div className="flex flex-wrap gap-2 border-b border-border px-5 pb-4">
          <SearchField value={q} onChange={(v) => update({ q: v || null })} label="Search comment or student" />
          <FilterSelect label="Status" anyLabel={`All${count('all')}`} value={status === 'all' ? '' : status}
            options={[{ value: 'attention', label: `Needs attention${count('attention')}` }, { value: 'open', label: `Open${count('open')}` }, ...STATUSES.map((s) => ({ value: s as string, label: `${STATUS_LABEL[s]}${count(s)}` }))]}
            onChange={(v) => update({ status: v || null })} />
          <FilterSelect label="Rating" anyLabel="Any rating" value={rating}
            options={[{ value: '1,2', label: '1 or 2 stars' }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: plural(n, 'star') })), { value: 'none', label: 'Comment without a rating' }]}
            onChange={(v) => update({ rating: v || null })} />
          <FilterSelect label="Comment" anyLabel="With or without comment" value={comment} options={[{ value: 'true', label: 'With a comment' }, { value: 'false', label: 'Without a comment' }]} onChange={(v) => update({ comment: v || null })} />
          {filtered && <Button variant="ghost" onClick={clear}>Clear filters</Button>}
        </div>
        <ReviewList
          reviews={data?.reviews ?? []} loading={loading} error={error?.message} onRetry={refresh} hideVideo={hideVideo} hideFaculty={hideFaculty}
          empty={filtered ? { title: 'No reviews match these filters', action: <Button variant="outline" size="sm" onClick={clear}>Clear filters</Button> } : { title: 'No reviews in this period' }}
        />
      </Section>
      <DataTablePagination currentPage={page} totalPages={totalPages} totalCount={total} onPageChange={(p) => setParams(patchParams(params, { page: p > 1 ? String(p) : null }, true))} />
    </div>
  )
}

function useScopeRange() {
  const [params, setParams] = useSearchParams()
  const range = rangeFromParams(params, 'all')
  const filter = <DateRangeFilter value={range} onChange={(r) => setParams(rangeToParams(r, patchParams(params, {})), { replace: true })} align="end" />
  const href = (base: string) => (patch: Record<string, string>) => {
    const next = new URLSearchParams()
    for (const k of ['range', 'from', 'to']) { const v = params.get(k); if (v) next.set(k, v) }
    for (const [k, v] of Object.entries(patch)) next.set(k, v)
    return `${base}?${next}`
  }
  return { from: range.from || undefined, to: range.to || undefined, filter, href }
}

function LoadError({ error, what, refresh }: { error: { message: string; status?: number }; what: string; refresh: () => void }) {
  const missing = error.status === 404 || error.status === 400
  return (
    <ErrorState
      title={missing ? `This ${what} does not exist` : error.status === 403 ? 'You cannot see this page' : 'This page could not be loaded'}
      message={missing ? `It may have been deleted, and no feedback mentions it.` : error.message}
      onRetry={missing ? undefined : refresh}
      back={{ label: 'Back to feedback', href: '/feedback' }}
    />
  )
}

export function FeedbackFacultyPage() {
  const { facultyId = '' } = useParams()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const { from, to, filter, href } = useScopeRange()
  const { data, loading, error, refresh } = useRemote(`f:${facultyId}:${from}:${to}`, () => feedbackService.faculty(facultyId, { from, to }))
  const videos = useRemote(`fv:${facultyId}:${from}:${to}`, () => feedbackService.byVideo({ faculty_id: facultyId, from, to, sort: 'lowest', limit: 10 }))

  if (!data || data.faculty._id !== facultyId) {
    return error && !loading ? <LoadError error={error} what="faculty member" refresh={refresh} /> : <DetailSkeleton />
  }
  const { faculty: f, summary, trend } = data
  const scoped = href(`/feedback/faculty/${facultyId}`)

  const columns: ColumnDef<VideoFeedbackRow>[] = [
    { id: 'video', header: 'Video', cell: (r) => <span className="block min-w-[220px]"><span className="block max-w-[420px] truncate text-sm font-medium">{r.video?.title || 'Deleted video'}</span><span className="block max-w-[420px] truncate text-xs text-muted-foreground" title={pathText(r) || undefined}>{pathText(r) || 'No course'}</span></span> },
    { id: 'average', header: 'Average', cell: (r) => <AverageRating value={r.average} count={r.rating_count} /> },
    { id: 'reviews', header: 'Reviews', headerClassName: 'text-right', cellClassName: 'text-right', cell: (r) => <span className="tabular-nums">{formatCount(r.review_count)}</span> },
    { id: 'low', header: 'Low', headerClassName: 'text-right', cellClassName: 'text-right', cell: (r) => <span className={r.low_count ? 'font-medium text-danger tabular-nums' : 'tabular-nums'}>{formatCount(r.low_count)}</span> },
    { id: 'open', header: 'To handle', headerClassName: 'text-right', cellClassName: 'text-right', cell: (r) => <span className="tabular-nums">{formatCount(r.attention_count)}</span> },
  ]
  const moreVideos = (videos.data?.pagination.total ?? 0) - (videos.data?.videos.length ?? 0)

  return (
    <div className="space-y-6">
      <DetailHeader
        back={{ label: 'Feedback by faculty', href: '/feedback?view=faculty' }}
        title={<span className="inline-flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            {f.photo_url ? <img src={f.photo_url} alt="" className="h-full w-full object-cover" /> : <UserCircle aria-hidden="true" className="h-6 w-6 text-muted-foreground" />}
          </span>
          {facultyName(f)}
        </span>}
        status={f.is_active === false ? <StatusPill>Inactive</StatusPill> : undefined}
        subtitle={[f.subjects.map((s) => s.name).join(', '), plural(f.video_count, 'video')].filter(Boolean).join(' · ')}
        actions={<>{filter}{!f.deleted && hasPermission('faculty.read') && <Button asChild variant="outline" className="bg-card"><Link to={`/faculty/${f._id}`}><GraduationCap aria-hidden="true" className="h-4 w-4" />Faculty profile</Link></Button>}</>}
      />
      <StaleNotice error={error?.message} onRetry={refresh} />
      <Figures figures={summary} trend={trend} href={scoped} />
      <section className="space-y-3" aria-labelledby="videos-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="videos-title" className="text-[15px] font-semibold">Videos, lowest rated first</h2>
          {moreVideos > 0 && <Button asChild variant="outline" size="sm" className="bg-card"><Link to={`/feedback?view=video&faculty=${facultyId}&sort=lowest`}>Show all {videos.data?.pagination.total}</Link></Button>}
        </div>
        <DataTable data={videos.data?.videos ?? []} columns={columns} isLoading={videos.loading && !videos.data} error={videos.data ? null : videos.error?.message} onRetry={videos.refresh}
          onRowClick={(r) => navigate(`/feedback/videos/${r.video_id}`)} getRowKey={(r) => r.video_id} skeletonCount={3} emptyState={{ icon: VideoIcon, title: 'No reviewed videos in this period' }} />
      </section>
      <ScopedReviews scope={{ faculty_id: facultyId, from, to }} hideFaculty />
    </div>
  )
}

export function FeedbackVideoPage() {
  const { videoId = '' } = useParams()
  const { hasPermission } = useAuth()
  const { from, to, filter, href } = useScopeRange()
  const { data, loading, error, refresh } = useRemote(`v:${videoId}:${from}:${to}`, async () => {
    const res = await feedbackService.video(videoId, { from, to })
    return res.data ? { ...res, data: { ...res.data, id: videoId } } : (res as never)
  })
  if (!data || data.id !== videoId) {
    return error && !loading ? <LoadError error={error} what="video" refresh={refresh} /> : <DetailSkeleton />
  }
  const { video: v, faculty: f, summary, trend } = data
  const inExplorer = hasPermission('subjects.read') ? explorerHref(data, v?._id) : null

  return (
    <div className="space-y-6">
      <DetailHeader
        back={{ label: 'Feedback by video', href: '/feedback?view=video' }}
        title={v?.title || 'Deleted video'}
        status={v?.archived ? <StatusPill>Archived</StatusPill> : undefined}
        subtitle={<>
          {f ? <Link className="text-primary hover:underline" to={`/feedback/faculty/${f._id}`}>{f.name}</Link> : v ? 'No lecturer set' : 'This video was deleted. Its reviews are kept.'}
          {pathText(data) && <> · {pathText(data)}</>}
        </>}
        actions={<>{filter}{inExplorer && <Button asChild variant="outline" className="bg-card"><Link to={inExplorer}><ExternalLink aria-hidden="true" className="h-4 w-4" />Open in Explorer</Link></Button>}</>}
      />
      <StaleNotice error={error?.message} onRetry={refresh} />
      <Figures figures={summary} trend={trend} href={href(`/feedback/videos/${videoId}`)} />
      {v && (
        <section aria-label="Viewing" className="grid grid-cols-3 gap-3 sm:gap-4">
          <Stat label="Plays" value={formatCount(v.view_count)} />
          <Stat label="Viewers" value={formatCount(v.unique_viewer_count)} />
          <Stat label="Avg watch" value={watchTime(v.total_watch_seconds, v.unique_viewer_count)} />
        </section>
      )}
      <ScopedReviews scope={{ video_id: videoId, from, to }} hideVideo hideFaculty />
    </div>
  )
}
