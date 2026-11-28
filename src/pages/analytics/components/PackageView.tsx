import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState, Section, StatusPill } from '@/components/common/detail'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { formatCount, formatINR } from '@/lib/format'
import { analyticsService, type PackageReport, type TierRow } from '@/services/analytics.service'
import { Delta } from '@/components/charts/Delta'
import { ReportTable } from '@/components/charts/ReportTable'
import { istDayTime, plural, spanLabel } from '@/components/charts/format'
import { useReport } from '@/components/charts/useReport'
import { purchaseHref, purchasesHref, versusText, type AnalyticsState } from '../useAnalyticsState'
import { StaleNotice, ExportButton, Figure, ReportError } from './bits'
import { planLabel } from './PackagesTable'
import { SalesTrend } from './SalesTrend'
import { tierLabel } from './FilterBar'
import { StudentLink } from '@/components/students/StudentLink'

const money = (n: number | null | undefined) => formatINR(n, { whole: true })

const PERIODS: { key: keyof PackageReport['periods']; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
]

function Buyers({ state }: { state: AnalyticsState }) {
  const { hasPermission } = useAuth()
  const id = state.filters.package
  const page = Math.max(1, Math.min(100000, Number(state.params.get('page')) || 1))
  const q = { from: state.query.from, to: state.query.to, tier: state.filters.tier, page, limit: 20 }
  const { data, loading, refreshing: loadingNewer, stale, error, reload } = useReport(`${id}${JSON.stringify(q)}`, () => analyticsService.packageBuyers(id, q))
  // A failed refresh keeps the last numbers on screen: dimmed, under a notice with a retry
  const refreshing = loadingNewer || stale
  const users = hasPermission('users.read')
  const go = (p: number) => state.update({ page: p > 1 ? String(p) : null }, { push: true })
  const pages = data?.pagination.totalPages ?? 1
  // A shared link to a page that no longer exists
  const beyond = !!data && page > pages
  return (
    <Section
      flush
      title="Recent buyers"
      description={data ? `${plural(data.pagination.total, 'purchase')} in this period, newest first` : 'Newest first'}
      action={users ? <ExportButton report="buyers" query={{ ...q, package_id: id, page: undefined, limit: undefined }} /> : undefined}
    >
      <StaleNotice report={{ stale, error, reload }} className="mx-5 mb-3 sm:mx-6" />
      {error && !data ? <div className="px-5 pb-5"><ReportError message={error} onRetry={reload} /></div> : loading ? <div className="space-y-3 px-5 pb-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-7 w-full" />)}</div> : (
        <>
          <ReportTable
            caption="Recent buyers"
            refreshing={refreshing}
            rows={data?.entities ?? []}
            rowKey={(b) => b.purchase_id}
            rowHref={(b) => (hasPermission('payments.read') ? purchaseHref('package', b.purchase_id) : null)}
            empty={beyond ? <span className="inline-flex flex-col items-center gap-2 py-4">There is no page {page}.<Button size="sm" variant="outline" onClick={() => go(1)}>Go to the first page</Button></span> : 'Nobody bought this in this period.'}
            columns={[
              // The row opens the purchase; the name is its own link to the student
              { key: 'student', header: 'Student', ownLink: true, cell: (b) => <><StudentLink student={b.user} from="Analytics" className="block truncate" deletedClassName="block truncate" />{b.user?.student_id && <span className="block font-mono text-xs text-muted-foreground">{b.user.student_id}</span>}</> },
              { key: 'plan', header: 'Plan', cell: (b) => planLabel(b) },
              { key: 'at', header: 'Bought', cell: (b) => (hasPermission('payments.read') ? <Link to={purchaseHref('package', b.purchase_id)} className="rounded-sm hover:text-primary">{istDayTime(b.purchased_at)}</Link> : istDayTime(b.purchased_at)) },
              { key: 'collected', header: 'Collected', align: 'right', cell: (b) => formatINR(b.collected) },
              { key: 'coupon', header: 'Coupon', cell: (b) => (b.coupon_code ? <span className="font-mono text-[13px]">{b.coupon_code}<span className="ml-1.5 font-sans text-xs text-muted-foreground">{money(b.discount)} off</span></span> : <span className="text-muted-foreground">None</span>) },
              ...(users ? [{ key: 'user', header: 'Student page', cell: (b: { user: { user_id: string } | null }) => (b.user ? <Link to={`/users/${b.user.user_id}`} className="text-primary underline-offset-4 hover:underline">Open student</Link> : '') }] : []),
            ]}
          />
          {pages > 1 && !beyond && (
            <nav aria-label="Buyers pages" className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
              <p className="text-[13px] text-muted-foreground">Page {page} of {formatCount(pages)}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => go(page - 1)}><ChevronLeft className="h-4 w-4" />Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => go(page + 1)}>Next<ChevronRight className="h-4 w-4" /></Button>
              </div>
            </nav>
          )}
        </>
      )}
    </Section>
  )
}

/** One package (or one of its plans): fixed periods, trend, plans, coupons and buyers. */
export function PackageView({ state }: { state: AnalyticsState }) {
  const { hasPermission } = useAuth()
  const id = state.filters.package
  const tier = state.filters.tier
  const q = { ...state.query, package_id: undefined, subject_id: undefined, package_type: undefined, type: undefined }
  const { data, loading, refreshing: loadingNewer, stale, error, status, reload } = useReport(`${id}${JSON.stringify(q)}`, () => analyticsService.package(id, q))
  // A failed refresh keeps the last numbers on screen: dimmed, under a notice with a retry
  const refreshing = loadingNewer || stale
  const back = { label: 'All subjects', href: state.href({ subject: null, package: null, tier: null, page: null }, '/analytics') }

  if (error && !data) return <ErrorState title={status === 404 ? 'This package was not found' : 'This package could not be loaded'} message={status === 404 ? 'It may have been deleted before anything was sold.' : error} onRetry={status === 404 ? undefined : reload} back={back} />
  const p = data?.package
  const payments = hasPermission('payments.read')
  const { from, to } = state.query
  const versus = versusText(data?.previous_range) ?? undefined
  const common = { loading, refreshing, versus }
  const c = data?.current
  const b = data?.previous

  return (
    <>
      <StaleNotice report={{ stale, error, reload }} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {p ? <h2 className="min-w-0 break-words font-display text-[20px] font-semibold leading-tight tracking-[-0.015em]">{p.name}{tier && <span className="text-muted-foreground"> · {tierLabel(tier)}</span>}</h2> : <Skeleton className="h-7 w-64" />}
            {p?.deleted && <StatusPill tone="danger">Deleted</StatusPill>}
            {p && !p.deleted && (!p.is_active || p.publish_status === 'draft') && <StatusPill tone="warning">Not on sale</StatusPill>}
          </div>
          {p && <p className="mt-1 text-sm text-muted-foreground">{[p.package_type?.name, p.subject?.name ?? 'No subject'].filter(Boolean).join(', ')}{data!.opened_by_combos > 0 && `. Also opened ${plural(data!.opened_by_combos, 'time')} through a combo (that money is counted under the combo)`}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {p && !p.deleted && hasPermission('packages.read') && <Button asChild variant="outline" size="sm"><Link to={`/content/packages/${id}`}>Open package</Link></Button>}
          {payments && <Button asChild variant="outline" size="sm"><Link to={purchasesHref({ from, to, package: id, tier })}>Open purchases</Link></Button>}
        </div>
      </div>

      <section aria-labelledby="fixed-title" className="space-y-3">
        <h3 id="fixed-title" className="text-[15px] font-semibold">Revenue at a glance</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {PERIODS.map((x) => {
            const r = data?.periods[x.key]
            return <Figure key={x.key} loading={loading} label={x.label} value={money(r?.collected)} hint={plural(r?.orders ?? 0, 'order')} href={payments && r ? purchasesHref({ from: r.from, to: r.to, package: id, tier }) : undefined} />
          })}
        </div>
      </section>

      <section aria-labelledby="chosen-title" className="space-y-3">
        <h3 id="chosen-title" className="text-[15px] font-semibold">{data?.range.from && data.range.to ? spanLabel(data.range.from, data.range.to) : 'All time'}</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Figure {...common} label="Collected" value={money(c?.collected)} now={c?.collected} before={b?.collected} hint={b ? `Was ${money(b.collected)}` : 'GST included'} />
          <Figure {...common} label="Net of GST" value={money(c?.net)} now={c?.net} before={b?.net} hint={`GST ${money(c?.gst ?? 0)}`} />
          <Figure {...common} label="Orders" value={formatCount(c?.orders)} now={c?.orders} before={b?.orders} hint={`Average ${money(c?.average_order ?? 0)}`} />
          <Figure {...common} label="Buyers" value={formatCount(c?.buyers)} now={c?.buyers} before={b?.buyers} hint={`${formatCount(c?.new_buyers ?? 0)} bought for the first time`} />
          <Figure {...common} label="Discounts given" value={money(c?.discount)} now={c?.discount} before={b?.discount} neutral hint="With coupons" />
          <Figure {...common} label="Refunded or revoked" value={money(c?.reversed_amount)} now={c?.reversed_amount} before={b?.reversed_amount} upIsGood={false} hint={plural(c?.reversed_orders ?? 0, 'order')} href={payments ? purchasesHref({ from, to, package: id, tier, status: 'revoked' }) : undefined} />
        </div>
      </section>

      <SalesTrend query={{ ...q, package_id: id }} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Section flush title="Plans" description="Each plan is its own subscription">
          <ReportTable<TierRow>
            caption="Plans"
            refreshing={refreshing}
            rows={data?.tiers ?? []}
            rowKey={(t) => t.key}
            rowHref={(t) => state.href({ tier: tier === t.key ? null : t.key, page: null }, '/analytics')}
            empty={loading ? 'Loading…' : 'No plan of this package sold in this period.'}
            columns={[
              { key: 'plan', header: 'Plan', cell: (t) => <span className="font-medium">{planLabel(t)}{tier === t.key && <span className="ml-2 text-xs font-normal text-muted-foreground">Showing this plan</span>}</span>, footer: 'Total' },
              { key: 'orders', header: 'Orders', align: 'right', cell: (t) => formatCount(t.orders), footer: formatCount((data?.tiers ?? []).reduce((n, t) => n + t.orders, 0)) },
              { key: 'collected', header: 'Collected', align: 'right', cell: (t) => money(t.collected), footer: money((data?.tiers ?? []).reduce((n, t) => n + t.collected, 0)) },
              { key: 'share', header: 'Share', align: 'right', cell: (t) => `${t.share}%` },
              ...(data?.previous_range ? [{ key: 'delta', header: 'Change', align: 'right' as const, cell: (t: TierRow) => <Delta now={t.collected} before={t.previous_collected} /> }] : []),
            ]}
          />
        </Section>
        <Section flush title="Coupons used" description="On this package in this period">
          <ReportTable
            caption="Coupons used"
            refreshing={refreshing}
            rows={data?.coupons ?? []}
            rowKey={(r) => r.code}
            rowHref={(r) => (hasPermission('coupons.read') && r.coupon_id ? `/commerce/coupons/${r.coupon_id}` : null)}
            empty={loading ? 'Loading…' : 'No coupons were used on this package in this period.'}
            columns={[
              { key: 'code', header: 'Coupon', cell: (r) => <span className="font-mono text-[13px] font-medium">{r.code}</span> },
              { key: 'uses', header: 'Uses', align: 'right', cell: (r) => formatCount(r.uses) },
              { key: 'discount', header: 'Discount given', align: 'right', cell: (r) => money(r.discount) },
              { key: 'collected', header: 'Collected with it', align: 'right', cell: (r) => money(r.collected) },
            ]}
          />
        </Section>
      </div>

      <Buyers state={state} />
    </>
  )
}
