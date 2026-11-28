import { useMemo, useState } from 'react'
import { analyticsService, type ReportQuery, type SaleType } from '@/services/analytics.service'
import { ChartCard, ChartHeadline, DataTableView, type HeadlineItem, type LegendItem } from '@/components/charts/ChartCard'
import { TrendChart, type TrendSeries } from '@/components/charts/TrendChart'
import { PER, bucketLabel, compactCount, compactINR, formatCount, formatINR, plural, spanLabel, tickLabel } from '@/components/charts/format'
import { TYPE_COLOR, TYPE_NAME } from '@/components/charts/palette'
import { trailingAverage, withoutBucket } from '@/components/charts/rolling'
import { useReport } from '@/components/charts/useReport'
import { istToday, shiftDay } from '@/components/common/DateRangeFilter'
import { ReportError, Segmented } from './bits'

export type Metric = 'collected' | 'net' | 'orders'
const METRIC: Record<Metric, { name: string; title: string; unit: string; word: string }> = {
  collected: { name: 'Collected', title: 'Revenue over time', unit: '₹ collected, GST included', word: 'collected' },
  net: { name: 'Net', title: 'Net revenue over time', unit: '₹ without GST', word: 'net of GST' },
  orders: { name: 'Orders', title: 'Orders over time', unit: 'number of orders', word: 'orders' },
}

/**
 * How a daily series is drawn. trend: each day a soft column, the line its
 * trailing 7-day average (the previous period's too). daily: the columns and
 * the previous period's own days. Weekly and monthly buckets keep one plain line.
 */
type Shape = 'trend' | 'daily'

/** Sentence case: "Number of orders, per day." */
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

interface SalesTrendProps {
  query: ReportQuery
  /** A fixed title, or one per measure ("Orders, last 30 days"); it also names the CSV and PNG. */
  title?: string | ((metric: Metric) => string)
  /** Offer "By product type" (only useful when no single type is chosen). */
  byType?: boolean
  action?: React.ReactNode
  height?: number
  /** Opens what a bucket is made of. */
  onOpen?: (p: { from: string; to: string }) => void
  /** Take the height the row gives it (equal-height rows); `height` is the minimum. */
  fill?: boolean
}

/** Revenue, net or orders over time, against the previous period, or stacked by product type. */
export function SalesTrend({ query, title: titleFor, byType, action, height, onOpen, fill }: SalesTrendProps) {
  const [metric, setMetric] = useState<Metric>('collected')
  const [view, setView] = useState<'total' | 'type'>('total')
  const [shape, setShape] = useState<Shape>('trend')
  const today = istToday()
  const stacked = !!byType && view === 'type'
  const q = { ...query, split: stacked ? ('type' as const) : ('none' as const) }
  const { data, loading, refreshing, stale, error, reload } = useReport(JSON.stringify(q), () => analyticsService.timeseries(q))

  const chart = useMemo(() => {
    if (!data) return null
    const g = data.granularity
    const labels = data.points.map((p) => bucketLabel(p, g))
    const ticks = data.points.map((p) => tickLabel(p, g))
    const asTypes = data.split === 'type'
    // "Previous 30 days": the comparison named by its length, as the owner reads it
    const days = data.previous_range?.days
    const previousName = days ? `Previous ${plural(days, 'day')}` : 'Previous period'
    const shownTypes = asTypes ? data.keys.filter((k) => (data.total.by?.[k]?.orders ?? 0) > 0) : []
    const pick = (o: { orders: number; collected: number }) => (metric === 'orders' ? o.orders : o.collected)
    const n = data.points.length
    const daily = g === 'day' && !asTypes
    // Today (IST) is still going: its column says "so far" and the lines stop at the last complete day
    const partial = daily && n > 0 && data.points[n - 1].from === today ? n - 1 : null
    const now = data.points.map((p) => p[metric])
    const prev = data.previous ? data.previous.map((p) => p[metric]) : null
    // Back to back with the period before, its last six days start this period's first average
    const touching = !!(prev && data.previous!.length && n && data.previous![data.previous!.length - 1].to === shiftDay(data.points[0].from, -1))
    const canTrend = daily && n >= 7 && (touching || n >= 14)
    const drawn: 'trend' | 'daily' | 'line' = asTypes ? 'line' : !daily ? 'line' : canTrend && shape === 'trend' ? 'trend' : 'daily'
    const avg = drawn === 'trend' ? withoutBucket(trailingAverage(now, 7, touching && prev ? prev : []), partial) : null
    const prevAvg = drawn === 'trend' && prev ? withoutBucket(trailingAverage(prev, 7), partial) : null
    const P = 'var(--chart-primary)'
    const B = 'var(--chart-previous)'
    const series: TrendSeries[] = asTypes
      ? shownTypes.map((k) => ({ key: k, name: TYPE_NAME[k as SaleType], color: TYPE_COLOR[k as SaleType], values: data.points.map((p) => pick(p.by![k])) }))
      : drawn === 'trend'
        ? [
            { key: 'day', name: METRIC[metric].name, color: P, kind: 'bars', values: now },
            { key: 'avg', name: '7-day average', color: P, kind: 'area', values: avg! },
            ...(prev ? [
              // Short names: they head tooltip rows on a phone; the legend names the period in full
              { key: 'beforeDay', name: 'Previous, same day', color: B, hidden: true, values: prev },
              { key: 'before', name: 'Previous, 7-day avg', color: B, kind: 'muted' as const, values: prevAvg! },
            ] : []),
          ]
        : drawn === 'daily'
          ? [
              { key: 'day', name: METRIC[metric].name, color: P, kind: 'bars', values: now },
              ...(prev ? [{ key: 'before', name: previousName, color: B, kind: 'muted' as const, values: withoutBucket(prev, partial) }] : []),
            ]
          : [
              { key: 'now', name: METRIC[metric].name, color: P, kind: 'area', values: now },
              ...(prev ? [{ key: 'before', name: previousName, color: B, kind: 'muted' as const, values: prev }] : []),
            ]
    return { g, labels, ticks, series, asTypes, previousName, drawn, canTrend, partial, now, avg, prevAvg }
  }, [data, metric, shape, today])

  const title = typeof titleFor === 'function' ? titleFor(stacked && metric === 'net' ? 'collected' : metric) : titleFor
  if (error && !data) return <ReportError message={error} onRetry={reload} />
  // Orders averages print one decimal (3.4 orders a day); money stays in whole rupees
  const fmt = metric === 'orders' ? (n: number) => formatCount(Math.round(n * 10) / 10) : (n: number) => formatINR(n, { whole: true })
  const axis = metric === 'orders' ? compactCount : compactINR
  // By type stacks collected (or orders); its totals follow what is drawn
  const shownMetric: Metric = stacked && metric === 'net' ? 'collected' : metric
  const total = data ? data.total[shownMetric] : 0
  const prevTotal = data?.previous ? data.previous.reduce((n, p) => n + p[shownMetric], 0) : null
  const nothing = !!data && data.total.orders === 0 && !(prevTotal && prevTotal > 0)
  // Keys mirror the marks: a soft column for the days, a line for an average, dashed for the previous period
  const legend: LegendItem[] = !chart ? [] : chart.drawn === 'trend'
    ? [
        { key: 'day', name: 'Daily', color: 'var(--chart-primary)', shape: 'column' },
        { key: 'avg', name: '7-day average', color: 'var(--chart-primary)', shape: 'line' },
        ...(chart.series.some((s) => s.key === 'before') ? [{ key: 'before', name: `${chart.previousName} (7-day avg)`, color: 'var(--chart-previous)', shape: 'dash' as const }] : []),
      ]
    : chart.series.filter((s) => !s.hidden).map((s) => ({ key: s.key, name: chart.drawn === 'daily' && s.kind === 'bars' ? 'Daily' : s.name, color: s.color, shape: chart.asTypes ? 'box' : s.kind === 'bars' ? 'column' : s.kind === 'muted' ? 'dash' : 'line' }))
  const per = data ? PER[data.granularity] : ''
  // Each series with its own total, beside its key. An average has no total, so the 7-day view names only.
  const items: HeadlineItem[] = chart && data ? legend.map((l) => ({
    ...l,
    value: chart.drawn === 'trend' ? undefined
      : chart.asTypes ? fmt(data.total.by?.[l.key]?.[shownMetric === 'orders' ? 'orders' : 'collected'] ?? 0)
        : l.shape === 'dash' ? (prevTotal === null ? undefined : fmt(prevTotal)) : fmt(total),
  })) : []
  const soFar = chart && chart.partial !== null ? chart.now[chart.partial] : null
  const summary = data ? `${sentence(METRIC[metric].unit)}, ${per}. Total ${fmt(total)}${prevTotal !== null ? `, previous period ${fmt(prevTotal)}` : ''}.` : METRIC[metric].unit

  return (
    <ChartCard
      title={title ?? METRIC[metric].title}
      description={sentence(data ? `${METRIC[metric].unit}, ${per}.${data.granularity_adjusted ? ' Grouped more coarsely so the chart stays readable.' : ''}` : METRIC[metric].unit)}
      exportSubtitle={summary}
      id="trend"
      legend={legend}
      fill={fill}
      headline={data && chart ? (
        <ChartHeadline
          value={fmt(total)}
          unit={METRIC[shownMetric].word}
          delta={prevTotal !== null ? { now: total, before: prevTotal, versus: chart.previousName.toLowerCase() } : undefined}
          items={items}
          note={soFar !== null ? `Today so far ${fmt(soFar)}` : undefined}
        />
      ) : undefined}
      loading={loading}
      refreshing={refreshing}
      height={height ?? 260}
      skeleton="trend"
      exportName={title ?? METRIC[metric].title}
      csv={data ? () => ({
        header: ['From', 'To', 'Orders', 'Collected (INR)', 'Net of GST (INR)', ...(data.split === 'type' ? data.keys.map((k) => `${TYPE_NAME[k as SaleType]} (INR)`) : []), ...(data.previous ? ['Previous period (INR)'] : []), ...(chart?.avg ? [`${METRIC[metric].name}, 7-day average`] : []), ...(chart?.prevAvg ? [`Previous period ${METRIC[metric].name.toLowerCase()}, 7-day average`] : [])],
        rows: data.points.map((p, i) => [p.from, p.to, p.orders, p.collected, p.net, ...(data.split === 'type' ? data.keys.map((k) => p.by![k].collected) : []), ...(data.previous ? [data.previous[i]?.collected ?? null] : []), ...(chart?.avg ? [chart.avg[i] === null ? null : Math.round(chart.avg[i]! * 100) / 100] : []), ...(chart?.prevAvg ? [chart.prevAvg[i] === null ? null : Math.round(chart.prevAvg[i]! * 100) / 100] : [])]),
      }) : undefined}
      action={
        <>
          {byType && <Segmented label="Split" value={view} onChange={setView} options={[{ value: 'total', label: 'Total' }, { value: 'type', label: 'By type' }]} />}
          <Segmented
            label="Measure"
            value={stacked && metric === 'net' ? 'collected' : metric}
            onChange={setMetric}
            options={stacked ? [{ value: 'collected', label: 'Collected' }, { value: 'orders', label: 'Orders' }] : [{ value: 'collected', label: 'Collected' }, { value: 'net', label: 'Net' }, { value: 'orders', label: 'Orders' }]}
          />
          {chart?.canTrend && !chart.asTypes && <Segmented label="Daily or 7-day trend" value={shape} onChange={setShape} options={[{ value: 'daily', label: 'Daily' }, { value: 'trend', label: '7-day trend' }]} />}
          {action}
        </>
      }
      empty={nothing && <p>No sales in this period.</p>}
      table={data && (
        <DataTableView
          caption={`${METRIC[metric].title}, ${per}`}
          rows={data.points}
          rowKey={(p) => p.key}
          columns={[
            { header: 'Period', cell: (p) => bucketLabel(p, data.granularity), footer: 'Total' },
            { header: 'Orders', align: 'right', cell: (p) => formatCount(p.orders), footer: formatCount(data.total.orders) },
            { header: 'Collected', align: 'right', cell: (p) => formatINR(p.collected), footer: formatINR(data.total.collected) },
            { header: 'Net of GST', align: 'right', cell: (p) => formatINR(p.net), footer: formatINR(data.total.net) },
            ...(data.split === 'type' ? data.keys.map((k) => ({ header: TYPE_NAME[k as SaleType], align: 'right' as const, cell: (p: (typeof data.points)[number]) => formatINR(p.by![k].collected), footer: formatINR(data.total.by![k].collected) })) : []),
            ...(data.previous ? [{ header: 'Previous period', align: 'right' as const, cell: (p: (typeof data.points)[number]) => formatINR(data.previous![data.points.indexOf(p)].collected), footer: formatINR(data.previous.reduce((n, p) => n + p.collected, 0)) }] : []),
            // The averages the lines draw, so every drawn value is readable without hovering
            ...(chart?.avg ? [{ header: `${METRIC[metric].name}, 7-day avg`, align: 'right' as const, cell: (p: (typeof data.points)[number]) => { const v = chart.avg![data.points.indexOf(p)]; return v === null ? '–' : fmt(v) } }] : []),
            ...(chart?.prevAvg ? [{ header: 'Previous, 7-day avg', align: 'right' as const, cell: (p: (typeof data.points)[number]) => { const v = chart.prevAvg![data.points.indexOf(p)]; return v === null ? '–' : fmt(v) } }] : []),
          ]}
        />
      )}
      staleError={stale ? error : null}
      onRetry={reload}
    >
      {chart && data && (
        <TrendChart
          label={`${METRIC[metric].title}, ${METRIC[metric].unit}, ${per}`}
          height={height ?? 260}
          fill={fill}
          ticks={chart.ticks}
          labels={chart.labels}
          series={chart.series}
          mode={chart.asTypes ? 'stack' : 'line'}
          format={fmt}
          axisFormat={axis}
          whole={metric === 'orders'}
          details={(i) => {
            const p = data.points[i]
            if (chart.asTypes) return [{ name: 'Total', value: fmt(p[metric === 'net' ? 'collected' : metric]) }]
            return [
              ...(metric === 'orders' ? [{ name: 'Collected', value: formatINR(p.collected, { whole: true }) }] : [{ name: 'Orders', value: plural(p.orders, 'order') }]),
              ...(data.previous ? [{ name: 'Previous dates', value: spanLabel(data.previous[i].from, data.previous[i].to) }] : []),
            ]
          }}
          onSelect={onOpen ? (i) => onOpen(data.points[i]) : undefined}
          selectHint={onOpen ? 'Click to open these purchases' : undefined}
          partial={chart.partial}
          partialName="Today so far"
          changeLabel={chart.drawn === 'trend' ? 'Change, 7-day avg' : 'Change'}
        />
      )}
    </ChartCard>
  )
}
