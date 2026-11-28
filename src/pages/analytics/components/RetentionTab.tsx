import { Link, useNavigate } from 'react-router-dom'
import { CalendarRange } from 'lucide-react'
import { Section } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { analyticsService, type RetentionReport } from '@/services/analytics.service'
import { ChartCard, DataTableView } from '@/components/charts/ChartCard'
import { CohortGrid } from '@/components/charts/CohortGrid'
import { RankedBars } from '@/components/charts/RankedBars'
import { ReportTable } from '@/components/charts/ReportTable'
import { SegmentBar } from '@/components/charts/SegmentBar'
import { formatCount, monthLabel, percent, plural } from '@/components/charts/format'
import { OUTCOME_COLOR, OUTCOME_INK, OUTCOME_NAME, OUTCOME_ORDER } from '@/components/charts/palette'
import { useReport } from '@/components/charts/useReport'
import { quickRange, rangeInSentence, type AnalyticsState } from '../useAnalyticsState'
import { StaleNotice, Figure, ReportError, TableSkeleton } from './bits'
import { planLabel } from './PackagesTable'

type PackageRow = RetentionReport['by_package'][number]

/** The renewal rate as a short bar and a number: the bar is never the only signal. */
function RateCell({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-muted-foreground">–</span>
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span aria-hidden="true" className="h-1.5 w-14 overflow-hidden rounded-full bg-[var(--chart-track)]"><span className="chart-grow block h-full rounded-full bg-[var(--out-renewed)]" style={{ width: `${rate}%` }} /></span>
      <span className="w-12 font-medium tabular-nums">{percent(rate)}</span>
    </span>
  )
}

export function RetentionTab({ state }: { state: AnalyticsState }) {
  const navigate = useNavigate()
  // Subject, package, plan and package type, as the tab shows them; never a product type left by another tab
  const q = { ...state.scopedQuery('retention'), compare: 'none' as const }
  const { data: d, loading, refreshing: loadingNewer, stale, error, reload } = useReport(`ret${JSON.stringify(q)}`, () => analyticsService.retention(q))
  // A failed refresh keeps the last numbers on screen: dimmed, under a notice with a retry
  const refreshing = loadingNewer || stale
  if (error && !d) return <ReportError message={error} onRetry={reload} />
  const t = d?.totals
  // Under about three months, few subscriptions end and cohorts cannot show anything
  const short = !!state.query.from && !!state.query.to && Date.parse(state.query.to) - Date.parse(state.query.from) < 85 * 86400000
  const common = { loading, refreshing }
  const parts = t ? OUTCOME_ORDER.map((k) => ({ key: k, name: OUTCOME_NAME[k], value: t[k], color: OUTCOME_COLOR[k], ink: OUTCOME_INK[k] })) : []
  const range = rangeInSentence(state.range)
  const salesOf = (r: PackageRow) => state.href({ tab: 'sales', subject: r.subject_id, package: r.package_id, tier: r.tier !== 'none' ? r.tier : null, kind: null, page: null }, '/analytics')
  const openMonth = (month: string) => {
    const [y, m] = month.split('-').map(Number)
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
    // That month's sales with every filter this view uses (subject, package, plan, package type, cross-filters)
    return state.href({ tab: 'sales', from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}`, range: null, page: null }, '/analytics')
  }

  return (
    <div className="space-y-6">
      <StaleNotice report={{ stale, error, reload }} />
      {short && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-accent/50 px-5 py-3">
          <p className="flex items-center gap-2 text-sm"><CalendarRange aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />Few subscriptions end in a short range, and cohorts need months to show anything.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => state.setRange(quickRange('365d'))}>Show the past year</Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Figure {...common} label="Subscriptions ended" count={t?.ended} as="count" hint={`Paid packages that ended, ${range}`} />
        <Figure {...common} label="Renewal rate" value={t ? (t.renewal_rate === null ? 'No data yet' : percent(t.renewal_rate)) : '—'} hint={t ? `${formatCount(t.renewed + t.via_combo)} renewed, ${formatCount(t.via_combo)} through a combo` : undefined} />
        <Figure {...common} label="Moved to another package" count={t?.switched} as="count" hint={t && t.ended ? `${percent((t.switched / t.ended) * 100)} of those that ended` : 'Instead of renewing'} />
        <Figure {...common} label="Nothing bought since" count={t?.lapsed} as="count" upIsGood={false} hint={t && t.ended ? `${percent((t.lapsed / t.ended) * 100)}; ${formatCount(t.other_only)} bought other products only` : 'Not renewed yet'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ChartCard
          id="outcomes"
          title="What students did when a subscription ended"
          description={`Paid package subscriptions that ended ${range}, by what the student bought next (up to today). Renewed means the same package again.`}
          loading={loading}
          refreshing={refreshing}
          skeleton="segment"
          height={120}
          empty={t && t.ended === 0 && <p>No paid subscription ended in this period.</p>}
          exportName="after-a-subscription-ends"
          csv={t ? () => ({ header: ['Outcome', 'Subscriptions', 'Share %'], rows: [...OUTCOME_ORDER.map((k) => [OUTCOME_NAME[k], t[k], t.ended ? Math.round((t[k] / t.ended) * 10000) / 100 : 0]), ['Total', t.ended, 100]] }) : undefined}
          table={t && (
            <DataTableView caption="After a subscription ended" rows={OUTCOME_ORDER} rowKey={(k) => k} columns={[
              { header: 'Outcome', cell: (k) => OUTCOME_NAME[k], footer: 'Ended' },
              { header: 'Subscriptions', align: 'right', cell: (k) => formatCount(t[k]), footer: formatCount(t.ended) },
              { header: 'Share', align: 'right', cell: (k) => (t.ended ? percent((t[k] / t.ended) * 100) : '–') },
            ]} />
          )}
          footer={t && t.renewed + t.via_combo > 0 && (
            <p className="mt-4 text-[13px] text-muted-foreground">
              Of the renewals, <span className="font-medium text-foreground">{formatCount(t.timing.early)}</span> came before the old one ended, {formatCount(t.timing.within_30)} within 30 days after, and {formatCount(t.timing.later)} later than that.
            </p>
          )}
        >
          {t && <SegmentBar parts={parts} unit="subscriptions that ended" />}
        </ChartCard>

        <ChartCard
          id="moved-to"
          title="Where they moved to"
          description="Students who bought a different package instead of renewing"
          loading={loading}
          refreshing={refreshing}
          skeleton="bars"
          height={200}
          empty={d && d.moved_to.length === 0 && <p>Nobody moved to another package.</p>}
          exportName="moved-to-package"
          csv={d ? () => ({ header: ['Package', 'Students'], rows: d.moved_to.map((m) => [m.name, m.students]) }) : undefined}
          table={d && <DataTableView caption="Where they moved to" rows={d.moved_to} rowKey={(m) => m.package_id ?? m.name} columns={[{ header: 'Package', cell: (m) => m.name }, { header: 'Students', align: 'right', cell: (m) => formatCount(m.students) }]} />}
        >
          <RankedBars unit="students" format={formatCount} rows={(d?.moved_to ?? []).map((m) => ({ key: m.package_id ?? m.name, name: m.name, value: m.students, color: 'var(--out-switched)', href: m.package_id ? state.href({ tab: 'sales', package: m.package_id, tier: null, subject: null, kind: null, page: null }, '/analytics') : undefined }))} />
        </ChartCard>
      </div>

      <Section
        id="focus-renewals"
        flush
        title="Renewal rate by package and plan"
        description="Each plan length is its own subscription. Open a row to see its sales."
      >
        {loading ? <TableSkeleton /> : (
          <ReportTable<PackageRow>
            caption="Renewal rate by package and plan"
            refreshing={refreshing}
            rows={d?.by_package ?? []}
            rowKey={(r) => `${r.package_id}:${r.tier}`}
            rowHref={(r) => (r.package_id ? salesOf(r) : null)}
            empty="No paid subscription ended in this period."
            initialSort={{ key: 'ended', desc: true }}
            maxHeight={520}
            columns={[
              { key: 'name', header: 'Package and plan', sort: (r) => r.name, cell: (r) => <><span className="block truncate font-medium" title={r.name}>{r.name}</span><span className="block text-xs text-muted-foreground">{planLabel(r)}</span></>, footer: 'Total' },
              { key: 'ended', header: 'Ended', align: 'right', sort: (r) => r.ended, cell: (r) => formatCount(r.ended), footer: formatCount(t?.ended) },
              { key: 'rate', header: 'Renewed', align: 'right', sort: (r) => r.renewal_rate ?? -1, cell: (r) => <RateCell rate={r.renewal_rate} />, footer: t ? <RateCell rate={t.renewal_rate} /> : undefined },
              { key: 'via', header: 'Through a combo', align: 'right', sort: (r) => r.via_combo, cell: (r) => formatCount(r.via_combo), footer: formatCount(t?.via_combo) },
              { key: 'moved', header: 'Moved', align: 'right', sort: (r) => r.switched, cell: (r) => formatCount(r.switched), footer: formatCount(t?.switched) },
              { key: 'other', header: 'Other products', align: 'right', sort: (r) => r.other_only, cell: (r) => formatCount(r.other_only), footer: formatCount(t?.other_only) },
              { key: 'lapsed', header: 'Nothing yet', align: 'right', sort: (r) => r.lapsed, cell: (r) => formatCount(r.lapsed), footer: formatCount(t?.lapsed) },
            ]}
          />
        )}
      </Section>

      <ChartCard
        id="cohorts"
        title="Cohorts: still subscribed, month by month"
        description="Students grouped by the month of their first paid package (with the filters above), and the share who still had paid access each month after. A dot is a month that has not come yet."
        loading={loading}
        refreshing={refreshing}
        skeleton="grid"
        height={260}
        empty={d && d.cohorts.length === 0 && <p>No first purchases in this period. Try a longer range.</p>}
        exportName="cohorts"
        csv={d ? () => ({ header: ['First paid package', 'Students', ...Array.from({ length: d.months }, (_, i) => `Month ${i + 1} %`)], rows: d.cohorts.map((c) => [c.month, c.students, ...c.cells.map((x) => x.rate)]) }) : undefined}
        footer={d && d.cohorts.length > 0 && <p className="mt-3 text-[13px] text-muted-foreground">Open a cohort month to see what sold that month. {plural(d.cohorts.reduce((s, c) => s + c.students, 0), 'student')} in {plural(d.cohorts.length, 'cohort')}.</p>}
      >
        {d && <CohortGrid rows={d.cohorts} months={d.months} onOpen={(m) => navigate(openMonth(m))} />}
      </ChartCard>

      <p className="text-[13px] text-muted-foreground">
        Renewed uses the same rule as <Link className="text-primary underline-offset-4 hover:underline" to={state.href({ tab: 'students' }, '/analytics')}>Subscriptions ending soon</Link>: the same package bought again, or a renewal marked on the purchase. Monthly cohorts follow IST calendar months ({d?.cohorts[0] ? `latest ${monthLabel(d.cohorts[0].month)}` : 'none yet'}).
      </p>
    </div>
  )
}
