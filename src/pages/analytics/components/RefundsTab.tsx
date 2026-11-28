import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Section } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { analyticsService, type RefundsReport, type SaleType } from '@/services/analytics.service'
import { ChartCard, DataTableView } from '@/components/charts/ChartCard'
import { ReportTable } from '@/components/charts/ReportTable'
import { TrendChart } from '@/components/charts/TrendChart'
import { PER, bucketLabel, compactCount, compactINR, formatCount, formatINR, percent, plural, tickLabel } from '@/components/charts/format'
import { TYPE_NAME } from '@/components/charts/palette'
import { useReport } from '@/components/charts/useReport'
import { purchasesHref, versusText, type AnalyticsState } from '../useAnalyticsState'
import { StaleNotice, Figure, ReportError, Segmented, TableSkeleton } from './bits'
import { NoResults } from './FilterBar'
import { planLabel } from './PackagesTable'

type ProductRow = RefundsReport['by_product'][number]
type Measure = 'rate' | 'orders' | 'disputes'

export function RefundsTab({ state }: { state: AnalyticsState }) {
  const { hasPermission } = useAuth()
  const [measure, setMeasure] = useState<Measure>('rate')
  const q = state.query
  const { data: d, loading, refreshing: loadingNewer, stale, error, reload } = useReport(`ref${JSON.stringify(q)}`, () => analyticsService.refunds(q))
  // A failed refresh keeps the last numbers on screen: dimmed, under a notice with a retry
  const refreshing = loadingNewer || stale
  if (error && !d) return <ReportError message={error} onRetry={reload} />
  const c = d?.current
  const p = d?.previous
  const versus = versusText(d?.previous_range) ?? undefined
  const common = { loading, refreshing, versus }
  const g = d?.granularity ?? 'day'
  const payments = hasPermission('payments.read') && state.linkable
  const cases = hasPermission('payments.read')
  const name = (r: ProductRow) => (r.type === 'package' ? r.name ?? 'Deleted package' : TYPE_NAME[r.type as SaleType])
  const open = (r: ProductRow) => (payments ? purchasesHref({ from: q.from, to: q.to, status: 'revoked', ...(r.type === 'package' ? { package: r.package_id, tier: r.tier ?? undefined } : { type: r.type }) }) : null)
  const nothing = !!d && c!.paid_orders === 0 && c!.disputes.opened === 0
  const chart = {
    rate: { title: 'Refund rate over time', unit: `Share of paid orders later refunded or revoked, by when they were bought, ${PER[g]}`, values: d?.points.map((x) => x.rate) ?? [], format: (n: number) => percent(n), color: 'var(--chart-low)' },
    orders: { title: 'Refunds and revocations over time', unit: `Orders later refunded or revoked, by when they were bought, ${PER[g]}`, values: d?.points.map((x) => x.reversed) ?? [], format: (n: number) => formatCount(n), color: 'var(--chart-low)' },
    disputes: { title: 'Bank disputes over time', unit: `Disputes opened, ${PER[g]}`, values: d?.points.map((x) => x.disputes) ?? [], format: (n: number) => formatCount(n), color: 'var(--chart-low)' },
  }[measure]

  return (
    <div className="space-y-6">
      <StaleNotice report={{ stale, error, reload }} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Figure {...common} label="Refund rate" value={c ? percent(c.rate) : '—'} now={c?.rate} before={p?.rate} upIsGood={false} hint={c ? `${formatCount(c.reversed_orders)} of ${plural(c.paid_orders, 'paid order')}` : undefined} />
        <Figure {...common} label="Refunded or revoked" count={c?.reversed_amount} now={c?.reversed_amount} before={p?.reversed_amount} upIsGood={false} hint={c ? `${percent(c.amount_rate)} of the money paid` : undefined} href={payments ? purchasesHref({ from: q.from, to: q.to, status: 'revoked', type: state.filters.type, subject: state.filters.subject, package: state.filters.package, tier: state.filters.tier }) : undefined} />
        <Figure {...common} label="Refunded" count={c?.refunded_orders} as="count" now={c?.refunded_orders} before={p?.refunded_orders} upIsGood={false} hint={c ? compactINR(c.refunded_amount) : undefined} />
        <Figure {...common} label="Revoked" count={c?.revoked_orders} as="count" now={c?.revoked_orders} before={p?.revoked_orders} upIsGood={false} hint={c ? compactINR(c.revoked_amount) : undefined} />
        <Figure {...common} label="Disputes opened" count={c?.disputes.opened} as="count" now={c?.disputes.opened} before={p?.disputes.opened} upIsGood={false} hint={c ? `${formatCount(c.disputes.won)} won, ${formatCount(c.disputes.lost)} lost, ${formatCount(c.disputes.open)} open` : undefined} href={cases ? '/commerce/cases?kind=dispute' : undefined} />
        <Figure {...common} label="Lost to disputes" count={c?.disputes.lost_amount} upIsGood={false} hint={c ? `Of ${compactINR(c.disputes.amount)} disputed` : undefined} />
      </div>

      <ChartCard
        id="refund-trend"
        title={chart.title}
        description={`${chart.unit}. A refund counts in the period the order was bought, as on the Overview.`}
        loading={loading}
        refreshing={refreshing}
        skeleton={measure === 'rate' ? 'trend' : 'columns'}
        height={260}
        action={<Segmented label="Measure" value={measure} onChange={setMeasure} options={[{ value: 'rate', label: 'Rate' }, { value: 'orders', label: 'Orders' }, { value: 'disputes', label: 'Disputes' }]} />}
        empty={nothing && <NoResults what="No paid orders or disputes in this period." onClear={state.activeFilters ? state.clearFilters : undefined} />}
        exportName="refunds-over-time"
        csv={d ? () => ({ header: ['From', 'To', 'Paid orders', 'Refunded or revoked', 'Rate %', 'Amount (INR)', 'Disputes opened'], rows: d.points.map((x) => [x.from, x.to, x.paid, x.reversed, x.rate, x.amount, x.disputes]) }) : undefined}
        table={d && (
          <DataTableView caption="Refunds over time" rows={d.points} rowKey={(x) => x.key} columns={[
            { header: 'Period', cell: (x) => bucketLabel(x, g), footer: 'Total' },
            { header: 'Paid orders', align: 'right', cell: (x) => formatCount(x.paid), footer: formatCount(c!.paid_orders) },
            { header: 'Refunded or revoked', align: 'right', cell: (x) => formatCount(x.reversed), footer: formatCount(c!.reversed_orders) },
            { header: 'Rate', align: 'right', cell: (x) => (x.rate === null ? '–' : percent(x.rate)), footer: percent(c!.rate) },
            { header: 'Amount', align: 'right', cell: (x) => formatINR(x.amount), footer: formatINR(c!.reversed_amount) },
            { header: 'Disputes', align: 'right', cell: (x) => formatCount(x.disputes), footer: formatCount(c!.disputes.opened) },
          ]} />
        )}
      >
        {d && (
          <TrendChart
            label={`${chart.title}, ${chart.unit}`}
            ticks={d.points.map((x) => tickLabel(x, g))}
            labels={d.points.map((x) => bucketLabel(x, g))}
            mode={measure === 'rate' ? 'line' : 'column'}
            // A share of a handful of orders a day: straight segments, so no curve invents in-between days
            curve="linear"
            series={[{ key: measure, name: measure === 'rate' ? 'Refund rate' : measure === 'orders' ? 'Refunded or revoked' : 'Disputes opened', color: chart.color, kind: 'line', values: chart.values }]}
            format={chart.format}
            axisFormat={measure === 'rate' ? (n) => `${Math.round(n)}%` : compactCount}
            whole={measure !== 'rate'}
            details={(i) => [{ name: 'Paid orders', value: formatCount(d.points[i].paid) }, { name: 'Refunded or revoked', value: `${formatCount(d.points[i].reversed)}, ${compactINR(d.points[i].amount)}` }, { name: 'Disputes opened', value: formatCount(d.points[i].disputes) }]}
          />
        )}
      </ChartCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Section id="focus-refunds-by-package" flush title="By package and plan" description={payments ? 'Paid orders and how many were refunded or revoked. Open a row to see those purchases.' : 'Paid orders and how many were refunded or revoked'}>
          {loading ? <TableSkeleton /> : (
            <ReportTable<ProductRow>
              caption="Refunds by package and plan"
              refreshing={refreshing}
              rows={d?.by_product ?? []}
              rowKey={(r) => r.key}
              rowHref={(r) => (r.reversed ? open(r) : null)}
              empty="No paid orders in this period."
              initialSort={{ key: 'reversed', desc: true }}
              maxHeight={480}
              columns={[
                { key: 'name', header: 'Product', sort: (r) => name(r), cell: (r) => <><span className="block truncate font-medium" title={name(r)}>{name(r)}</span><span className="block text-xs text-muted-foreground">{r.type === 'package' ? planLabel(r) : 'All of this type'}</span></>, footer: 'Total' },
                { key: 'paid', header: 'Paid orders', align: 'right', sort: (r) => r.paid, cell: (r) => formatCount(r.paid), footer: formatCount(c?.paid_orders) },
                { key: 'reversed', header: 'Refunded or revoked', align: 'right', sort: (r) => r.reversed, cell: (r) => formatCount(r.reversed), footer: formatCount(c?.reversed_orders) },
                { key: 'rate', header: 'Rate', align: 'right', sort: (r) => r.rate, cell: (r) => <span className={r.rate >= 10 ? 'font-medium text-danger' : ''}>{percent(r.rate)}</span>, footer: c ? percent(c.rate) : undefined },
                { key: 'amount', header: 'Amount', align: 'right', sort: (r) => r.amount, cell: (r) => formatINR(r.amount, { whole: true }), footer: c ? formatINR(c.reversed_amount, { whole: true }) : undefined },
              ]}
            />
          )}
        </Section>

        <Section
          id="focus-disputes"
          flush
          title="Disputes by package"
          description="Bank disputes opened in this period"
          action={cases ? <Button asChild variant="outline" size="sm"><Link to="/commerce/cases?kind=dispute">Open cases</Link></Button> : undefined}
        >
          {loading ? <TableSkeleton rows={4} /> : (
            <ReportTable
              caption="Disputes by package"
              refreshing={refreshing}
              rows={d?.disputes_by_package ?? []}
              rowKey={(r) => r.package_id ?? r.name}
              empty="No bank disputes were opened in this period."
              columns={[
                { key: 'name', header: 'Package', cell: (r) => <span className="block truncate font-medium" title={r.name}>{r.name}</span>, footer: 'Total' },
                { key: 'opened', header: 'Opened', align: 'right', cell: (r) => formatCount(r.opened), footer: formatCount(c?.disputes.opened) },
                { key: 'lost', header: 'Lost', align: 'right', cell: (r) => formatCount(r.lost), footer: formatCount(c?.disputes.lost) },
                { key: 'amount', header: 'Amount', align: 'right', cell: (r) => <span title={formatINR(r.amount)}>{compactINR(r.amount)}</span>, footer: c ? compactINR(c.disputes.amount) : undefined },
              ]}
            />
          )}
        </Section>
      </div>
      {!state.linkable && <p className="text-[13px] text-muted-foreground">Purchases cannot be filtered by state, day or hour, so rows do not open purchases while a chart filter is on.</p>}
    </div>
  )
}
