import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { RunRate as RunRateData } from '@/services/analytics.service'
import { ChartCard, DataTableView } from '@/components/charts/ChartCard'
import { Delta } from '@/components/charts/Delta'
import { TrendChart, type TrendSeries } from '@/components/charts/TrendChart'
import { ChartSkeleton } from '@/components/charts/ChartSkeleton'
import { ProgressRing } from '@/components/charts/ProgressRing'
import { CountUp } from '@/components/charts/motion'
import { compactINR, dayLabel, formatINR, monthLabel, plural, spanLabel } from '@/components/charts/format'
import type { ReportState } from '@/components/charts/useReport'
import { ReportError, StaleNotice } from './bits'

const money = (n: number) => formatINR(n, { whole: true })
const dayNum = (d: string) => Number(d.slice(8, 10))

/** The method, in words, with its own numbers. */
export function methodText(r: RunRateData): string {
  const p = r.projection
  const days = Math.round(r.elapsed_days * 10) / 10
  const base = p.method === 'month_pace'
    ? `Collected so far ÷ ${days} days gone (today counted by the hour) = ${money(p.pace_per_day)} a day, carried over the ${Math.round(r.days_left * 10) / 10} days left.`
    : `Fewer than 7 days have gone, so the pace is the average day of ${spanLabel(p.basis.from, p.basis.to)}: ${money(p.pace_per_day)} a day, carried over the ${Math.round(r.days_left * 10) / 10} days left.`
  return `${base} The likely range is how much the last 28 days moved from day to day (about 8 months in 10 end inside it).`
}

interface RunRateProps {
  report: ReportState<RunRateData>
  /** Without the chart, for the Dashboard. */
  compact?: boolean
  /** Take the height the row gives it (equal-height rows). */
  fill?: boolean
  revenueHref?: string | null
  className?: string
}

/**
 * Month to date and where the month is heading. The projection is labelled
 * an estimate everywhere it appears, with its method beside it.
 */
export function RunRate({ report, compact, revenueHref, className, fill }: RunRateProps) {
  const { data: r, loading, refreshing: loadingNewer, stale, error, reload } = report
  if (error && !r) return <ReportError message={error} onRetry={reload} className={className} />
  // A failed refresh keeps the last numbers, dimmed, under a notice
  const refreshing = loadingNewer || stale
  const month = r ? monthLabel(r.month.from.slice(0, 7)) : 'This month'
  const lastName = r ? monthLabel(r.last_month.from.slice(0, 7)) : 'Last month'
  const p = r?.projection
  const scaleTop = r ? Math.max(p!.high, r.last_month.collected, r.mtd.collected, 1) : 1
  // Collected so far as a share of the month's estimate: a real proportion, so it gets a ring
  const share = r && p && p.collected > 0 ? Math.min(1, r.mtd.collected / p.collected) : null
  const sharePct = share === null ? null : Math.round(share * 100)
  const head = (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        {compact && (loading || !r
          ? <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
          : sharePct !== null && (
            <ProgressRing value={share!} size={64} stroke={6} label={`${sharePct}% of the estimate for ${month} collected so far`}>
              <span className="text-[13px]">{sharePct}%</span>
            </ProgressRing>
          ))}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-muted-foreground">Collected in {month} so far</p>
          {loading || !r
            ? <Skeleton className="mt-1.5 h-8 w-40" />
            : <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1" title={formatINR(r.mtd.collected)}>
                <span className="text-[28px] font-semibold leading-none tracking-[-0.02em]"><CountUp id={`runrate-${r.month.from}`} value={r.mtd.collected} format={compactINR} /></span>
                <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1" title={`Compared with ${spanLabel(r.same_point_last_month.from, r.same_point_last_month.to)}`}>
                  <Delta pill now={r.mtd.collected} before={r.same_point_last_month.collected} versus={`the same days of ${lastName} (${spanLabel(r.same_point_last_month.from, r.same_point_last_month.to)})`} />
                  {/* Its baseline differs from the Revenue card's (the days just before the 1st), so it is named */}
                  <span aria-hidden="true" className="text-[13px] text-muted-foreground">vs same days of {lastName}</span>
                </span>
              </p>}
          {r && <p className="mt-1.5 text-[13px] text-muted-foreground">{plural(r.mtd.orders, 'order')}. Same days of {lastName}: {compactINR(r.same_point_last_month.collected)}</p>}
          {!r && <Skeleton className="mt-2 h-4 w-56 max-w-full" />}
        </div>
      </div>
      <div className="rounded-lg border border-dashed border-[var(--chart-estimate)]/45 bg-[var(--chart-estimate-wash)] px-4 py-3">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
          <span className="inline-flex h-5 items-center rounded-full border border-[var(--chart-estimate)]/55 bg-card px-2 text-[11px] font-semibold text-foreground">Estimate</span>
          {month} at this pace
        </p>
        {loading || !r || !p
          ? <><Skeleton className="mt-2 h-6 w-32" /><Skeleton className="mt-2 h-3.5 w-48 max-w-full" /></>
          : <>
              <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5" title={formatINR(p.collected)}>
                <span className="text-lg font-semibold leading-tight tabular-nums">About {compactINR(p.collected)}</span>
                <span className="text-[13px] text-muted-foreground">likely {compactINR(p.low)} to {compactINR(p.high)}</span>
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">{lastName} closed at {compactINR(r.last_month.collected)}{p.versus_last_month !== null && <>; this would be {Math.abs(Math.round(p.versus_last_month))}% {p.versus_last_month >= 0 ? 'more' : 'less'}</>}</p>
            </>}
      </div>
      {compact && r && p && (
        <div aria-hidden="true" className="relative mx-0.5 h-2.5 rounded-full bg-[var(--chart-track)]">
          <span className="chart-grow absolute inset-y-0 left-0 rounded-full bg-[var(--chart-primary)]" style={{ width: `${(r.mtd.collected / scaleTop) * 100}%` }} />
          <span className="absolute inset-y-0 rounded-r-full bg-[var(--chart-estimate)] opacity-40" style={{ left: `${(r.mtd.collected / scaleTop) * 100}%`, width: `${Math.max(0, (p.collected - r.mtd.collected) / scaleTop) * 100}%` }} />
          <span className="absolute -top-1.5 h-[22px] w-[3px] -translate-x-1/2 rounded-full border border-card bg-foreground/75" style={{ left: `${(r.last_month.collected / scaleTop) * 100}%` }} title={`${lastName} total`} />
        </div>
      )}
      {compact && r && <p className="text-xs leading-5 text-muted-foreground">Bar: collected so far{sharePct !== null ? ` (${sharePct}% of the estimate)` : ''}, then the estimate; the tick is {lastName}'s total.</p>}
      {compact && !r && <><Skeleton className="h-2.5 w-full rounded-full" /><Skeleton className="h-3.5 w-64 max-w-full" /></>}
    </div>
  )

  if (compact) {
    return (
      <section aria-labelledby="runrate-title" className={cn('flex min-w-0 flex-col rounded-xl border border-border bg-card shadow-card transition-opacity duration-150', fill && 'h-full', refreshing && 'opacity-80', className)}>
        <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          <h2 id="runrate-title" className="font-display text-[17px] font-semibold leading-snug tracking-[-0.01em]">Run-rate</h2>
          {revenueHref && <Link to={revenueHref} className="-mr-2 inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] font-medium text-primary transition-colors hover:bg-accent pointer-coarse:h-10">Open revenue<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>}
        </div>
        <div className="flex flex-1 flex-col px-5 pb-5 pt-4 sm:px-6">
          <StaleNotice report={report} className="mb-3" />
          {head}
          {!r && <Skeleton className="mt-4 h-4 w-32" />}
          {r && (
            <details className="group mt-auto pt-4 text-xs leading-5 text-muted-foreground">
              <summary className="cursor-pointer select-none font-medium text-foreground marker:text-muted-foreground">How it is estimated</summary>
              <p className="mt-1">{methodText(r)}</p>
            </details>
          )}
        </div>
      </section>
    )
  }

  // Cumulative: actual up to today, the estimate from today to the month's end, last month for reference
  const days = r ? r.month.days : 30
  const labels = Array.from({ length: days }, (_, i) => (r ? dayLabel(`${r.month.from.slice(0, 8)}${String(i + 1).padStart(2, '0')}`) : String(i + 1)))
  const ticks = Array.from({ length: days }, (_, i) => String(i + 1))
  const series: TrendSeries[] = r ? [
    { key: 'last', name: lastName, color: 'var(--chart-previous)', kind: 'muted', values: ticks.map((_, i) => r.last_month_daily[i]?.cumulative ?? null) },
    { key: 'now', name: `${month} so far`, color: 'var(--chart-primary)', kind: 'area', values: ticks.map((_, i) => (i < r.daily.length ? r.daily[i].cumulative : null)) },
    {
      key: 'estimate', name: 'Estimate', color: 'var(--chart-estimate)', kind: 'estimate',
      values: ticks.map((_, i) => { const x = r.path.find((q) => dayNum(q.day) === i + 1); return x ? x.expected : null }),
      band: { low: ticks.map((_, i) => r.path.find((q) => dayNum(q.day) === i + 1)?.low ?? null), high: ticks.map((_, i) => r.path.find((q) => dayNum(q.day) === i + 1)?.high ?? null) },
    },
  ] : []
  return (
    <ChartCard
      id="runrate"
      className={className}
      fill={fill}
      title="Run-rate"
      description={r ? `${month}, collected so far and an estimate for the month (GST included). Filters apply; the date range does not.` : 'This month so far and an estimate for the month'}
      refreshing={refreshing}
      staleError={stale ? error : null}
      onRetry={reload}
      height={150}
      legend={r ? [{ key: 'now', name: `${month} so far`, color: 'var(--chart-primary)', shape: 'line' }, { key: 'estimate', name: 'Estimate', color: 'var(--chart-estimate)', shape: 'dash' }, { key: 'last', name: lastName, color: 'var(--chart-previous)', shape: 'dash' }] : []}
      action={revenueHref ? <Link to={revenueHref} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] font-medium text-primary hover:bg-accent pointer-coarse:h-10">Open revenue<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link> : undefined}
      exportName={`run-rate-${r?.month.from.slice(0, 7) ?? ''}`}
      csv={r ? () => ({
        header: ['Day', 'Collected (INR)', 'Running total (INR)', 'Estimate, running total (INR)', 'Likely low (INR)', 'Likely high (INR)', `${lastName} running total (INR)`],
        rows: ticks.map((_, i) => {
          const d = r.daily[i]; const e = r.path.find((q) => dayNum(q.day) === i + 1)
          return [`${r.month.from.slice(0, 8)}${String(i + 1).padStart(2, '0')}`, d?.collected ?? '', d?.cumulative ?? '', e?.expected ?? '', e?.low ?? '', e?.high ?? '', r.last_month_daily[i]?.cumulative ?? '']
        }),
      }) : undefined}
      table={r && (
        <DataTableView
          caption="Run-rate by day"
          rows={ticks.map((_, i) => i)}
          rowKey={(i) => String(i)}
          columns={[
            { header: 'Day', cell: (i) => labels[i] },
            { header: 'Running total', align: 'right', cell: (i) => (r.daily[i] ? formatINR(r.daily[i].cumulative) : '–') },
            { header: 'Estimate', align: 'right', cell: (i) => { const e = r.path.find((q) => dayNum(q.day) === i + 1); return e ? `${formatINR(e.expected)} (${compactINR(e.low)} to ${compactINR(e.high)})` : '–' } },
            { header: lastName, align: 'right', cell: (i) => (r.last_month_daily[i] ? formatINR(r.last_month_daily[i].cumulative) : '–') },
          ]}
        />
      )}
      footer={r && <p className="mt-3 text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">How it is estimated: </span>{methodText(r)}</p>}
    >
      <div className={cn('space-y-4', fill && 'flex flex-1 flex-col space-y-0 gap-4')}>
        {head}
        {loading || !r ? <ChartSkeleton shape="trend" height={150} label="run-rate" /> : (
          <TrendChart
            label={`${month}, running total against an estimate and ${lastName}`}
            height={150}
            fill={fill}
            ticks={ticks}
            labels={labels}
            series={series}
            format={(n) => money(n)}
            axisFormat={compactINR}
          />
        )}
      </div>
    </ChartCard>
  )
}
