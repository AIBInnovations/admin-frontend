import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState, StatusPill } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { videoAnalyticsService, type VideoQuery } from '@/services/videoAnalytics.service'
import { ChartCard, DataTableView } from '@/components/charts/ChartCard'
import { RankedBars } from '@/components/charts/RankedBars'
import { formatCount, istDay, istDayTime, percent, plural } from '@/components/charts/format'
import { useReport } from '@/components/charts/useReport'
import { versusText, videoHref, type AnalyticsState } from '../useAnalyticsState'
import { Figure, ReportError, StaleNotice } from './bits'
import { VideoAudience } from './VideoAudience'
import { ViewsChart } from './VideoViewsChart'
import { STATUS, ago, quiet, rating, shortTime, watchTime } from './videoFormat'

/** One video, like a channel's video page: its numbers in the range, all time, its ratings, how far students got, who watches. */
export function VideoDetail({ state, videoId, base, rangeWord, backLabel }: { state: AnalyticsState; videoId: string; base: VideoQuery; rangeWord: string; backLabel: string }) {
  const { hasPermission } = useAuth()
  const q: VideoQuery = { from: base.from, to: base.to, compare: base.compare, granularity: base.granularity, video_id: videoId }
  const detail = useReport(`vd${JSON.stringify(q)}`, () => videoAnalyticsService.detail(q))
  const d = detail.data
  const back = state.href({ video: null })
  if (detail.error && !d) {
    return detail.status === 404
      ? <ErrorState title="This video was not found" message="It may have been deleted. Its numbers are no longer shown." back={{ label: backLabel, href: back }} />
      : <ReportError message={detail.error} onRetry={detail.reload} />
  }
  const refreshing = detail.refreshing || detail.stale
  const versus = versusText(d?.previous_range) ?? undefined
  const common = { loading: detail.loading, refreshing, versus }
  const v = d?.video
  const explorer = v ? videoHref({ video_id: v.video_id, subject_id: v.subject_id, package_id: v.package_id, series_id: v.series_id, module_id: v.module_id }, hasPermission) : null
  const started = d?.progress.started ?? 0
  const lastSeen = d?.progress.last_watched_at

  return (
    <div className="space-y-6">
      <StaleNotice report={detail} />
      <div className="space-y-3">
        <Link to={back} className="inline-flex items-center gap-1.5 rounded-sm text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft aria-hidden="true" className="h-4 w-4" />{backLabel}</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words font-display text-xl font-semibold leading-snug sm:text-[22px]">{v?.title ?? 'Loading video…'}</h2>
            {v && (
              <p className="mt-1 break-words text-[13px] text-muted-foreground">{v.package_name ?? 'Deleted package'} › {v.series_name ?? 'Deleted series'} › {v.module_name ?? 'Deleted module'}</p>
            )}
            {v && (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                <span>{shortTime(v.duration_seconds)} long</span>
                <span aria-hidden="true">·</span><span>{v.faculty?.name ?? 'No lecturer set'}</span>
                <span aria-hidden="true">·</span><span>{v.is_free ? 'Free' : 'Paid'}</span>
                {v.archived ? <StatusPill tone="neutral" className="h-5 text-[11px]">Archived</StatusPill> : v.draft ? <StatusPill tone="neutral" className="h-5 text-[11px]">Draft</StatusPill> : <StatusPill tone={STATUS[v.status].tone} className="h-5 text-[11px]">{STATUS[v.status].label}</StatusPill>}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {explorer && <Button asChild variant="outline" size="sm"><Link to={explorer}><ExternalLink className="h-3.5 w-3.5" />Open in Explorer</Link></Button>}
            {hasPermission('videos.read') && <Button asChild variant="outline" size="sm"><Link to={`/feedback/videos/${videoId}`}><MessageSquareText className="h-3.5 w-3.5" />Open its feedback</Link></Button>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Figure {...common} as="count" label="Views" count={d?.current.views ?? null} now={d?.current.views} before={quiet(d?.current.views, d?.previous?.views)} hint={d?.basis.views === 'events' ? `Plays, ${rangeWord.toLowerCase()}` : 'All time'} />
        <Figure {...common} as="count" label="Unique viewers" count={d?.current.viewers ?? null} now={d?.current.viewers} before={quiet(d?.current.viewers, d?.previous?.viewers)} hint={d?.basis.viewers === 'events' ? 'Signed-in students' : 'All time'} />
        <Figure {...common} label="Average rating" value={d ? (d.current.rating === null ? 'No ratings' : `${rating(d.current.rating)} of 5`) : '—'} now={d?.current.rating ?? undefined} before={d?.current.rating == null ? null : d?.previous?.rating} hint={d ? plural(d.current.ratings, 'rating') : undefined} />
        <Figure {...common} label="Watch time" value={d ? watchTime(d.all_time.watch_seconds) : '—'} hint={d ? `All time, ${shortTime(d.all_time.avg_watch_seconds)} per viewer` : undefined} />
        <Figure {...common} label="Average completion" value={d ? (d.progress.completion === null ? 'Not started' : percent(d.progress.completion)) : '—'} hint={d ? (started ? `Now, ${formatCount(d.progress.completed)} of ${plural(started, 'student')} finished` : 'Now. No student has saved progress') : undefined} />
        <Figure {...common} label="Last watched" value={d ? (lastSeen ? ago(lastSeen) ?? istDay(lastSeen) : 'Never') : '—'} hint={lastSeen ? istDayTime(lastSeen) : d ? `${formatCount(d.all_time.views)} views all time` : undefined} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ViewsChart query={q} title="Views over time" />
        <ChartCard
          title="Ratings by stars"
          description={d?.basis.ratings === 'range' ? `Ratings given, ${rangeWord.toLowerCase()}` : 'Every rating, all time'}
          skeleton="bars"
          loading={detail.loading}
          refreshing={refreshing}
          empty={d && d.current.ratings === 0 && <p>No ratings {d.basis.ratings === 'range' ? 'in this period' : 'yet'}. {d.all_time.ratings ? `${plural(d.all_time.ratings, 'rating')} all time, average ${rating(d.all_time.rating)}.` : ''}</p>}
          exportName="video-ratings"
          csv={d ? () => ({ header: ['Stars', 'Ratings', 'Share %'], rows: d.distribution.map((r) => [r.rating, r.count, r.share]) }) : undefined}
          table={d && (
            <DataTableView caption="Ratings by stars" rows={d.distribution} rowKey={(r) => String(r.rating)} columns={[
              { header: 'Stars', cell: (r) => plural(r.rating, 'star'), footer: 'Total' },
              { header: 'Ratings', align: 'right', cell: (r) => formatCount(r.count), footer: formatCount(d.current.ratings) },
              { header: 'Share', align: 'right', cell: (r) => `${r.share}%` },
            ]} />
          )}
          footer={d && d.current.ratings > 0 && <p className="mt-2 text-[13px] text-muted-foreground">All time: {plural(d.all_time.ratings, 'rating')}, average {rating(d.all_time.rating)}.</p>}
        >
          <RankedBars
            unit="ratings"
            format={formatCount}
            rows={(d?.distribution ?? []).map((r) => ({ key: String(r.rating), name: plural(r.rating, 'star'), value: r.count, hint: `${r.share}% of ratings${r.rating <= 2 ? ', low' : ''}`, color: r.rating <= 2 ? 'var(--chart-low)' : 'var(--chart-primary)' }))}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="How far students got"
        description="Each student's last saved position in this video, now. A student who went back to rewatch counts where they are now, so this can read a little low."
        skeleton="bars"
        loading={detail.loading}
        refreshing={refreshing}
        empty={d && started === 0 && <p>No student has saved progress on this video yet.</p>}
        exportName="video-reach"
        csv={d ? () => ({ header: ['Stage', 'Students', 'Share of those who started %'], rows: d.progress.reach.map((r) => [r.label, r.students, r.share]) }) : undefined}
        table={d && (
          <DataTableView caption="Where students stopped" rows={d.progress.stopped} rowKey={(r) => String(r.from)} columns={[
            { header: 'Last position', cell: (r) => (r.from >= 90 ? '90% to 100%' : `${r.from}% to under ${r.to}%`), footer: 'Started' },
            { header: 'Students', align: 'right', cell: (r) => formatCount(r.students), footer: formatCount(started) },
            { header: 'Share', align: 'right', cell: (r) => `${r.share}%` },
          ]} />
        )}
      >
        <RankedBars
          unit="students"
          format={formatCount}
          max={Math.max(1, started)}
          rows={(d?.progress.reach ?? []).map((r, i) => ({
            key: r.key, name: r.label, value: r.students,
            hint: i === 0 ? 'Every student with saved progress' : `${percent(r.share)} of those who started${r.of_previous !== null ? `, ${percent(r.of_previous)} of the step before` : ''}`,
          }))}
        />
      </ChartCard>

      <section aria-labelledby="video-audience" className="space-y-3">
        <h2 id="video-audience" className="font-display text-[17px] font-semibold">Who watches this video</h2>
        <VideoAudience state={state} query={q} rangeWord={rangeWord} />
      </section>
    </div>
  )
}
