import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Section } from '@/components/common/detail'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { formatCount, formatINR } from '@/lib/format'
import { analyticsService, type Granularity, type ProductRow, type SaleType, type SeriesPoint } from '@/services/analytics.service'
import { Delta } from '@/components/charts/Delta'
import { RankedBars } from '@/components/charts/RankedBars'
import { ReportTable } from '@/components/charts/ReportTable'
import { PER, bucketLabel, plural } from '@/components/charts/format'
import { TYPE_COLOR, TYPE_NAME } from '@/components/charts/palette'
import { useReport } from '@/components/charts/useReport'
import { describeRange, purchasesHref, useAnalyticsState, versusText, type AnalyticsState } from '@/pages/analytics/useAnalyticsState'
import { FilterBar, NoResults, ViewTools, tierLabel, useReportOptions } from '@/pages/analytics/components/FilterBar'
import { ExportButton, Figure, ReportError, StaleNotice, TableSkeleton } from '@/pages/analytics/components/bits'
import { CouponsSection, SubjectsReportSection } from '@/pages/analytics/components/SalesTab'
import { PackagesTable } from '@/pages/analytics/components/PackagesTable'
import { SalesTrend } from '@/pages/analytics/components/SalesTrend'

const money = (n: number | null | undefined) => formatINR(n, { whole: true })

/** The first three are the cards this page has always had; the rest were missing. */
const CARDS: { type: SaleType; label: string }[] = [
  { type: 'package', label: 'Package Revenue' },
  { type: 'book', label: 'Book Revenue' },
  { type: 'session', label: 'Session Revenue' },
  { type: 'workshop', label: 'Workshop Revenue' },
  { type: 'ebook', label: 'E-book Revenue' },
  { type: 'form', label: 'Form Revenue' },
]

const TOP: { type: SaleType; title: string }[] = [
  { type: 'package', title: 'Top Packages' },
  { type: 'book', title: 'Top Books' },
  { type: 'session', title: 'Top Sessions' },
  { type: 'workshop', title: 'Top Workshops' },
  { type: 'ebook', title: 'Top E-books' },
  { type: 'form', title: 'Top Forms' },
]

/** Daily, weekly, monthly, as before, plus yearly and automatic. */
function PeriodSelect({ state }: { state: AnalyticsState }) {
  return (
    <Select value={state.granularity} onValueChange={(v) => state.update({ by: v === 'auto' ? null : v })}>
      <SelectTrigger aria-label="Show revenue" className="h-8 w-32 bg-card text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {([['auto', 'Automatic'], ['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly'], ['year', 'Yearly']] as [Granularity, string][]).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

/** Each bucket as a row, with a totals row. Every row opens its purchases. */
function PeriodTable({ state, open }: { state: AnalyticsState; open: (p: { from: string; to: string }) => string | null }) {
  const q = { ...state.query, split: 'type' as const }
  const { data, loading, refreshing, stale, error, reload } = useReport(JSON.stringify(q), () => analyticsService.timeseries(q))
  const g = data?.granularity ?? 'day'
  // Newest first, and no long tail of empty days before the first sale
  const rows = useMemo(() => [...(data?.points ?? [])].reverse(), [data])
  const types = (data?.keys ?? []).filter((k) => (data!.total.by?.[k]?.orders ?? 0) > 0) as SaleType[]
  if (error && !data) return <ReportError message={error} onRetry={reload} />
  const t = data?.total
  return (
    <Section flush title="Revenue by period" description={data ? `${PER[g][0].toUpperCase()}${PER[g].slice(1)}, newest first. Open a row to see its purchases.` : 'Open a row to see its purchases.'} action={<ExportButton report="periods" query={q} />}>
      <StaleNotice report={{ stale, error, reload }} className="mx-5 mb-3 sm:mx-6" />
      {loading ? <TableSkeleton /> : !t?.orders ? <NoResults what="No sales in this period." onClear={state.activeFilters ? state.clearFilters : undefined} /> : (
          <ReportTable<SeriesPoint>
            maxHeight={520}
            caption="Revenue by period"
            refreshing={refreshing || stale}
            rows={rows}
            rowKey={(p) => p.key}
            rowHref={(p) => (p.orders > 0 ? open(p) : null)}
            columns={[
              { key: 'period', header: 'Period', className: 'whitespace-nowrap', sort: (p) => p.key, cell: (p) => <span className={p.orders ? 'font-medium' : 'text-muted-foreground'}>{bucketLabel(p, g)}</span>, footer: 'Total' },
              { key: 'orders', header: 'Orders', align: 'right', sort: (p) => p.orders, cell: (p) => formatCount(p.orders), footer: formatCount(t.orders) },
              { key: 'collected', header: 'Collected', align: 'right', sort: (p) => p.collected, cell: (p) => formatINR(p.collected), footer: formatINR(t.collected) },
              { key: 'net', header: 'Net of GST', align: 'right', sort: (p) => p.net, cell: (p) => formatINR(p.net), footer: formatINR(t.net) },
              { key: 'gst', header: 'GST', align: 'right', sort: (p) => p.gst, cell: (p) => formatINR(p.gst), footer: formatINR(t.gst) },
              { key: 'discount', header: 'Discounts', align: 'right', sort: (p) => p.discount, cell: (p) => formatINR(p.discount), footer: formatINR(t.discount) },
              ...(types.length > 1 ? types.map((k) => ({ key: k, header: TYPE_NAME[k], align: 'right' as const, sort: (p: SeriesPoint) => p.by![k].collected, cell: (p: SeriesPoint) => (p.by![k].collected ? money(p.by![k].collected) : <span className="text-muted-foreground" aria-label="None">–</span>), footer: money(t.by![k].collected) })) : []),
            ]}
          />
      )}
    </Section>
  )
}

/**
 * The five best sellers of one product type. Each list asks for its own type,
 * so a type with small sales is never pushed off the end of a shared list and
 * misread as "none sold".
 */
function TopList({ title, type, state }: { title: string; type: SaleType; state: AnalyticsState }) {
  const { hasPermission } = useAuth()
  const { from, to } = state.query
  const tq = { ...state.query, type, sort: 'collected' as const, limit: 5 }
  const report = useReport(`top${JSON.stringify(tq)}`, () => analyticsService.products(tq))
  const rows: ProductRow[] = report.data?.rows ?? []
  const href = (r: ProductRow) => {
    if (r.type === 'package' && r.product_id) return `/analytics?${new URLSearchParams({ tab: 'sales', package: r.product_id, ...(from && to ? { from, to } : { range: 'all' }) })}`
    return hasPermission('payments.read') && state.linkable && r.product_id ? purchasesHref({ from, to, type: r.type, item: r.product_id }) : undefined
  }
  return (
    <Section title={title} description="₹ collected, GST included" className="flex flex-col [&>div:last-child]:flex [&>div:last-child]:flex-1 [&>div:last-child]:flex-col">
      <StaleNotice report={report} className="mb-3" />
      {report.error && !report.data
        ? <p className="py-4 text-center text-sm text-muted-foreground">{report.error} <button type="button" className="underline" onClick={report.reload}>Try again</button></p>
        : report.loading ? <TableSkeleton rows={3} /> : rows.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">None sold in this period.</p> : (
        <div className={cn('flex flex-1 flex-col transition-opacity duration-150', (report.refreshing || report.stale) && 'opacity-60')}>
        <RankedBars
          unit="collected"
          format={(n) => money(n)}
          rows={rows.slice(0, 5).map((r) => ({
            key: `${r.type}:${r.product_id}`, name: r.name, value: r.collected, color: TYPE_COLOR[r.type],
            hint: `${plural(r.orders, 'sale')}${r.type === 'book' && r.quantity > r.orders ? `, ${plural(r.quantity, 'copy', 'copies')}` : ''}${r.subject_name ? `, ${r.subject_name}` : ''}`,
            aside: <Delta now={r.collected} before={r.previous_collected} />,
            href: href(r),
          }))}
        />
        {/* A short list ends in a note that fills the rest of the card, so a row of cards never shows a blank patch */}
        {rows.length < 5 && (
          <p className="mt-3 flex min-h-14 flex-1 items-center justify-center rounded-lg border border-dashed border-border px-4 py-3 text-center text-[13px] text-muted-foreground">
            {rows.length === 1 ? 'Only this one sold in this period.' : `Only these ${rows.length} sold in this period.`}
          </p>
        )}
        </div>
      )}
    </Section>
  )
}

export function RevenuePage() {
  const state = useAnalyticsState('30d')
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const options = useReportOptions()
  const q = state.query
  const f = state.filters

  const overview = useReport(JSON.stringify(q), () => analyticsService.overview(q))
  const coupons = useReport(`c${JSON.stringify(q)}`, () => analyticsService.coupons(q))

  const d = overview.data
  const versus = versusText(d?.previous_range)
  // A failed refresh keeps the last figures, dimmed, under a notice
  const common = { loading: overview.loading, refreshing: overview.refreshing || overview.stale, versus: versus ?? undefined }
  // The Purchases list cannot filter by state, weekday or hour
  const payments = hasPermission('payments.read') && state.linkable
  const sale = { type: f.type, subject: f.subject, package: f.package, tier: f.tier }
  const openRange = (p: { from: string; to: string }) => (payments ? purchasesHref({ ...sale, from: p.from, to: p.to }) : null)
  const byType = (t: SaleType) => d?.by_type.find((r) => r.type === t)

  // What the page is about, in words: "TECOM Theory Package, 6 months"
  const chosen: ReactNode[] = [
    f.package ? options?.packages.find((p) => p.package_id === f.package)?.name ?? 'Package' : null,
    f.subject && !f.package ? (f.subject === 'none' ? 'No subject' : options?.subjects.find((s) => s.subject_id === f.subject)?.name ?? 'Subject') : null,
    f.tier ? tierLabel(f.tier) : null,
    f.type ? TYPE_NAME[f.type] : null,
  ].filter(Boolean)

  const visibleCards = CARDS.filter((c) => !d || byType(c.type))
  return (
    <div className="pg-viz space-y-6">
      <PageHeader
        title="Revenue"
        description="Financial overview and revenue analytics"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Commerce' }, { label: 'Revenue' }]}
        action={<ViewTools state={state} name="Revenue" />}
      />
      <FilterBar state={state} show={['subject', 'package', 'tier', 'kind', 'type']} granularity={false} />

      <section aria-labelledby="revenue-title" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="revenue-title" className="text-[15px] font-semibold">{[...chosen, describeRange(state.range)].join(', ')}</h2>
          <p className="text-[13px] text-muted-foreground">{versus ? `Compared with ${versus}` : 'No comparison for this range'}</p>
        </div>
        {overview.error && !d ? <ReportError message={overview.error} onRetry={overview.reload} /> : (
          <>
            <StaleNotice report={overview} />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              <Figure {...common} label="Total Revenue" value={money(d?.current.collected)} now={d?.current.collected} before={d?.previous?.collected} hint={plural(d?.current.orders ?? 0, 'transaction')} href={payments ? purchasesHref({ ...sale, from: q.from, to: q.to }) : undefined} />
              {visibleCards.map((c) => {
                const r = byType(c.type)
                return <Figure key={c.type} {...common} label={c.label} value={money(r?.collected ?? 0)} now={r?.collected ?? 0} before={r?.previous_collected} hint={`${r?.share ?? 0}% of total · ${plural(r?.orders ?? 0, 'sale')}`} href={payments ? purchasesHref({ ...sale, type: c.type, from: q.from, to: q.to }) : undefined} />
              })}
              <Figure {...common} label="Net of GST" value={money(d?.current.net)} now={d?.current.net} before={d?.previous?.net} hint={`GST ${money(d?.current.gst ?? 0)}`} />
              <Figure {...common} label="Discounts given" value={money(d?.current.discount)} now={d?.current.discount} before={d?.previous?.discount} neutral hint="With coupons" />
              <Figure {...common} label="Average order" value={money(d?.current.average_order)} now={d?.current.average_order} before={d?.previous?.average_order} hint="Collected per order" />
              <Figure {...common} label="Buyers" value={formatCount(d?.current.buyers)} now={d?.current.buyers} before={d?.previous?.buyers} hint={`${formatCount(d?.current.new_buyers ?? 0)} new, ${formatCount(d?.current.returning_buyers ?? 0)} returning`} href={`/analytics?${new URLSearchParams({ tab: 'students', ...(q.from && q.to ? { from: q.from, to: q.to } : { range: 'all' }) })}`} />
              <Figure {...common} label="Refunded or revoked" value={money(d?.current.reversed_amount)} now={d?.current.reversed_amount} before={d?.previous?.reversed_amount} upIsGood={false} hint={`${plural(d?.current.reversed_orders ?? 0, 'order')} from this period`} href={payments ? purchasesHref({ ...sale, from: q.from, to: q.to, status: 'revoked' }) : undefined} />
            </div>
            {!!d?.current.legacy_orders && (
              <p className="text-[13px] text-muted-foreground">{plural(d.current.legacy_orders, 'older order')} without a gateway amount {d.current.legacy_orders === 1 ? 'is' : 'are'} counted at the recorded price; GST is not known for {d.current.legacy_orders === 1 ? 'it' : 'them'}.</p>
            )}
          </>
        )}
      </section>

      <SalesTrend
        query={q}
        title="Revenue Trends"
        byType={!f.type && !f.package && !f.kind && !f.tier}
        height={300}
        action={<PeriodSelect state={state} />}
        onOpen={payments ? (p) => { const to = openRange(p); if (to) navigate(to) } : undefined}
      />

      <PeriodTable state={state} open={openRange} />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {TOP.filter((t) => !d || byType(t.type)).map((t) => <TopList key={t.type} title={t.title} type={t.type} state={state} />)}
      </div>

      {!f.package && <SubjectsReportSection state={state} linkTo="purchases" />}
      {(!f.type || f.type === 'package') && <PackagesTable state={state} linkTo="purchases" chart={false} />}
      <CouponsSection report={coupons} state={state} />
    </div>
  )
}
