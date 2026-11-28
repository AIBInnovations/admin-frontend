import { useMemo, type ReactNode } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/format'
import { DateRangeFilter, shiftDay, type DateRange } from '@/components/common/DateRangeFilter'
import { Skeleton } from '@/components/ui/skeleton'
import { analyticsService, type Granularity, type Overview, type ReportQuery, type SaleType } from '@/services/analytics.service'
import { ChartCard, DataTableView } from '@/components/charts/ChartCard'
import { Delta } from '@/components/charts/Delta'
import { RankedBars } from '@/components/charts/RankedBars'
import { TrendChart } from '@/components/charts/TrendChart'
import { PER, bucketLabel, compactINR, formatCount, formatINR, signedINR, spanLabel, tickLabel } from '@/components/charts/format'
import { KIND_COLOR, KIND_NAME, TYPE_COLOR, TYPE_NAME } from '@/components/charts/palette'
import { useReport } from '@/components/charts/useReport'
import { describeRange, rangeInSentence, type AnalyticsState } from '../useAnalyticsState'
import { Picker, useReportOptions } from './FilterBar'
import { StaleNotice, ReportError, Segmented } from './bits'

type Mode = 'period' | 'package' | 'subject'
const A_COLOR = 'var(--chart-package)'
const B_COLOR = 'var(--chart-book)'
const ID = /^[0-9a-f]{24}$/i
const DAY = /^\d{4}-\d{2}-\d{2}$/

const ROWS: { key: keyof Overview['current']; label: string; money?: boolean; upIsGood?: boolean }[] = [
  { key: 'collected', label: 'Collected', money: true },
  { key: 'net', label: 'Net of GST', money: true },
  { key: 'orders', label: 'Orders' },
  { key: 'buyers', label: 'Buyers' },
  { key: 'new_buyers', label: 'First-time buyers' },
  { key: 'average_order', label: 'Average order', money: true },
  { key: 'discount', label: 'Discounts given', money: true },
  { key: 'reversed_amount', label: 'Refunded or revoked', money: true, upIsGood: false },
]

function Side({ tag, color, children }: { tag: string; color: string; children: ReactNode }) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-3 shadow-card">
      <p className="mb-2 flex items-center gap-2 text-[13px] font-medium"><span aria-hidden="true" className="chart-swatch h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />{tag}</p>
      {children}
    </div>
  )
}

/**
 * Two periods, two packages or two subjects side by side: the same figures,
 * one trend with both lines, and what each was made of. Everything is in the
 * URL, so a comparison can be shared.
 */
export function CompareTab({ state }: { state: AnalyticsState }) {
  const options = useReportOptions()
  const p = state.params
  const mode: Mode = (['period', 'package', 'subject'] as Mode[]).includes(p.get('cmp') as Mode) ? (p.get('cmp') as Mode) : 'period'
  const base: ReportQuery = { ...state.query, compare: 'none' }
  const { from, to } = state.query

  // B for periods: the chosen range ("brange=all" when B is all time), else the same number of days just before A
  const days = from && to ? Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1 : null
  const bRange: DateRange = p.get('brange') === 'all'
    ? { from: '', to: '', preset: 'all' }
    : DAY.test(p.get('bfrom') || '') && DAY.test(p.get('bto') || '') && p.get('bfrom')! <= p.get('bto')!
      ? { from: p.get('bfrom')!, to: p.get('bto')!, preset: 'custom' }
      : from && days ? { from: shiftDay(from, -days), to: shiftDay(from, -1), preset: 'custom' } : { from: '', to: '', preset: 'all' }
  const pa = ID.test(p.get('pa') || '') ? p.get('pa')! : ''
  const pb = ID.test(p.get('pb') || '') ? p.get('pb')! : ''
  const sa = ID.test(p.get('sa') || '') || p.get('sa') === 'none' ? p.get('sa')! : ''
  const sb = ID.test(p.get('sb') || '') || p.get('sb') === 'none' ? p.get('sb')! : ''

  const [qa, qb]: [ReportQuery | null, ReportQuery | null] = mode === 'period'
    ? [base, { ...base, from: bRange.from, to: bRange.to }]
    : mode === 'package'
      ? [pa ? { ...base, package_id: pa, type: '', subject_id: '', package_type: '', tier: '' } : null, pb ? { ...base, package_id: pb, type: '', subject_id: '', package_type: '', tier: '' } : null]
      : [sa ? { ...base, subject_id: sa, package_id: '', tier: '' } : null, sb ? { ...base, subject_id: sb, package_id: '', tier: '' } : null]

  const key = JSON.stringify([mode, qa, qb])
  const ready = !!qa && !!qb
  const both = useReport(ready ? `cmp${key}` : null, async () => {
    // Asked for in the same moment, so they travel as one request
    const [oa, ob, ta, tb, xa, xb] = await Promise.all([
      analyticsService.overview(qa!), analyticsService.overview(qb!),
      analyticsService.timeseries({ ...qa!, split: 'none' }), analyticsService.timeseries({ ...qb!, split: 'none' }),
      mode === 'package' ? analyticsService.packages(qa!) : mode === 'subject' ? analyticsService.subjects(qa!) : Promise.resolve(null),
      mode === 'package' ? analyticsService.packages(qb!) : mode === 'subject' ? analyticsService.subjects(qb!) : Promise.resolve(null),
    ])
    // The trend lays A and B over each other point by point, so both need the same bucket size.
    // Two ranges of different lengths can resolve to different ones; ask again with the coarser.
    const fineToCoarse: Granularity[] = ['day', 'week', 'month', 'year']
    let [ra, rb] = [ta, tb]
    if (ta.granularity !== tb.granularity) {
      const g = fineToCoarse.indexOf(ta.granularity) > fineToCoarse.indexOf(tb.granularity) ? ta.granularity : tb.granularity
      ;[ra, rb] = await Promise.all([
        ta.granularity === g ? ta : analyticsService.timeseries({ ...qa!, split: 'none', granularity: g }),
        tb.granularity === g ? tb : analyticsService.timeseries({ ...qb!, split: 'none', granularity: g }),
      ])
    }
    return { oa, ob, ta: ra, tb: rb, xa, xb }
  })
  const d = both.data

  const pkgName = (id: string) => options?.packages.find((x) => x.package_id === id)?.name ?? 'Package'
  const subName = (id: string) => (id === 'none' ? 'No subject' : options?.subjects.find((x) => x.subject_id === id)?.name ?? 'Subject')
  const labelA = mode === 'period' ? (from && to ? spanLabel(from, to) : describeRange(state.range)) : mode === 'package' ? (pa ? pkgName(pa) : 'Choose a package') : (sa ? subName(sa) : 'Choose a subject')
  const labelB = mode === 'period' ? (bRange.from ? spanLabel(bRange.from, bRange.to) : 'All time') : mode === 'package' ? (pb ? pkgName(pb) : 'Choose a package') : (sb ? subName(sb) : 'Choose a subject')

  const set = (changes: Record<string, string | null>) => state.update({ ...changes }, { push: true })
  const swap = () => (mode === 'package' ? set({ pa: pb || null, pb: pa || null }) : mode === 'subject' ? set({ sa: sb || null, sb: sa || null }) : undefined)

  // One trend, both lines. Two periods line up day for day; two products share their dates.
  const trend = useMemo(() => {
    if (!d) return null
    const g = d.ta.granularity
    const n = Math.max(d.ta.points.length, d.tb.points.length)
    const pick = (pts: typeof d.ta.points, i: number) => (i < pts.length ? pts[i].collected : null)
    return {
      g,
      ticks: Array.from({ length: n }, (_, i) => (mode === 'period' ? `${g === 'day' ? 'Day' : g === 'week' ? 'Week' : g === 'month' ? 'Month' : 'Year'} ${i + 1}` : d.ta.points[i] ? tickLabel(d.ta.points[i], g) : '')),
      labels: Array.from({ length: n }, (_, i) => (mode === 'period' ? [d.ta.points[i] && bucketLabel(d.ta.points[i], g), d.tb.points[i] && bucketLabel(d.tb.points[i], d.tb.granularity)].filter(Boolean).join(' and ') : d.ta.points[i] ? bucketLabel(d.ta.points[i], g) : '')),
      a: Array.from({ length: n }, (_, i) => pick(d.ta.points, i)),
      b: Array.from({ length: n }, (_, i) => pick(d.tb.points, i)),
    }
  }, [d, mode])

  const splits = (side: 'a' | 'b') => {
    if (!d) return []
    if (mode === 'period') {
      const o = side === 'a' ? d.oa : d.ob
      return o.by_type.filter((r) => r.collected > 0).map((r) => ({ key: r.type, name: TYPE_NAME[r.type as SaleType], value: r.collected, color: TYPE_COLOR[r.type as SaleType], hint: `${formatCount(r.orders)} orders` }))
    }
    const x = side === 'a' ? d.xa : d.xb
    if (mode === 'package' && x && 'rows' in x && x.rows[0] && 'tiers' in x.rows[0]) {
      return x.rows[0].tiers.map((t) => ({ key: t.key, name: t.tier_duration_days ? formatDuration(t.tier_duration_days) : t.tier_name || 'No plan recorded', value: t.collected, color: side === 'a' ? A_COLOR : B_COLOR, hint: `${formatCount(t.orders)} orders` }))
    }
    if (mode === 'subject' && x && 'columns' in x) {
      const row = x.rows.find((r) => (r.subject_id ?? 'none') === (side === 'a' ? sa : sb))
      if (!row) return []
      const kinds: { key: string; name: string; value: number; color: string; hint: string }[] = (['theory', 'practical', 'combo'] as const).map((k) => ({ key: k, name: KIND_NAME[k], value: row[k].collected, color: KIND_COLOR[k], hint: `${formatCount(row[k].orders)} orders` }))
      return kinds
        .concat([{ key: 'other', name: 'Everything else', value: Math.max(0, row.collected - row.theory.collected - row.practical.collected - row.combo.collected), color: 'var(--chart-rest)', hint: 'Other packages and products' }]).filter((r) => r.value > 0)
    }
    return []
  }

  const subjects = (options?.subjects ?? []).map((s) => ({ value: s.subject_id, label: s.name, hint: s.is_active ? undefined : 'Inactive' }))
  const packages = (options?.packages ?? []).filter((x) => x.is_active || x.package_id === pa || x.package_id === pb).map((x) => ({ value: x.package_id, label: x.name, hint: options?.subjects.find((s) => s.subject_id === x.subject_id)?.name ?? 'No subject' }))
  const loading = ready && both.loading

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Compare" value={mode} onChange={(m) => set({ cmp: m === 'period' ? null : m })} options={[{ value: 'period', label: 'Two periods' }, { value: 'package', label: 'Two packages' }, { value: 'subject', label: 'Two subjects' }]} />
        <p className="text-[13px] text-muted-foreground">{mode === 'period' ? 'A is the range above; pick any range for B.' : `Both use the range above (${rangeInSentence(state.range)}).`}</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        <Side tag="A" color={A_COLOR}>
          {mode === 'period' && <p className="flex h-9 items-center text-sm font-medium">{labelA}</p>}
          {mode === 'package' && <Picker label="Package" all="Choose a package" value={pa} onChange={(v) => set({ pa: v || null })} choices={packages} className="w-full" />}
          {mode === 'subject' && <Picker label="Subject" all="Choose a subject" value={sa} onChange={(v) => set({ sa: v || null })} choices={subjects} className="w-full" />}
        </Side>
        {mode !== 'period' && (
          <button type="button" onClick={swap} className="inline-flex h-9 items-center justify-center gap-1.5 self-center rounded-md border border-input bg-card px-3 text-[13px] text-muted-foreground hover:text-foreground" aria-label="Swap A and B">
            <ArrowLeftRight aria-hidden="true" className="h-4 w-4" /><span className="md:sr-only">Swap</span>
          </button>
        )}
        <Side tag="B" color={B_COLOR}>
          {mode === 'period' && <DateRangeFilter value={bRange} onChange={(r) => set(r.preset === 'all' || !r.from ? { bfrom: null, bto: null, brange: 'all' } : { bfrom: r.from, bto: r.to, brange: null })} className="w-full" />}
          {mode === 'package' && <Picker label="Package" all="Choose a package" value={pb} onChange={(v) => set({ pb: v || null })} choices={packages} className="w-full" />}
          {mode === 'subject' && <Picker label="Subject" all="Choose a subject" value={sb} onChange={(v) => set({ sb: v || null })} choices={subjects} className="w-full" />}
        </Side>
      </div>

      {!ready ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">Choose {mode === 'package' ? 'two packages' : 'two subjects'} to see them side by side.</div>
      ) : both.error && !d ? <ReportError message={both.error} onRetry={both.reload} /> : (
        <>
          <StaleNotice report={both} />
          <section aria-labelledby="cmp-figures" className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-card transition-opacity', (both.refreshing || both.stale) && 'opacity-60')} id="focus-compare">
            <h2 id="cmp-figures" className="px-5 pt-5 font-display text-[17px] font-semibold leading-snug tracking-[-0.01em] sm:px-6">Side by side</h2>
            <div className="pg-scroll-x overflow-x-auto" role="region" aria-label="Side by side figures" tabIndex={0}>
              <table className="mt-2 w-full min-w-[520px] text-sm">
                <caption className="sr-only">{`${labelA} (A) against ${labelB} (B)`}</caption>
                <thead>
                  <tr className="border-y border-border bg-muted/40 text-[13px] text-muted-foreground">
                    <th scope="col" className="px-5 py-2 text-left font-medium">Figure</th>
                    <th scope="col" className="px-4 py-2 text-right font-medium"><span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ background: A_COLOR }} /><span className="max-w-[220px] truncate">A: {labelA}</span></span></th>
                    <th scope="col" className="px-4 py-2 text-right font-medium"><span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-[3px]" style={{ background: B_COLOR }} /><span className="max-w-[220px] truncate">B: {labelB}</span></span></th>
                    <th scope="col" className="px-5 py-2 text-right font-medium">A against B</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => {
                    const a = Number(d?.oa.current[r.key] ?? 0)
                    const b = Number(d?.ob.current[r.key] ?? 0)
                    // One format in both columns, exact, so the two read against each other
                    const fmt = (n: number) => (r.money ? formatINR(n, { whole: true }) : formatCount(n))
                    return (
                      <tr key={r.key} className="border-b border-border last:border-0">
                        <th scope="row" className="whitespace-nowrap px-5 py-2.5 text-left font-normal text-muted-foreground">{r.label}</th>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{loading ? <Skeleton className="ml-auto h-4 w-20" /> : fmt(a)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{loading ? <Skeleton className="ml-auto h-4 w-20" /> : fmt(b)}</td>
                        <td className="px-5 py-2.5 text-right">
                          {loading ? <Skeleton className="ml-auto h-4 w-16" /> : (
                            <span className="inline-flex items-center gap-2 tabular-nums">
                              <span className="text-[13px] text-muted-foreground">{r.money ? signedINR(a - b) : `${a - b > 0 ? '+' : ''}${formatCount(a - b)}`}</span>
                              <Delta now={a} before={b} upIsGood={r.upIsGood !== false} neutral={r.key === 'discount'} versus={`B, ${labelB}`} />
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <ChartCard
            id="compare-trend"
            title="Revenue over time, A and B"
            description={trend ? `₹ collected, GST included, ${PER[trend.g]}.${mode === 'period' ? ' The two periods are laid over each other from their first day.' : ''}` : '₹ collected, GST included'}
            loading={loading}
            refreshing={(both.refreshing || both.stale)}
            skeleton="trend"
            height={280}
            legend={[{ key: 'a', name: `A: ${labelA}`, color: A_COLOR, shape: 'line' }, { key: 'b', name: `B: ${labelB}`, color: B_COLOR, shape: 'line' }]}
            empty={d && d.oa.current.orders === 0 && d.ob.current.orders === 0 && <p>Neither side sold anything in this range.</p>}
            exportName={`compare-${mode}`}
            csv={trend ? () => ({ header: ['Point', `A: ${labelA} (INR)`, `B: ${labelB} (INR)`], rows: trend.labels.map((l, i) => [l, trend.a[i], trend.b[i]]) }) : undefined}
            table={trend && (
              <DataTableView caption="A and B over time" rows={trend.labels.map((_, i) => i)} rowKey={(i) => String(i)} columns={[
                { header: 'Point', cell: (i) => trend.labels[i] },
                { header: 'A', align: 'right', cell: (i) => (trend.a[i] === null ? '–' : formatINR(trend.a[i])) },
                { header: 'B', align: 'right', cell: (i) => (trend.b[i] === null ? '–' : formatINR(trend.b[i])) },
              ]} />
            )}
          >
            {trend && (
              <TrendChart
                label="Revenue over time, A against B"
                height={280}
                ticks={trend.ticks}
                labels={trend.labels}
                series={[{ key: 'a', name: 'A', color: A_COLOR, kind: 'area', values: trend.a }, { key: 'b', name: 'B', color: B_COLOR, kind: 'line', values: trend.b }]}
                format={(n) => formatINR(n, { whole: true })}
                axisFormat={compactINR}
              />
            )}
          </ChartCard>

          <div className="grid gap-6 md:grid-cols-2">
            {(['a', 'b'] as const).map((side) => (
              <ChartCard
                key={side}
                id={`compare-split-${side}`}
                title={`${side.toUpperCase()}: ${side === 'a' ? labelA : labelB}`}
                description={mode === 'period' ? 'By product type' : mode === 'package' ? 'By plan length' : 'By package type'}
                loading={loading}
                refreshing={(both.refreshing || both.stale)}
                skeleton="bars"
                height={200}
                empty={d && splits(side).length === 0 && <p>Nothing sold.</p>}
                exportName={`compare-${side}`}
                csv={d ? () => ({ header: ['Part', 'Collected (INR)'], rows: splits(side).map((r) => [r.name, r.value]) }) : undefined}
              >
                <RankedBars unit="collected" format={(n) => formatINR(n, { whole: true })} max={Math.max(1, ...splits('a').map((r) => r.value), ...splits('b').map((r) => r.value))} rows={splits(side)} />
              </ChartCard>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
