import { Section } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { formatCount, formatINR, formatDuration } from '@/lib/format'
import { analyticsService, type PackageRow, type TierRow } from '@/services/analytics.service'
import { ChartCard, DataTableView } from '@/components/charts/ChartCard'
import { Delta } from '@/components/charts/Delta'
import { RankedBars } from '@/components/charts/RankedBars'
import { ReportTable } from '@/components/charts/ReportTable'
import { Sparkline } from '@/components/charts/Sparkline'
import { KIND_COLOR, KIND_NAME } from '@/components/charts/palette'
import { plural } from '@/components/charts/format'
import { useReport } from '@/components/charts/useReport'
import { purchasesHref, versusText, type AnalyticsState } from '../useAnalyticsState'
import { StaleNotice, ExportButton, ReportError, TableSkeleton } from './bits'
import { NoResults } from './FilterBar'

type Row = { kind: 'package'; p: PackageRow } | { kind: 'tier'; p: PackageRow; t: TierRow }
const money = (n: number | null | undefined) => formatINR(n, { whole: true })

export function planLabel(t: { tier_duration_days: number | null; tier_name: string | null }): string {
  if (t.tier_duration_days) return `${formatDuration(t.tier_duration_days)} subscription`
  return t.tier_name || 'No plan recorded'
}

/** Top packages as bars, and every package with its plans as a table. */
export function PackagesTable({ state, linkTo = 'drill', chart = true }: { state: AnalyticsState; linkTo?: 'drill' | 'purchases'; chart?: boolean }) {
  const { hasPermission } = useAuth()
  const q = { ...state.query, type: '' }
  const { data, loading, refreshing: loadingNewer, stale, error, reload } = useReport(`p${JSON.stringify(q)}`, () => analyticsService.packages(q))
  // A failed refresh keeps the last numbers on screen: dimmed, under a notice with a retry
  const refreshing = loadingNewer || stale
  if (error && !data) return <ReportError message={error} onRetry={reload} />

  const open = (p: PackageRow, tier?: string): string | null => {
    if (linkTo === 'purchases') return hasPermission('payments.read') ? purchasesHref({ from: q.from, to: q.to, package: p.package_id, tier }) : null
    return state.href({ tab: 'sales', subject: state.filters.subject || p.subject_id, package: p.package_id, tier: tier ?? null, kind: null, page: null }, '/analytics')
  }
  const rows: Row[] = (data?.rows ?? []).map((p) => ({ kind: 'package', p }))
  const selling = (data?.rows ?? []).filter((p) => p.collected > 0)
  const top = selling.slice(0, 10)
  const figure = (r: Row) => (r.kind === 'tier' ? r.t : r.p)
  const versus = versusText(data?.previous_range) ?? undefined

  return (
    <>
      {chart && <ChartCard
        id="packages"
        title="Top packages"
        description={`₹ collected in this period, GST included${selling.length > 10 ? '. The ten highest' : ''}`}
        skeleton="bars"
        height={320}
        csv={data ? () => ({ header: ['Package', 'Type', 'Subject', 'Orders', 'Buyers', 'Collected (INR)', 'Share %', 'Previous period (INR)'], rows: selling.map((p) => [p.name, p.package_type ?? KIND_NAME[p.kind], p.subject_name ?? 'No subject', p.orders, p.buyers, p.collected, p.share, p.previous_collected]) }) : undefined}
        loading={loading}
        refreshing={refreshing}
        empty={data && top.length === 0 && <NoResults what="No packages sold in this period." onClear={state.activeFilters ? state.clearFilters : undefined} />}
        legend={[...new Set(top.map((p) => p.kind))].sort((a, b) => Object.keys(KIND_NAME).indexOf(a) - Object.keys(KIND_NAME).indexOf(b)).map((k) => ({ key: k, name: KIND_NAME[k], color: KIND_COLOR[k] }))}
        table={data && (
          <DataTableView
            caption="Top packages"
            rows={selling}
            rowKey={(p) => p.package_id}
            columns={[
              { header: 'Package', cell: (p) => p.name, footer: 'Total' },
              { header: 'Type', cell: (p) => p.package_type ?? KIND_NAME[p.kind] },
              { header: 'Orders', align: 'right', cell: (p) => formatCount(p.orders), footer: formatCount(data.total.orders) },
              { header: 'Collected', align: 'right', cell: (p) => formatINR(p.collected), footer: formatINR(data.total.collected) },
            ]}
          />
        )}
      >
        <RankedBars
          unit="collected"
          format={(n) => money(n)}
          rows={top.map((p) => ({
            key: p.package_id, name: p.name, value: p.collected, color: KIND_COLOR[p.kind],
            hint: `${p.package_type ?? KIND_NAME[p.kind]}, ${p.subject_name ?? 'no subject'}. ${plural(p.orders, 'order')}, ${p.share}% of package revenue`,
            aside: <Delta now={p.collected} before={p.previous_collected} versus={versus} />,
            href: open(p) ?? undefined,
          }))}
        />
      </ChartCard>}

      <Section flush title="Packages and plans" description={"Each plan is its own subscription. Open a row to see " + (linkTo === 'purchases' ? 'its purchases.' : 'its trend and buyers.')} action={<ExportButton report="packages" query={q} />}>
        <StaleNotice report={{ stale, error, reload }} className="mx-5 mb-3 sm:mx-6" />
        {loading ? <TableSkeleton /> : (
          <ReportTable<Row>
            caption="Packages and plans"
            refreshing={refreshing}
            rows={rows}
            rowKey={(r) => (r.kind === 'tier' ? `${r.p.package_id}:${r.t.key}` : r.p.package_id)}
            rowHref={(r) => open(r.p, r.kind === 'tier' ? r.t.key : undefined)}
            subRows={(r) => (r.kind === 'package' && (r.p.tiers.length > 1 || (r.p.tiers.length === 1 && r.p.tiers[0].key !== 'none')) ? r.p.tiers.map((t) => ({ kind: 'tier' as const, p: r.p, t })) : [])}
            empty={<NoResults what="No packages match these filters." onClear={state.activeFilters ? state.clearFilters : undefined} />}
            initialSort={{ key: 'collected', desc: true }}
            columns={[
              {
                key: 'name', header: 'Package', sort: (r) => r.p.name, footer: 'Total',
                cell: (r) => r.kind === 'tier'
                  ? <span className="block truncate text-[13px]">{planLabel(r.t)}</span>
                  : <><span className="block truncate font-medium" title={r.p.name}>{r.p.name}</span><span className="block truncate text-xs text-muted-foreground">{[r.p.package_type, r.p.subject_name ?? 'No subject'].filter(Boolean).join(', ')}</span></>,
              },
              { key: 'collected', header: 'Collected', align: 'right', sort: (r) => figure(r).collected, cell: (r) => <span className={r.kind === 'package' ? 'font-medium' : ''}>{money(figure(r).collected)}</span>, footer: money(data?.total.collected) },
              ...(data?.previous_range ? [{ key: 'delta', header: 'Change', align: 'right' as const, cell: (r: Row) => <Delta now={figure(r).collected} before={figure(r).previous_collected} />, footer: <Delta now={data.total.collected} before={data.total.previous_collected} /> }] : []),
              { key: 'orders', header: 'Orders', align: 'right', sort: (r) => figure(r).orders, cell: (r) => formatCount(figure(r).orders), footer: formatCount(data?.total.orders) },
              { key: 'buyers', header: 'Buyers', align: 'right', sort: (r) => r.p.buyers, cell: (r) => (r.kind === 'package' ? formatCount(r.p.buyers) : ''), footer: formatCount(data?.total.buyers) },
              { key: 'share', header: 'Share', align: 'right', sort: (r) => figure(r).share, cell: (r) => <span className={r.kind === 'tier' ? 'text-muted-foreground' : ''}>{figure(r).share}%</span> },
              { key: 'net', header: 'Net of GST', align: 'right', sort: (r) => figure(r).net, cell: (r) => money(figure(r).net), footer: money(data?.total.net) },
              { key: 'discount', header: 'Discounts', align: 'right', sort: (r) => figure(r).discount, cell: (r) => money(figure(r).discount), footer: money(data?.total.discount) },
              { key: 'trend', header: 'Trend', cell: (r) => (r.kind === 'package' ? <Sparkline values={r.p.trend} /> : '') },
            ]}
          />
        )}
      </Section>
    </>
  )
}
