import { Fragment, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Section } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { formatCount, formatINR } from '@/lib/format'
import { analyticsService, type CouponsReport, type ProductRow, type SaleType, type SubjectColumn, type SubjectRow } from '@/services/analytics.service'
import { ChartCard, DataTableView, type LegendItem } from '@/components/charts/ChartCard'
import { Delta } from '@/components/charts/Delta'
import { RankedBars, type BarSegment } from '@/components/charts/RankedBars'
import { ReportTable } from '@/components/charts/ReportTable'
import { COLUMN_NAME, KIND_COLOR, KIND_NAME, TYPE_NAME, TYPE_ONE } from '@/components/charts/palette'
import { plural } from '@/components/charts/format'
import { useReport, type ReportState } from '@/components/charts/useReport'
import { describeRange, purchasesHref, versusText, type AnalyticsState } from '../useAnalyticsState'
import { ExportButton, Figure, ReportError, StaleNotice, TableSkeleton } from './bits'
import { NoResults, tierLabel, useReportOptions } from './FilterBar'
import { PackageView } from './PackageView'
import { PackagesTable } from './PackagesTable'
import { SalesTrend } from './SalesTrend'
import { InsightStrip, insightHref } from './Insights'
import { WhenPeopleBuy, WhereBuyersAre } from './WhenWhere'

const money = (n: number | null | undefined) => formatINR(n, { whole: true })
const OTHER_PRODUCTS: SubjectColumn[] = ['session', 'workshop', 'book', 'ebook', 'form']

/** Theory, Practical, Combo, other packages, and everything that is not a package. */
export function subjectSegments(r: Pick<SubjectRow, SubjectColumn>): BarSegment[] {
  return [
    { key: 'theory', name: KIND_NAME.theory, value: r.theory.collected, color: KIND_COLOR.theory },
    { key: 'practical', name: KIND_NAME.practical, value: r.practical.collected, color: KIND_COLOR.practical },
    { key: 'combo', name: KIND_NAME.combo, value: r.combo.collected, color: KIND_COLOR.combo },
    { key: 'other', name: KIND_NAME.other, value: r.other_package.collected, color: KIND_COLOR.other },
    { key: 'rest', name: 'Other products', value: OTHER_PRODUCTS.reduce((n, c) => n + r[c].collected, 0), color: 'var(--chart-rest)' },
  ]
}

function Cell({ orders, collected }: { orders: number; collected: number }) {
  if (!orders) return <span className="text-muted-foreground" aria-label="None">–</span>
  return <><span className="block">{money(collected)}</span><span className="block text-xs text-muted-foreground">{plural(orders, 'order')}</span></>
}

/** Where you are: All subjects, a subject, a package, a plan. */
function Trail({ state, names }: { state: AnalyticsState; names: { subject: string | null; subjectId: string | null; package: string | null } }) {
  const { filters } = state
  const steps: { label: string; href: string }[] = [{ label: 'All subjects', href: state.href({ subject: null, package: null, tier: null, page: null }, '/analytics') }]
  if (names.subject) steps.push({ label: names.subject, href: state.href({ subject: names.subjectId, package: null, tier: null, page: null }, '/analytics') })
  if (filters.package) steps.push({ label: names.package ?? 'Package', href: state.href({ tier: null, page: null }, '/analytics') })
  if (filters.tier) steps.push({ label: tierLabel(filters.tier), href: state.href({ page: null }, '/analytics') })
  if (steps.length === 1) return null
  return (
    <nav aria-label="Sales drill-down" className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {steps.map((s, i) => (
          <Fragment key={s.label + i}>
            {i > 0 && <li aria-hidden="true" className="text-muted-foreground">/</li>}
            <li className="min-w-0">
              {i === steps.length - 1
                ? <span aria-current="page" className="font-medium">{s.label}</span>
                : <Link to={s.href} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">{s.label}</Link>}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}

export function CouponsSection({ report, state }: { report: ReportState<CouponsReport>; state: AnalyticsState }) {
  const { hasPermission } = useAuth()
  const d = report.data
  const canOpen = hasPermission('coupons.read')
  return (
    <Section id="coupons" flush title="Coupons" description="Uses, discount given, what was collected with each coupon, and how many buyers it brought in for the first time" action={<ExportButton report="coupons" query={state.query} />}>
      <StaleNotice report={report} className="mx-5 mb-3 sm:mx-6" />
      {report.loading ? <TableSkeleton rows={4} /> : report.error && !d ? <div className="px-5 pb-5"><ReportError message={report.error} onRetry={report.reload} /></div> : (
        <ReportTable
          caption="Coupons"
          refreshing={report.refreshing || report.stale}
          rows={d?.rows ?? []}
          rowKey={(r) => r.code}
          rowHref={(r) => (canOpen && r.coupon_id ? `/commerce/coupons/${r.coupon_id}` : null)}
          empty="No coupons were used in this period."
          initialSort={{ key: 'uses', desc: true }}
          columns={[
            { key: 'code', header: 'Coupon', sort: (r) => r.code, cell: (r) => <><span className="block font-mono text-[13px] font-medium">{r.code}</span><span className="block truncate text-xs text-muted-foreground">{r.coupon_id ? r.description || 'No description' : 'Deleted coupon'}</span></>, footer: 'Total' },
            { key: 'uses', header: 'Uses', align: 'right', sort: (r) => r.uses, cell: (r) => formatCount(r.uses), footer: formatCount(d?.total.uses) },
            { key: 'buyers', header: 'Buyers', align: 'right', sort: (r) => r.buyers, cell: (r) => formatCount(r.buyers) },
            { key: 'discount', header: 'Discount given', align: 'right', sort: (r) => r.discount, cell: (r) => money(r.discount), footer: money(d?.total.discount) },
            { key: 'collected', header: 'Collected with it', align: 'right', sort: (r) => r.collected, cell: (r) => money(r.collected), footer: money(d?.total.collected) },
            { key: 'new', header: 'New buyers', align: 'right', sort: (r) => r.new_buyers ?? 0, cell: (r) => <span title="Students whose first purchase ever was made with this coupon">{formatCount(r.new_buyers ?? 0)}<span className="block text-xs text-muted-foreground">{r.buyers ? `${r.new_buyer_share ?? 0}% of its buyers` : ''}</span></span>, footer: formatCount(d?.total.new_buyers ?? 0) },
            ...(d?.previous_range ? [{ key: 'before', header: 'Uses before', align: 'right' as const, cell: (r: CouponsReport['rows'][number]) => <span className="inline-flex items-center gap-2">{formatCount(r.previous_uses)}<Delta now={r.uses} before={r.previous_uses} /></span> }] : []),
          ]}
        />
      )}
    </Section>
  )
}

/** Sessions, workshops, books, e-books and forms. */
function OtherProducts({ state }: { state: AnalyticsState }) {
  const { hasPermission } = useAuth()
  const type = state.filters.type && state.filters.type !== 'package' ? state.filters.type : 'session,workshop,book,ebook,form'
  const q = { ...state.query, type, package_type: '', tier: '', package_id: '' }
  const { data, loading, refreshing: loadingNewer, stale, error, reload } = useReport(JSON.stringify(q), () => analyticsService.products(q))
  // A failed refresh keeps the last numbers on screen: dimmed, under a notice with a retry
  const refreshing = loadingNewer || stale
  if (error && !data) return <ReportError message={error} onRetry={reload} />
  const href = (r: ProductRow) => (hasPermission('payments.read') && state.linkable && r.product_id ? purchasesHref({ from: q.from, to: q.to, type: r.type, item: r.product_id }) : null)
  return (
    <Section flush title="Other products" description="Live sessions, workshops, books, e-books and forms" action={<ExportButton report="products" query={q} />}>
      <StaleNotice report={{ stale, error, reload }} className="mx-5 mb-3 sm:mx-6" />
      {loading ? <TableSkeleton rows={4} /> : (
        <ReportTable
          caption="Other products"
          refreshing={refreshing}
          rows={data?.rows ?? []}
          rowKey={(r) => `${r.type}:${r.product_id}`}
          rowHref={href}
          empty="None of these sold in this period."
          initialSort={{ key: 'collected', desc: true }}
          columns={[
            { key: 'name', header: 'Product', sort: (r) => r.name, cell: (r) => <><span className="block truncate font-medium" title={r.name}>{r.name}</span><span className="block truncate text-xs text-muted-foreground">{TYPE_ONE[r.type as SaleType]}, {r.subject_name ?? 'No subject'}</span></>, footer: data && data.total_products > data.rows.length ? `Total of ${data.total_products}` : 'Total' },
            { key: 'orders', header: 'Orders', align: 'right', sort: (r) => r.orders, cell: (r) => <>{formatCount(r.orders)}{r.quantity > r.orders && <span className="block text-xs text-muted-foreground">{plural(r.quantity, 'copy', 'copies')}</span>}</> },
            { key: 'buyers', header: 'Buyers', align: 'right', sort: (r) => r.buyers, cell: (r) => formatCount(r.buyers) },
            { key: 'collected', header: 'Collected', align: 'right', sort: (r) => r.collected, cell: (r) => money(r.collected), footer: money(data?.total.collected) },
            { key: 'net', header: 'Net of GST', align: 'right', sort: (r) => r.net, cell: (r) => money(r.net), footer: money(data?.total.net) },
            ...(data?.previous_range ? [{ key: 'delta', header: 'Change', align: 'right' as const, cell: (r: ProductRow) => <Delta now={r.collected} before={r.previous_collected} /> }] : []),
          ]}
        />
      )}
    </Section>
  )
}

export function SubjectsReportSection({ state, linkTo = 'drill' }: { state: AnalyticsState; linkTo?: 'drill' | 'purchases' }) {
  const { hasPermission } = useAuth()
  const q = state.query
  const { data, loading, refreshing: loadingNewer, stale, error, reload } = useReport(JSON.stringify(q), () => analyticsService.subjects(q))
  // A failed refresh keeps the last numbers on screen: dimmed, under a notice with a retry
  const refreshing = loadingNewer || stale
  if (error && !data) return <ReportError message={error} onRetry={reload} />
  const selling = (data?.rows ?? []).filter((r) => r.collected > 0 || r.orders > 0)
  const href = (r: SubjectRow): string | null => {
    if (linkTo === 'purchases') return hasPermission('payments.read') && state.linkable && r.subject_id ? purchasesHref({ from: q.from, to: q.to, subject: r.subject_id, type: q.type }) : null
    return state.href({ tab: 'sales', subject: r.subject_id ?? 'none', package: null, tier: null, page: null }, '/analytics')
  }
  const legend: LegendItem[] = data ? subjectSegments(data.total).filter((s) => s.value > 0).map((s) => ({ key: s.key, name: s.name, color: s.color })) : []
  const used = (c: SubjectColumn) => (data?.total[c].orders ?? 0) > 0
  const columns: SubjectColumn[] = data ? (['theory', 'practical', 'combo'] as SubjectColumn[]).concat((['other_package', ...OTHER_PRODUCTS] as SubjectColumn[]).filter(used)) : []
  return (
    <>
      <ChartCard
        id="subjects"
        title="Revenue by subject"
        description="₹ collected in this period, GST included, split by package type. Open a subject to see its packages."
        skeleton="bars"
        csv={data ? () => ({ header: ['Subject', ...subjectSegments(data.total).map((x) => `${x.name} (INR)`), 'Collected (INR)', 'Orders', 'Buyers'], rows: selling.map((r) => [r.name, ...subjectSegments(r).map((x) => x.value), r.collected, r.orders, r.buyers]) }) : undefined}
        legend={legend}
        loading={loading}
        refreshing={refreshing}
        staleError={stale ? error : null}
        onRetry={reload}
        height={320}
        empty={data && selling.length === 0 && <NoResults what="No sales in this period." onClear={state.activeFilters ? state.clearFilters : undefined} />}
        table={data && (
          <DataTableView
            caption="Revenue by subject"
            rows={selling}
            rowKey={(r) => r.subject_id ?? 'none'}
            columns={[
              { header: 'Subject', cell: (r) => r.name, footer: 'Total' },
              ...subjectSegments(data.total).map((s, i) => ({ header: s.name, align: 'right' as const, cell: (r: SubjectRow) => money(subjectSegments(r)[i].value), footer: money(s.value) })),
              { header: 'Collected', align: 'right', cell: (r) => money(r.collected), footer: money(data.total.collected) },
            ]}
          />
        )}
      >
        <RankedBars
          unit="collected"
          format={(n) => money(n)}
          rows={selling.map((r) => ({
            key: r.subject_id ?? 'none', name: r.name, value: r.collected, segments: subjectSegments(r),
            hint: `${plural(r.orders, 'order')}, ${plural(r.buyers, 'buyer')}, ${r.share}% of the total`,
            aside: <Delta now={r.collected} before={r.previous_collected} versus={versusText(data?.previous_range) ?? undefined} />,
            href: href(r) ?? undefined,
          }))}
        />
      </ChartCard>

      <Section flush title="Subjects" description="How many bought what, and what it brought in" action={<ExportButton report="subjects" query={q} />}>
        {loading ? <TableSkeleton /> : (
          <ReportTable
            caption="Subjects"
            refreshing={refreshing}
            rows={data?.rows ?? []}
            rowKey={(r) => r.subject_id ?? 'none'}
            rowHref={href}
            empty="There are no subjects yet."
            initialSort={{ key: 'collected', desc: true }}
            columns={[
              { key: 'name', header: 'Subject', sort: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span>, footer: 'Total' },
              { key: 'collected', header: 'Collected', align: 'right', sort: (r) => r.collected, cell: (r) => <span className="font-medium">{money(r.collected)}</span>, footer: money(data?.total.collected) },
              ...(data?.previous_range ? [{ key: 'delta', header: 'Change', align: 'right' as const, cell: (r: SubjectRow) => <Delta now={r.collected} before={r.previous_collected} />, footer: <Delta now={data.total.collected} before={data.total.previous_collected} /> }] : []),
              { key: 'orders', header: 'Orders', align: 'right', sort: (r) => r.orders, cell: (r) => formatCount(r.orders), footer: formatCount(data?.total.orders) },
              { key: 'buyers', header: 'Buyers', align: 'right', sort: (r) => r.buyers, cell: (r) => formatCount(r.buyers), footer: formatCount(data?.total.buyers) },
              ...columns.map((c) => ({ key: c, header: COLUMN_NAME[c], align: 'right' as const, sort: (r: SubjectRow) => r[c].collected, cell: (r: SubjectRow) => <Cell {...r[c]} />, footer: data ? <Cell {...data.total[c]} /> : undefined })),
              { key: 'net', header: 'Net of GST', align: 'right', sort: (r) => r.net, cell: (r) => money(r.net), footer: money(data?.total.net) },
            ]}
          />
        )}
        {!!data?.orders_in_several_subjects && (
          <p className="px-5 py-3 text-[13px] text-muted-foreground">
            {plural(data.orders_in_several_subjects, 'book order')} {data.orders_in_several_subjects === 1 ? 'has' : 'have'} books of more than one subject. The money is split by price; the order is counted under each, so the orders column adds up to more than its total.
          </p>
        )}
      </Section>
    </>
  )
}

/** One subject: its figures, trend, packages and other products. */
function SubjectView({ state }: { state: AnalyticsState }) {
  const q = state.query
  const { data, loading, refreshing: loadingNewer, stale, error, reload } = useReport(JSON.stringify(q), () => analyticsService.overview(q))
  // A failed refresh keeps the last numbers on screen: dimmed, under a notice with a retry
  const refreshing = loadingNewer || stale
  const split = useReport(`${JSON.stringify(q)}s`, () => analyticsService.subjects(q))
  const row = split.data?.rows.find((r) => (r.subject_id ?? 'none') === state.filters.subject) ?? null
  const versus = versusText(data?.previous_range) ?? undefined
  const common = { loading, refreshing, versus }
  const segments = row ? subjectSegments(row).filter((s) => s.value > 0) : []
  return (
    <>
      <StaleNotice report={{ stale, error, reload }} />
      {error && !data ? <ReportError message={error} onRetry={reload} /> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Figure {...common} label="Collected" value={money(data?.current.collected)} now={data?.current.collected} before={data?.previous?.collected} hint={data?.previous ? `Was ${money(data.previous.collected)}` : 'GST included'} />
          <Figure {...common} label="Net of GST" value={money(data?.current.net)} now={data?.current.net} before={data?.previous?.net} hint={`GST ${money(data?.current.gst ?? 0)}`} />
          <Figure {...common} label="Orders" value={formatCount(data?.current.orders)} now={data?.current.orders} before={data?.previous?.orders} hint={`${plural(data?.current.buyers ?? 0, 'buyer')}`} />
          <Figure {...common} label="Average order" value={money(data?.current.average_order)} now={data?.current.average_order} before={data?.previous?.average_order} hint="Collected per order" />
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SalesTrend query={q} byType={!state.filters.type && !state.filters.kind} />
        <ChartCard
          id="subjects"
          title="What sold"
          description="₹ collected in this period, by package type"
          skeleton="bars"
          csv={row ? () => ({ header: ['Kind', 'Collected (INR)'], rows: subjectSegments(row).map((x) => [x.name, x.value]) }) : undefined}
          loading={split.loading}
          refreshing={split.refreshing}
          staleError={split.stale ? split.error : null}
          onRetry={split.reload}
          empty={split.data && segments.length === 0 && <p>No sales in this period.</p>}
          table={row && (
            <DataTableView caption="What sold" rows={subjectSegments(row)} rowKey={(s) => s.key} columns={[{ header: 'Kind', cell: (s) => s.name }, { header: 'Collected', align: 'right', cell: (s) => formatINR(s.value) }]} />
          )}
        >
          <RankedBars
            unit="collected"
            format={(n) => money(n)}
            rows={segments.map((s) => {
              const orders = s.key === 'rest' ? OTHER_PRODUCTS.reduce((n, c) => n + row![c].orders, 0) : row![s.key === 'other' ? 'other_package' : (s.key as SubjectColumn)].orders
              return {
                key: s.key, name: s.name, value: s.value, color: s.color, hint: plural(orders, 'order'),
                href: s.key === 'rest' ? undefined : state.href({ kind: state.filters.kind === s.key ? null : s.key, page: null }, '/analytics'),
              }
            })}
          />
        </ChartCard>
      </div>
    </>
  )
}

export function SalesTab({ state }: { state: AnalyticsState }) {
  const { hasPermission } = useAuth()
  const options = useReportOptions()
  const insights = useReport(state.filters.package ? null : `ins${JSON.stringify(state.query)}`, () => analyticsService.insights(state.query))
  const versusRange = versusText(insights.data?.previous_range)
  const { hash } = useLocation()
  const { filters } = state
  const pkg = options?.packages.find((p) => p.package_id === filters.package)
  const subjectId = filters.subject || pkg?.subject_id || null
  const subjectName = subjectId === 'none' ? 'No subject' : options?.subjects.find((s) => s.subject_id === subjectId)?.name ?? null
  const names = { subject: subjectName, subjectId, package: pkg?.name ?? null }
  const couponQuery = state.query
  const coupons = useReport(filters.package ? null : `c${JSON.stringify(couponQuery)}`, () => analyticsService.coupons(couponQuery))

  // "Discounts given" links straight to the coupons
  useEffect(() => {
    if (hash !== '#coupons' || coupons.loading) return
    document.getElementById('coupons')?.scrollIntoView({ block: 'center' })
  }, [hash, coupons.loading])

  if (filters.package) {
    return (
      <div className="space-y-6">
        <Trail state={state} names={names} />
        <PackageView key={filters.package} state={state} />
      </div>
    )
  }
  const packageOnly = !filters.type || filters.type === 'package'
  return (
    <div className="space-y-6">
      <InsightStrip report={insights} hrefFor={insightHref(state, hasPermission)} description={versusRange ? `${describeRange(state.range)}, against ${versusRange}` : describeRange(state.range)} />
      <Trail state={state} names={names} />
      {filters.subject ? <SubjectView key={filters.subject} state={state} /> : <SubjectsReportSection state={state} />}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <WhenPeopleBuy state={state} />
        <WhereBuyersAre state={state} />
      </div>
      {packageOnly && <PackagesTable state={state} />}
      {filters.type !== 'package' && !filters.kind && !filters.tier && <OtherProducts state={state} />}
      <CouponsSection report={coupons} state={state} />
      {filters.type && <p className="text-[13px] text-muted-foreground">Showing {TYPE_NAME[filters.type].toLowerCase()} only.</p>}
    </div>
  )
}
