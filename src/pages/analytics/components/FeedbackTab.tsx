import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Section, StatusPill, type Tone } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { formatCount } from '@/lib/format'
import { analyticsService } from '@/services/analytics.service'
import { ChartCard, DataTableView } from '@/components/charts/ChartCard'
import { RankedBars } from '@/components/charts/RankedBars'
import { ReportTable } from '@/components/charts/ReportTable'
import { TrendChart } from '@/components/charts/TrendChart'
import { PER, bucketLabel, compactCount, istDayTime, plural, tickLabel } from '@/components/charts/format'
import { useReport } from '@/components/charts/useReport'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { versusText, type AnalyticsState } from '../useAnalyticsState'
import { StaleNotice, ExportButton, Figure, ReportError, Segmented, TableSkeleton } from './bits'
import { StudentLink } from '@/components/students/StudentLink'

const STATUS: Record<string, { label: string; tone: Tone }> = {
  new: { label: 'New', tone: 'warning' },
  in_review: { label: 'In review', tone: 'info' },
  action_planned: { label: 'Action planned', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'success' },
  dismissed: { label: 'Dismissed', tone: 'neutral' },
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={plural(n, 'star')}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} aria-hidden="true" className={i <= n ? 'h-3.5 w-3.5 fill-danger text-danger' : 'h-3.5 w-3.5 text-border'} />)}
    </span>
  )
}

export function FeedbackTab({ state }: { state: AnalyticsState }) {
  const { hasPermission } = useAuth()
  const [trend, setTrend] = useState<'low' | 'average'>('low')
  const q = { from: state.query.from, to: state.query.to, compare: state.query.compare, granularity: state.query.granularity, subject_id: state.filters.subject }
  const { data: d, loading, refreshing: loadingNewer, stale, error, reload } = useReport(JSON.stringify(q), () => analyticsService.feedback(q))
  // A failed refresh keeps the last numbers on screen: dimmed, under a notice with a retry
  const refreshing = loadingNewer || stale
  const canOpen = hasPermission('videos.read')
  const versus = versusText(d?.previous_range) ?? undefined
  const common = { loading, refreshing, versus }
  const g = d?.granularity ?? 'day'
  const none = !!d && d.current.ratings === 0
  const wide = useMediaQuery('(min-width: 1280px)')
  const list = (extra: Record<string, string>) => {
    const p = new URLSearchParams(q.from && q.to ? { from: q.from, to: q.to } : { range: 'all' })
    if (q.subject_id && q.subject_id !== 'none') p.set('subject', q.subject_id)
    p.set('status', 'all')
    for (const [k, v] of Object.entries(extra)) p.set(k, v)
    return `/feedback?${p}`
  }
  const open = (extra: Record<string, string>) => (canOpen ? list(extra) : undefined)
  if (error && !d) return <ReportError message={error} onRetry={reload} />

  return (
    <div className="space-y-6">
      <StaleNotice report={{ stale, error, reload }} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Figure {...common} label="Average rating" value={d ? (d.current.average === null ? 'No ratings' : `${d.current.average.toFixed(2)} of 5`) : '—'} now={d?.current.average ?? undefined} before={d?.current.average == null ? null : d?.previous?.average} hint={d?.previous?.average != null ? `Was ${d.previous.average.toFixed(2)}` : 'Across all videos'} href={open({})} />
        <Figure {...common} label="Ratings" value={formatCount(d?.current.ratings)} now={d?.current.ratings} before={d?.previous?.ratings} hint={`${plural(d?.current.comments ?? 0, 'comment')}`} href={open({})} />
        <Figure {...common} label="Low ratings" value={formatCount(d?.current.low_ratings)} now={d?.current.low_ratings} before={d?.previous?.low_ratings} upIsGood={false} hint="1 or 2 stars" href={open({ rating: '1,2' })} />
        <Figure {...common} label="Negative comments" value={formatCount(d?.current.low_comments)} hint="Written with 1 or 2 stars" href={open({ rating: '1,2', comment: 'true' })} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <ChartCard
          title="Ratings by stars"
          description="Number of ratings in this period"
          skeleton="bars"
          csv={d ? () => ({ header: ['Stars', 'Ratings', 'Share %'], rows: d.distribution.map((r) => [r.rating, r.count, r.share]) }) : undefined}
          loading={loading}
          refreshing={refreshing}
          empty={none && <p>No ratings in this period.</p>}
          table={d && (
            <DataTableView caption="Ratings by stars" rows={d.distribution} rowKey={(r) => String(r.rating)} columns={[
              { header: 'Stars', cell: (r) => plural(r.rating, 'star'), footer: 'Total' },
              { header: 'Ratings', align: 'right', cell: (r) => formatCount(r.count), footer: formatCount(d.current.ratings) },
              { header: 'Share', align: 'right', cell: (r) => `${r.share}%` },
            ]} />
          )}
        >
          <RankedBars
            unit="ratings"
            format={formatCount}
            rows={(d?.distribution ?? []).map((r) => ({ key: String(r.rating), name: plural(r.rating, 'star'), value: r.count, hint: `${r.share}% of ratings${r.rating <= 2 ? ', low' : ''}`, color: r.rating <= 2 ? 'var(--chart-low)' : 'var(--chart-primary)', href: open({ rating: String(r.rating) }) }))}
          />
        </ChartCard>

        <ChartCard
          title={trend === 'low' ? 'Low ratings over time' : 'Average rating over time'}
          skeleton={trend === 'low' ? 'columns' : 'trend'}
          height={wide ? 340 : 260}
          csv={d ? () => ({ header: ['From', 'To', 'Ratings', 'Low ratings', 'Average'], rows: d.points.map((p) => [p.from, p.to, p.ratings, p.low_ratings, p.average]) }) : undefined}
          description={trend === 'low' ? `Number of 1 and 2 star ratings, ${PER[g]}` : `Average stars out of 5, ${PER[g]}. Periods without ratings are left blank.`}
          loading={loading}
          refreshing={refreshing}
          action={<Segmented label="Measure" value={trend} onChange={setTrend} options={[{ value: 'low', label: 'Low ratings' }, { value: 'average', label: 'Average' }]} />}
          empty={none ? <p>No ratings in this period.</p> : trend === 'low' && d?.current.low_ratings === 0 ? <p>No low ratings in this period.</p> : false}
          table={d && (
            <DataTableView caption="Ratings over time" rows={d.points} rowKey={(p) => p.key} columns={[
              { header: 'Period', cell: (p) => bucketLabel(p, g), footer: 'Total' },
              { header: 'Ratings', align: 'right', cell: (p) => formatCount(p.ratings), footer: formatCount(d.current.ratings) },
              { header: 'Low ratings', align: 'right', cell: (p) => formatCount(p.low_ratings), footer: formatCount(d.current.low_ratings) },
              { header: 'Average', align: 'right', cell: (p) => (p.average === null ? 'None' : p.average.toFixed(2)), footer: d.current.average?.toFixed(2) ?? 'None' },
            ]} />
          )}
        >
          {d && (
            <TrendChart
              key={trend}
              height={wide ? 340 : 260}
              label={trend === 'low' ? `Low ratings, ${PER[g]}` : `Average rating, ${PER[g]}`}
              ticks={d.points.map((p) => tickLabel(p, g))}
              labels={d.points.map((p) => bucketLabel(p, g))}
              mode={trend === 'low' ? 'column' : 'line'}
              max={trend === 'average' ? 5 : undefined}
              // Averages of a few 1 to 5 star ratings: straight segments, so no curve suggests in-between days
              curve="linear"
              series={trend === 'low'
                ? [{ key: 'low', name: 'Low ratings', color: 'var(--chart-low)', values: d.points.map((p) => p.low_ratings) }]
                : [{ key: 'average', name: 'Average', color: 'var(--chart-primary)', kind: 'line', values: d.points.map((p) => p.average) }]}
              format={trend === 'low' ? formatCount : (n) => n.toFixed(2)}
              axisFormat={compactCount}
              whole
              details={(i) => [{ name: 'All ratings', value: formatCount(d.points[i].ratings) }]}
            />
          )}
        </ChartCard>
      </div>

      <Section title="Recent negative comments" description="1 and 2 star ratings with a comment, newest first" action={canOpen ? <Button asChild variant="outline" size="sm"><Link to={list({ rating: '1,2', comment: 'true' })}>Open all in Feedback</Link></Button> : undefined}>
        {loading ? <TableSkeleton rows={3} /> : !d?.recent_low.length ? <p className="py-2 text-sm text-muted-foreground">No negative comments in this period.</p> : (
          <ul className="divide-y divide-border">
            {d.recent_low.map((r) => {
              // The whole item opens the review (a stretched link); the name above it opens the student
              const comment = <span className="mt-1.5 line-clamp-3 block whitespace-pre-wrap break-words text-sm text-foreground/85">{r.feedback}</span>
              return (
                <li key={r.review_id} className="py-1 first:pt-0 last:pb-0">
                  <div className={canOpen ? 'relative -mx-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent/60' : 'py-2.5'}>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Stars n={r.rating} />
                      <span className="min-w-0 text-sm font-medium">{r.video?.title ?? 'Deleted video'}</span>
                      <StatusPill tone={STATUS[r.status]?.tone ?? 'neutral'}>{STATUS[r.status]?.label ?? r.status}</StatusPill>
                    </span>
                    {canOpen ? <Link to={`/feedback/${r.review_id}`} className="block rounded-sm after:absolute after:inset-0 after:rounded-md after:content-['']">{comment}</Link> : comment}
                    <span className="mt-1 block text-[13px] text-muted-foreground">
                      <span className="relative z-10"><StudentLink student={r.user} from="Analytics" className="font-normal" /></span>
                      {`, ${r.faculty_name ?? 'No lecturer set'}, ${istDayTime(r.at)}`}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section flush title="Lowest rated videos" description={`With ${d?.min_ratings ?? 3} or more ratings in this period`} action={<ExportButton report="feedback" query={q} />}>
          {loading ? <TableSkeleton rows={4} /> : (
            <ReportTable
              caption="Lowest rated videos"
              refreshing={refreshing}
              rows={d?.lowest_videos ?? []}
              rowKey={(v) => v.video_id}
              rowHref={(v) => (canOpen && !v.deleted ? `/feedback/videos/${v.video_id}` : null)}
              empty="No video has enough ratings in this period."
              columns={[
                { key: 'video', header: 'Video', cell: (v) => <><span className="block truncate font-medium" title={v.title}>{v.title}</span><span className="block truncate text-xs text-muted-foreground">{v.faculty_name ?? 'No lecturer set'}</span></> },
                { key: 'average', header: 'Average', align: 'right', sort: (v) => v.average, cell: (v) => <span className={v.average < 3 ? 'font-medium text-danger' : ''}>{v.average.toFixed(2)}</span> },
                { key: 'ratings', header: 'Ratings', align: 'right', sort: (v) => v.ratings, cell: (v) => formatCount(v.ratings) },
                { key: 'low', header: 'Low', align: 'right', sort: (v) => v.low_ratings, cell: (v) => formatCount(v.low_ratings) },
              ]}
            />
          )}
        </Section>
        <Section flush title="Lowest rated faculty" description="Average over their videos in this period">
          {loading ? <TableSkeleton rows={4} /> : (
            <ReportTable
              caption="Lowest rated faculty"
              refreshing={refreshing}
              rows={d?.lowest_faculty ?? []}
              rowKey={(f) => f.faculty_id}
              rowHref={(f) => (canOpen ? `/feedback/faculty/${f.faculty_id}` : null)}
              empty="No lecturer has enough ratings in this period."
              columns={[
                { key: 'name', header: 'Faculty', sort: (f) => f.name, cell: (f) => <><span className="block truncate font-medium">{f.name}</span><span className="block text-xs text-muted-foreground">{plural(f.videos, 'video')} rated</span></> },
                { key: 'average', header: 'Average', align: 'right', sort: (f) => f.average, cell: (f) => <span className={f.average < 3 ? 'font-medium text-danger' : ''}>{f.average.toFixed(2)}</span> },
                { key: 'ratings', header: 'Ratings', align: 'right', sort: (f) => f.ratings, cell: (f) => formatCount(f.ratings) },
                { key: 'low', header: 'Low', align: 'right', sort: (f) => f.low_ratings, cell: (f) => formatCount(f.low_ratings) },
              ]}
            />
          )}
        </Section>
      </div>
    </div>
  )
}
