import { videoAnalyticsService, type VideoQuery } from '@/services/videoAnalytics.service'
import { ChartCard, ChartHeadline, DataTableView } from '@/components/charts/ChartCard'
import { TrendChart } from '@/components/charts/TrendChart'
import { PER, bucketLabel, compactCount, dayLabel, formatCount, plural, spanLabel, tickLabel } from '@/components/charts/format'
import { useReport } from '@/components/charts/useReport'
import { useMediaQuery } from '@/hooks/useMediaQuery'

/**
 * Plays over time for a package, all packages or one video, from the play
 * events (so it starts on the day they were first recorded), with the previous
 * period dashed under it.
 */
export function ViewsChart({ query, title }: { query: VideoQuery; title: string }) {
  const q: VideoQuery = { from: query.from, to: query.to, compare: query.compare, granularity: query.granularity, subject_id: query.subject_id, package_id: query.package_id, video_id: query.video_id }
  const trend = useReport(`vt${JSON.stringify(q)}`, () => videoAnalyticsService.trend(q))
  const wide = useMediaQuery('(min-width: 1280px)')
  const d = trend.data
  const g = d?.granularity ?? 'day'
  const prev = d?.previous_points ?? null
  const previousName = d?.previous_range?.days ? `Previous ${plural(d.previous_range.days, 'day')}` : 'Previous period'
  const height = wide ? 300 : 240
  const since = d?.tracking_since
  // A range that starts before plays were first recorded cannot show those days' views
  const early = !!(d && since && (!d.range.from || d.range.from < since))
  return (
    <ChartCard
      title={title}
      description={d ? `Plays, ${PER[g]}. A play is one opening of the video player.` : 'Plays over time'}
      exportSubtitle={d ? `Plays, ${PER[g]}. Total ${formatCount(d.total.views)}${d.previous_total ? `, previous period ${formatCount(d.previous_total.views)}` : ''}.` : undefined}
      skeleton="trend"
      height={height}
      fill
      loading={trend.loading}
      refreshing={trend.refreshing || trend.stale}
      staleError={trend.stale ? trend.error : null}
      onRetry={trend.reload}
      exportName="video-views-over-time"
      headline={d && (
        <ChartHeadline
          value={formatCount(d.total.views)}
          unit={d.total.views === 1 ? 'view' : 'views'}
          delta={d.previous_total ? { now: d.total.views, before: d.previous_total.views, versus: previousName.toLowerCase() } : undefined}
          note={`${plural(d.total.viewers, 'viewer')}`}
        />
      )}
      empty={d && d.total.views === 0 && (d.previous_total?.views ?? 0) === 0 && (
        <p>{since ? `No plays in this period. Plays are recorded from ${dayLabel(since)}.` : 'No plays recorded yet.'}</p>
      )}
      footer={early && since && <p className="mt-2 text-[13px] text-muted-foreground">Plays are recorded from {dayLabel(since)}. Earlier views are only in the all-time counters.</p>}
      csv={d ? () => ({ header: ['From', 'To', 'Views', 'Unique viewers', ...(prev ? ['Previous period views'] : [])], rows: d.points.map((p, i) => [p.from, p.to, p.views, p.viewers, ...(prev ? [prev[i].views] : [])]) }) : undefined}
      table={d && (
        <DataTableView
          caption={title}
          rows={d.points}
          rowKey={(p) => p.key}
          columns={[
            { header: 'Period', cell: (p) => bucketLabel(p, g), footer: 'Total' },
            { header: 'Views', align: 'right', cell: (p) => formatCount(p.views), footer: formatCount(d.total.views) },
            { header: 'Unique viewers', align: 'right', cell: (p) => formatCount(p.viewers), footer: formatCount(d.total.viewers) },
            ...(prev ? [{ header: 'Previous period', align: 'right' as const, cell: (p: (typeof d.points)[number]) => formatCount(prev[d.points.indexOf(p)].views), footer: formatCount(d.previous_total?.views ?? 0) }] : []),
          ]}
        />
      )}
    >
      {d && (
        <TrendChart
          label={`Views, ${PER[g]}`}
          ticks={d.points.map((p) => tickLabel(p, g))}
          labels={d.points.map((p) => bucketLabel(p, g))}
          // Plays are whole counts per day and often sparse: columns, not a curve that draws needles.
          // The previous period is read out in the tooltip and compared in the headline.
          mode="column"
          series={[
            { key: 'now', name: 'Views', color: 'var(--chart-primary)', values: d.points.map((p) => p.views) },
            ...(prev ? [{ key: 'before', name: `${previousName}, same day`, color: 'var(--chart-previous)', hidden: true, values: prev.map((p) => p.views) }] : []),
          ]}
          format={formatCount}
          axisFormat={compactCount}
          whole
          fill
          height={height}
          details={(i) => [
            { name: 'Unique viewers', value: formatCount(d.points[i].viewers) },
            ...(prev ? [{ name: 'Previous dates', value: spanLabel(prev[i].from, prev[i].to) }] : []),
          ]}
        />
      )}
    </ChartCard>
  )
}
