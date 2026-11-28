import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Section } from '@/components/common/detail'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { formatCount, formatINR } from '@/lib/format'
import { analyticsService, type Overview, type WatchedVideo } from '@/services/analytics.service'
import { ChartCard, DataTableView } from '@/components/charts/ChartCard'
import { Delta } from '@/components/charts/Delta'
import { RankedBars } from '@/components/charts/RankedBars'
import { ReportTable } from '@/components/charts/ReportTable'
import { TYPE_COLOR, TYPE_NAME } from '@/components/charts/palette'
import { plural } from '@/components/charts/format'
import { useReport } from '@/components/charts/useReport'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { describeRange, purchasesHref, rangeInSentence, versusText, videoHref, type AnalyticsState } from '../useAnalyticsState'
import { StaleNotice, ExportButton, Figure, ReportError, Segmented, TableSkeleton } from './bits'
import { SalesTrend } from './SalesTrend'
import { InsightStrip, insightHref } from './Insights'
import { RunRate } from './RunRate'

/** Watch time in a compact form. */
export function formatWatch(seconds: number): string {
  if (!seconds || seconds < 1) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const eventName = (e: string) => { const s = e.replace(/_/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1) }

/** The four cards this page has always opened with. Not tied to the chosen range. */
export function HeadlineCards() {
  const { hasPermission } = useAuth()
  const { data, loading, error, reload } = useReport('headline', () => analyticsService.headline())
  if (error && !data) return <ReportError message={error} onRetry={reload} />
  const users = hasPermission('users.read')
  const money = (n?: number) => formatINR(n, { whole: true })
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <Figure label="Total Users" loading={loading} value={formatCount(data?.users.total)} hint="Every registered student" href={users ? '/users' : undefined} />
      <Figure label="Revenue (This Month)" loading={loading} value={money(data?.revenue.this_month)} hint="Collected, GST included" href="/commerce/revenue?range=month" />
      <Figure label="Active Users (30 days)" loading={loading} value={formatCount(data?.users.active_30_days)} hint="Used the app or the site" href="/analytics?tab=students&range=30d" />
      <Figure label="New Users (This Month)" loading={loading} value={formatCount(data?.users.new_this_month)} hint="Registered this month" href="/analytics?tab=students&range=month" />
    </div>
  )
}

export function PeriodFigures({ data, state, loading, refreshing }: { data: Overview | null; state: AnalyticsState; loading: boolean; refreshing: boolean }) {
  const { hasPermission } = useAuth()
  const c = data?.current
  const p = data?.previous
  const { from, to } = state.query
  const f = state.filters
  const open = { from, to, type: f.type, subject: f.subject, package: f.package, tier: f.tier }
  const purchases = hasPermission('payments.read') && state.linkable
  const versus = versusText(data?.previous_range) ?? 'the previous period'
  const was = (n: number | null | undefined, money?: boolean) => (n === null || n === undefined ? null : `Was ${money ? formatINR(n, { whole: true }) : formatCount(n)}`)
  const common = { loading, refreshing, versus }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Figure {...common} label="Collected" count={c?.collected} now={c?.collected} before={p?.collected} hint={was(p?.collected, true) ?? 'GST included'} href={purchases ? purchasesHref(open) : undefined} />
      <Figure {...common} label="Net of GST" count={c?.net} now={c?.net} before={p?.net} hint={`GST ${formatINR(c?.gst ?? 0, { whole: true })}`} />
      <Figure {...common} label="Orders" count={c?.orders} as="count" now={c?.orders} before={p?.orders} hint={was(p?.orders) ?? 'Paid orders'} href={purchases ? purchasesHref(open) : undefined} />
      <Figure {...common} label="Average order" value={formatINR(c?.average_order, { whole: true })} now={c?.average_order} before={p?.average_order} hint={was(p?.average_order, true) ?? 'Collected per order'} />
      <Figure {...common} label="Discounts given" value={formatINR(c?.discount, { whole: true })} now={c?.discount} before={p?.discount} neutral hint="With coupons" href={state.href({ tab: 'sales' }, '/analytics') + '#coupons'} />
      <Figure {...common} label="Buyers" count={c?.buyers} as="count" now={c?.buyers} before={p?.buyers} hint={`${formatCount(c?.new_buyers ?? 0)} new, ${formatCount(c?.returning_buyers ?? 0)} returning`} href={state.href({ tab: 'students' }, '/analytics')} />
      <Figure {...common} label="Refunded or revoked" value={formatINR(c?.reversed_amount, { whole: true })} now={c?.reversed_amount} before={p?.reversed_amount} upIsGood={false} hint={`${plural(c?.reversed_orders ?? 0, 'order')} from this period`} href={purchases ? purchasesHref({ ...open, status: 'revoked' }) : undefined} />
      {c?.new_users !== undefined || loading ? <Figure {...common} label="New students" value={formatCount(c?.new_users)} now={c?.new_users} before={p?.new_users} hint={was(p?.new_users) ?? 'Registered'} href={state.href({ tab: 'students' }, '/analytics')} /> : null}
      {c?.active_users !== undefined || loading ? <Figure {...common} label="Active students" value={formatCount(c?.active_users)} now={c?.active_users} before={p?.active_users} hint={was(p?.active_users) ?? 'With recorded activity'} href={state.href({ tab: 'students' }, '/analytics')} /> : null}
      <Figure {...common} label="Bought more than once" value={formatCount(c?.repeat_buyers)} now={c?.repeat_buyers} before={p?.repeat_buyers} hint="Two or more orders" />
    </div>
  )
}

export function TypeBreakdown({ data, state, loading, refreshing }: { data: Overview | null; state: AnalyticsState; loading: boolean; refreshing: boolean }) {
  const { hasPermission } = useAuth()
  const rows = (data?.by_type ?? []).filter((r) => r.orders > 0 || (r.previous_collected ?? 0) > 0).sort((a, b) => b.collected - a.collected)
  const versus = versusText(data?.previous_range) ?? undefined
  const href = (type: string) => (hasPermission('payments.read') && state.linkable ? purchasesHref({ from: state.query.from, to: state.query.to, type, subject: state.filters.subject, package: type === 'package' ? state.filters.package : '', tier: type === 'package' ? state.filters.tier : '' }) : undefined)
  return (
    <ChartCard
      id="types"
      title="Revenue by product type"
      description="₹ collected in this period, GST included"
      skeleton="bars"
      csv={data ? () => ({ header: ['Product type', 'Orders', 'Buyers', 'Collected (INR)', 'Net of GST (INR)', 'Share %', 'Previous period (INR)'], rows: data.by_type.map((r) => [TYPE_NAME[r.type], r.orders, r.buyers, r.collected, r.net, r.share, r.previous_collected]) }) : undefined}
      loading={loading}
      refreshing={refreshing}
      empty={data && rows.length === 0 && <p>No sales in this period.</p>}
      table={data && (
        <DataTableView
          caption="Revenue by product type"
          rows={data.by_type}
          rowKey={(r) => r.type}
          columns={[
            { header: 'Product type', cell: (r) => TYPE_NAME[r.type], footer: 'Total' },
            { header: 'Orders', align: 'right', cell: (r) => formatCount(r.orders), footer: formatCount(data.current.orders) },
            { header: 'Collected', align: 'right', cell: (r) => formatINR(r.collected), footer: formatINR(data.current.collected) },
            { header: 'Share', align: 'right', cell: (r) => `${r.share}%` },
          ]}
        />
      )}
    >
      <RankedBars
        unit="collected"
        format={(n) => formatINR(n, { whole: true })}
        rows={rows.map((r) => ({
          key: r.type, name: TYPE_NAME[r.type], value: r.collected, color: TYPE_COLOR[r.type],
          hint: `${plural(r.orders, 'order')}, ${r.share}% of the total`,
          aside: <Delta now={r.collected} before={r.previous_collected} versus={versus} />,
          href: href(r.type),
        }))}
      />
    </ChartCard>
  )
}

/** Which videos and subjects are watched, and which are not. */
function WatchedVideos({ state }: { state: AnalyticsState }) {
  const { hasPermission } = useAuth()
  const [order, setOrder] = useState<'most' | 'least'>('most')
  const q = { from: state.query.from, to: state.query.to, subject_id: state.filters.subject, limit: 10 }
  const { data, loading, refreshing: loadingNewer, stale, error, reload } = useReport(JSON.stringify(q), () => analyticsService.videos(q))
  // A failed refresh keeps the last numbers on screen: dimmed, under a notice with a retry
  const refreshing = loadingNewer || stale
  const range = describeRange(state.range)
  if (error && !data) return <ReportError message={error} onRetry={reload} />
  const played = (data?.subjects ?? []).reduce((n, s) => n + s.plays, 0)
  const rows: WatchedVideo[] = data ? data[order] : []
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Section
        flush
        title={order === 'most' ? `Most Viewed Videos (${range})` : `Least Viewed Videos (${range})`}
        description={order === 'most' ? 'Plays recorded in this period' : 'Published videos with the fewest plays in this period'}
        action={<div className="flex flex-wrap items-center gap-2"><Segmented label="Order" value={order} onChange={setOrder} options={[{ value: 'most', label: 'Most watched' }, { value: 'least', label: 'Least watched' }]} /><ExportButton report="videos" query={q} /></div>}
      >
        <StaleNotice report={{ stale, error, reload }} className="mx-5 mb-3 sm:mx-6" />
        {loading ? <TableSkeleton /> : (
          <ReportTable
            caption={`${order === 'most' ? 'Most' : 'Least'} viewed videos`}
            refreshing={refreshing}
            rows={rows}
            rowKey={(v) => v.video_id}
            rowHref={(v) => videoHref(v, hasPermission)}
            empty={order === 'most' || played === 0 ? 'No plays were recorded in this period. Try a longer range.' : 'No videos match.'}
            columns={[
              { key: 'video', header: 'Video', cell: (v) => <><span className="block truncate font-medium" title={v.title}>{v.title}</span><span className="block truncate text-xs text-muted-foreground">{[v.subject_name ?? 'No subject', v.package_name].filter(Boolean).join(', ')}</span></> },
              { key: 'plays', header: 'Plays', align: 'right', sort: (v) => v.plays, cell: (v) => formatCount(v.plays) },
              { key: 'unique', header: 'Unique', align: 'right', sort: (v) => v.viewers, cell: (v) => formatCount(v.viewers) },
              { key: 'watch', header: 'Avg watch', align: 'right', sort: (v) => v.avg_watch_seconds, cell: (v) => formatWatch(v.avg_watch_seconds) },
            ]}
          />
        )}
      </Section>
      <ChartCard
        title="Plays by subject"
        description={`Video plays, ${rangeInSentence(state.range)}`}
        skeleton="bars"
        csv={data ? () => ({ header: ['Subject', 'Plays', 'Videos', 'Not watched'], rows: data.subjects.map((s) => [s.name, s.plays, s.videos, s.not_watched]) }) : undefined}
        loading={loading}
        refreshing={refreshing}
        empty={data && played === 0 && <p>No plays were recorded in this period.</p>}
        table={data && (
          <DataTableView
            caption="Plays by subject"
            rows={data.subjects}
            rowKey={(s) => s.subject_id ?? 'none'}
            columns={[
              { header: 'Subject', cell: (s) => s.name },
              { header: 'Plays', align: 'right', cell: (s) => formatCount(s.plays), footer: formatCount(played) },
              { header: 'Videos', align: 'right', cell: (s) => formatCount(s.videos) },
              { header: 'Not watched', align: 'right', cell: (s) => formatCount(s.not_watched) },
            ]}
          />
        )}
      >
        <RankedBars
          unit="plays"
          format={formatCount}
          rows={(data?.subjects ?? []).map((s) => ({
            key: s.subject_id ?? 'none', name: s.name, value: s.plays,
            hint: s.not_watched > 0 ? `${formatCount(s.not_watched)} of ${plural(s.videos, 'video')} not watched` : `All ${plural(s.videos, 'video')} watched`,
            href: s.subject_id ? state.href({ subject: s.subject_id }, '/analytics') : undefined,
          }))}
        />
      </ChartCard>
    </div>
  )
}

export function OverviewTab({ state }: { state: AnalyticsState }) {
  const { hasPermission } = useAuth()
  const q = state.query
  const overview = useReport(JSON.stringify(q), () => analyticsService.overview(q))
  const insights = useReport(`ins${JSON.stringify(q)}`, () => analyticsService.insights(q))
  const runQuery = { ...q, from: '', to: '', compare: 'none' as const }
  const runrate = useReport(`run${JSON.stringify(runQuery)}`, () => analyticsService.runrate(runQuery))
  const contentQuery = { from: q.from, to: q.to, subject_id: q.subject_id }
  const content = useReport(JSON.stringify(contentQuery), () => analyticsService.content(contentQuery))
  const headline = useReport('headline', () => analyticsService.headline())
  const range = describeRange(state.range)
  const versus = versusText(overview.data?.previous_range)
  const wide = useMediaQuery('(min-width: 1280px)')

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <InsightStrip report={insights} fill hrefFor={insightHref(state, hasPermission)} description={versus ? `${range}, against ${versus}` : range} />
        <RunRate report={runrate} fill revenueHref="/commerce/revenue?range=month" />
      </div>

      <HeadlineCards />

      <section aria-labelledby="period-title" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="period-title" className="text-[15px] font-semibold">{range}</h2>
          <p className="text-[13px] text-muted-foreground">{versus ? `Compared with ${versus}` : 'No comparison for this range'}</p>
        </div>
        <StaleNotice report={overview} />
        {overview.error && !overview.data
          ? <ReportError message={overview.error} onRetry={overview.reload} />
          : <PeriodFigures data={overview.data} state={state} loading={overview.loading} refreshing={overview.refreshing || overview.stale} />}
        {!!overview.data?.current.legacy_orders && (
          <p className="text-[13px] text-muted-foreground">
            {plural(overview.data.current.legacy_orders, 'older order')} in this period {overview.data.current.legacy_orders === 1 ? 'has' : 'have'} no gateway amount. {overview.data.current.legacy_orders === 1 ? 'It is' : 'They are'} counted at the recorded price and {overview.data.current.legacy_orders === 1 ? 'its' : 'their'} GST is not known.
          </p>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SalesTrend query={q} fill byType={!state.filters.type && !state.filters.package && !state.filters.kind && !state.filters.tier} height={wide ? 320 : 280} />
        <TypeBreakdown data={overview.data} state={state} loading={overview.loading} refreshing={overview.refreshing || overview.stale} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Revenue Overview" description="Collected, GST included">
          <dl className="space-y-1">
            {[
              { name: 'Total Revenue', value: headline.data?.revenue.total, href: '/commerce/revenue?range=all' },
              { name: 'This Month', value: headline.data?.revenue.this_month, href: '/commerce/revenue?range=month' },
              // This figure is filtered, so its page opens with the same range and filters
              { name: range, value: overview.data?.current.collected, href: state.href({ tab: null, page: null, cmp: null, pa: null, pb: null, sa: null, sb: null, bfrom: null, bto: null, brange: null }, '/commerce/revenue') },
            ].map((r) => (
              <Link key={r.name} to={r.href} className="-mx-2 flex items-center justify-between gap-4 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent/60 pointer-coarse:min-h-10">
                <dt className="text-muted-foreground">{r.name}</dt>
                <dd className="font-semibold tabular-nums">{formatINR(r.value)}</dd>
              </Link>
            ))}
          </dl>
        </Section>

        <Section title={`Events (${range})`} description="What students did in the app">
          <StaleNotice report={content} className="mb-3" />
          {content.error && !content.data ? <p className="text-sm text-muted-foreground">Events could not be loaded. <button type="button" className="underline" onClick={content.reload}>Try again</button></p>
            : content.loading ? <TableSkeleton rows={4} />
              : content.data && content.data.events.length > 0 ? (
                <ul className={cn('space-y-2 transition-opacity duration-150', (content.refreshing || content.stale) && 'opacity-60')}>
                  {content.data.events.map((e) => (
                    <li key={e.event_type} className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">{eventName(e.event_type)}</span>
                      <Badge variant="secondary" className="bg-accent text-accent-foreground tabular-nums">{formatCount(e.count)}</Badge>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-4 text-sm text-muted-foreground">No events recorded in this period.</p>}
        </Section>
      </div>

      <Section flush title={`Popular Subjects (${range})`} description="Subjects with the most package purchases">
        {content.loading ? <TableSkeleton rows={4} /> : (
          <ReportTable
            caption="Popular subjects"
            refreshing={content.refreshing || content.stale}
            rows={content.data?.popular_subjects ?? []}
            rowKey={(s) => s.subject_id}
            rowHref={(s) => state.href({ tab: 'sales', subject: s.subject_id, package: null, tier: null }, '/analytics')}
            empty="No package purchases in this period."
            columns={[
              { key: 'subject', header: 'Subject', cell: (s) => <span className="font-medium">{s.name}</span> },
              { key: 'purchases', header: 'Purchases', align: 'right', cell: (s) => formatCount(s.purchase_count) },
              { key: 'collected', header: 'Collected', align: 'right', cell: (s) => formatINR(s.collected, { whole: true }) },
            ]}
          />
        )}
      </Section>

      <WatchedVideos state={state} />
    </div>
  )
}
