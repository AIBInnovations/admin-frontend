import { useEffect, useState } from 'react'
import { Info, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/common/detail'
import { videoAnalyticsService, type VideoQuery, type VideoSort, type VideoUsageReport } from '@/services/videoAnalytics.service'
import { ChartCard, DataTableView } from '@/components/charts/ChartCard'
import { RankedBars } from '@/components/charts/RankedBars'
import { dayLabel, formatCount, percent, plural } from '@/components/charts/format'
import { useReport } from '@/components/charts/useReport'
import { QUICK_RANGES, describeRange, type AnalyticsState } from '../useAnalyticsState'
import { Figure, ReportError, Segmented, StaleNotice, TableSkeleton } from './bits'
import { NoResults, useReportOptions } from './FilterBar'
import { VideoAudience } from './VideoAudience'
import { VideoDetail } from './VideoDetail'
import { VideoExportButton } from './VideoExportButton'
import { VideoUsageTable, type SortState } from './VideoUsageTable'
import { ViewsChart } from './VideoViewsChart'
import { pathOf, quiet, rating, watchTime } from './videoFormat'

const ID = /^[0-9a-f]{24}$/i
const SORTS: VideoSort[] = ['views', 'viewers', 'watch', 'avg_watch', 'completion', 'completed', 'rating', 'ratings', 'last', 'title', 'order']
const PAGE = 50

/** Which numbers follow the dates, in one sentence. */
function CountingNote({ d, rangeWord }: { d: VideoUsageReport | null; rangeWord: string }) {
  if (!d) return null
  const since = d.tracking_since
  const ranged = d.basis.views === 'events'
  return (
    <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
      <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {ranged
          ? `Views, unique viewers and ratings are for ${rangeWord.toLowerCase()}${since && d.range.from && d.range.from < since ? `; plays are recorded from ${dayLabel(since)}, earlier views are only in the all-time counters` : ''}. `
          : 'All time: views and unique viewers are the running counters on each video; ratings are every rating. '}
        Watch time is all time (it is not stored by day). Completion is each student's last saved position, today.
      </span>
    </p>
  )
}

/** The Videos tab: a package's (or every package's) videos, "like YouTube analytics", and who watches. */
export function VideosTab({ state }: { state: AnalyticsState }) {
  const p = state.params
  const video = ID.test(p.get('video') || '') ? p.get('video')! : ''
  const view = p.get('vview') === 'audience' ? 'audience' : 'videos'
  const scoped = state.scopedQuery('videos')
  const base: VideoQuery = { from: scoped.from, to: scoped.to, compare: scoped.compare, granularity: scoped.granularity, subject_id: scoped.subject_id, package_id: scoped.package_id }
  const rangeWord = describeRange(state.range)

  const options = useReportOptions()
  const scopeName = (base.package_id && options?.packages.find((x) => x.package_id === base.package_id)?.name)
    || (base.subject_id && options?.subjects.find((x) => x.subject_id === base.subject_id)?.name) || null
  if (video) {
    return <VideoDetail state={state} videoId={video} base={base} rangeWord={rangeWord} backLabel={scopeName ? `All videos in ${scopeName}` : 'All videos'} />
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Show"
          value={view}
          onChange={(v) => state.update({ vview: v === 'audience' ? 'audience' : null, vpage: null }, { push: true })}
          options={[{ value: 'videos', label: 'Videos' }, { value: 'audience', label: 'Who watches' }]}
        />
      </div>
      {view === 'audience'
        ? <VideoAudience state={state} query={base} rangeWord={rangeWord} />
        : <VideoUsage state={state} base={base} rangeWord={rangeWord} />}
    </div>
  )
}

function VideoUsage({ state, base, rangeWord }: { state: AnalyticsState; base: VideoQuery; rangeWord: string }) {
  const p = state.params
  const vsort = SORTS.includes(p.get('vsort') as VideoSort) ? (p.get('vsort') as VideoSort) : 'views'
  const dir = p.get('vdir') === 'asc' ? 'asc' : 'desc'
  const search = (p.get('vq') ?? '').slice(0, 100)
  const page = Math.max(1, Math.min(100000, Number(p.get('vpage')) || 1))
  const q: VideoQuery = { ...base, vsort, dir, search, page, limit: PAGE }
  const usage = useReport(`vu${JSON.stringify(q)}`, () => videoAnalyticsService.usage(q))
  const d = usage.data
  const [least, setLeast] = useState<'most' | 'least'>('most')
  const [text, setText] = useState(search)

  const { update } = state
  // The search box writes to the URL a moment after typing stops
  useEffect(() => setText(search), [search])
  useEffect(() => {
    if (text.trim() === search) return
    const t = window.setTimeout(() => update({ vq: text.trim() || null, vpage: null }), 300)
    return () => window.clearTimeout(t)
  }, [text, search, update])

  // A page past the end (a range or search with fewer videos): go to the last one
  useEffect(() => {
    if (d && d.pagination.total > 0 && page > d.pagination.totalPages) update({ vpage: d.pagination.totalPages > 1 ? String(d.pagination.totalPages) : null })
  }, [d, page, update])

  if (usage.error && !d) return <ReportError message={usage.error} onRetry={usage.reload} />

  // Figures and the ranked chart only change with the range and the package, not with the table's sort or page
  const subjectAsked = !base.package_id && base.subject_id && base.subject_id !== 'none' ? base.subject_id : ''
  const sameScope = !!d && (d.range.from ?? '') === (base.from ?? '') && (d.range.to ?? '') === (base.to ?? '')
    && (d.package?.package_id ?? '') === (base.package_id ?? '') && (d.subject?.subject_id ?? '') === subjectAsked
    && (!!d.previous) === (base.compare === 'previous' && !!base.from && !!base.to)
  const figuresRefreshing = (usage.refreshing && !sameScope) || usage.stale
  const t = d?.totals
  const versus = d?.previous_range?.days ? `previous ${plural(d.previous_range.days, 'day')}` : undefined
  const common = { loading: usage.loading, refreshing: figuresRefreshing, versus }
  const ranged = d?.basis.views === 'events'
  const href = (id: string) => state.href({ video: id })
  const list = d ? (least === 'most' ? d.top : d.least) : []
  const sort: SortState = { vsort, dir }
  const setSort = (s: SortState) => state.update({ vsort: s.vsort === 'views' ? null : s.vsort, vdir: s.dir === 'desc' ? null : 'asc', vpage: null })
  const scopeLine = d?.package
    ? d.package.is_combo
      ? `A combo: these are the videos of ${d.package.bundled.map((b) => b.name).join(' and ')}${d.package.bundled.length ? '' : ' (none yet)'}.`
      : null
    : null

  return (
    <div className="space-y-6">
      <StaleNotice report={usage} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Figure {...common} as="count" label="Views" count={t?.views ?? null} now={t?.views} before={quiet(t?.views, d?.previous?.views)} hint={ranged ? `Plays, ${rangeWord.toLowerCase()}` : 'All time'} />
        <Figure {...common} as="count" label="Unique viewers" count={t?.viewers ?? null} now={t?.viewers} before={quiet(t?.viewers, d?.previous?.viewers)} hint={ranged ? 'Signed-in students who played one' : 'Students with saved progress'} />
        <Figure {...common} label="Not watched" value={t ? formatCount(t.not_watched_live) : '—'} hint={t ? `of ${plural(t.live_videos, 'video')} students can see${ranged ? ', no play in this period' : ', never played'}` : undefined} />
        <Figure {...common} label="Watch time" value={t ? watchTime(t.watch_seconds) : '—'} hint="All time" />
        <Figure {...common} label="Average completion" value={t ? (t.completion === null ? 'Not started' : percent(t.completion)) : '—'} hint={t ? (t.started ? `Now, ${formatCount(t.completed)} finished of ${formatCount(t.started)} started` : 'Now. No student has started one') : undefined} />
        <Figure {...common} label="Average rating" value={t ? (t.rating === null ? 'No ratings' : `${rating(t.rating)} of 5`) : '—'} now={t?.rating ?? undefined} before={t?.rating == null ? null : d?.previous?.rating} hint={t ? plural(t.ratings, 'rating') : undefined} />
      </div>
      <div className="space-y-1">
        {scopeLine && <p className="text-[13px] text-muted-foreground">{scopeLine}</p>}
        <CountingNote d={d} rangeWord={rangeWord} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title={least === 'most' ? 'Most watched videos' : 'Least watched videos'}
          description={least === 'most' ? `By views, ${rangeWord.toLowerCase()}. Click a video for its own numbers.` : 'Of the videos students can see now, the fewest views first'}
          loading={usage.loading}
          refreshing={figuresRefreshing}
          staleError={usage.stale ? usage.error : null}
          onRetry={usage.reload}
          skeleton="bars"
          height={300}
          exportName={least === 'most' ? 'most-watched-videos' : 'least-watched-videos'}
          action={<Segmented label="Order" value={least} onChange={setLeast} options={[{ value: 'most', label: 'Most watched' }, { value: 'least', label: 'Least watched' }]} />}
          footer={d && least === 'most' && list.length > 0 && list.length < 10 && (
            <p className="mt-3 rounded-lg border border-dashed border-border px-3 py-2 text-[13px] text-muted-foreground">
              {list.length === 1 ? 'Only this video was' : `Only these ${list.length} videos were`} played {ranged ? 'in this period' : 'so far'}. {plural(t?.not_watched_live ?? 0, 'other video')} that students can see had none.
            </p>
          )}
          empty={d && list.length === 0 && (least === 'most'
            ? <NoResults what={ranged ? 'No video was played in this period.' : 'No video has been played yet.'} />
            : <NoResults what="No video here can be watched now." />)}
          csv={d ? () => ({ header: ['Video', 'Series', 'Module', 'Views', 'Unique viewers'], rows: list.map((r) => [r.title, r.series_name ?? '', r.module_name ?? '', r.views, r.viewers]) }) : undefined}
          table={d && (
            <DataTableView caption="Videos by views" rows={list} rowKey={(r) => r.video_id} columns={[
              { header: 'Video', cell: (r) => r.title },
              { header: 'Views', align: 'right', cell: (r) => formatCount(r.views) },
              { header: 'Unique viewers', align: 'right', cell: (r) => formatCount(r.viewers) },
            ]} />
          )}
        >
          <RankedBars
            unit="views"
            format={formatCount}
            rows={list.map((r) => ({ key: r.video_id, name: r.title, value: r.views, href: href(r.video_id), hint: `${pathOf(r)}, ${plural(r.viewers, 'viewer')}` }))}
          />
        </ChartCard>
        <ViewsChart query={base} title={d?.package ? 'Views of this package over time' : 'Views over time'} />
      </div>

      <Section
        flush
        title={d?.package ? `Every video in ${d.package.name}` : d?.subject ? `Every video in ${d.subject.name}` : 'Every video in every package'}
        description={t ? `${plural(t.videos, 'video')}. Sort by any column; the order covers every page. Click a video for its views over time, ratings and who watches.` : 'Loading videos'}
        action={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <Segmented<'most' | 'least' | 'other'>
              label="Quick sort"
              value={vsort === 'views' ? (dir === 'asc' ? 'least' : 'most') : 'other'}
              onChange={(v) => setSort({ vsort: 'views', dir: v === 'least' ? 'asc' : 'desc' })}
              options={[{ value: 'most', label: 'Most watched' }, { value: 'least', label: 'Least watched' }]}
            />
            <label className="relative order-first w-full sm:order-none sm:w-[220px]">
              <span className="sr-only">Find a video by title</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 100))}
                onKeyDown={(e) => { if (e.key === 'Escape' && text) { e.preventDefault(); setText('') } }}
                placeholder="Find a video"
                className="h-9 bg-card pl-8 pr-8"
              />
              {text && <button type="button" onClick={() => setText('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Clear search"><X className="h-3.5 w-3.5" /></button>}
            </label>
            <VideoExportButton report="video_usage" query={q} />
          </div>
        }
      >
        {usage.loading ? <TableSkeleton rows={8} /> : !d ? null : d.rows.length === 0 ? (
          search
            ? <NoResults what={`No video title here contains "${search}".`} onClear={() => setText('')} />
            : <p className="px-5 pb-6 pt-2 text-center text-sm text-muted-foreground">{d.package?.deleted ? 'This package was deleted.' : 'There are no videos here yet. Videos added in the Explorer appear here.'}</p>
        ) : (
          <VideoUsageTable
            rows={d.rows}
            sort={sort}
            onSort={setSort}
            rowHref={(r) => href(r.video_id)}
            // A column sub-label: a preset's name, or "Chosen dates" for a span (the span itself is in the filter bar)
            rangeWord={!ranged ? 'All time' : QUICK_RANGES.some((x) => x.id === state.range.preset) ? rangeWord : 'Chosen dates'}
            compare={!!d.previous}
            refreshing={usage.refreshing || usage.stale}
            pagination={d.pagination}
            onPage={(n) => state.update({ vpage: n > 1 ? String(n) : null }, { push: true })}
          />
        )}
      </Section>
    </div>
  )
}
