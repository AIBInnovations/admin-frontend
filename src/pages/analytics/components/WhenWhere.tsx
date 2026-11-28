import { useState } from 'react'
import { analyticsService } from '@/services/analytics.service'
import { ChartCard, DataTableView } from '@/components/charts/ChartCard'
import { Delta } from '@/components/charts/Delta'
import { Heatmap } from '@/components/charts/Heatmap'
import { RankedBars } from '@/components/charts/RankedBars'
import { DOW_NAMES, compactCount, compactINR, formatCount, formatINR, hourSpan, percent, plural } from '@/components/charts/format'
import { useReport } from '@/components/charts/useReport'
import { parseHours, versusText, type AnalyticsState } from '../useAnalyticsState'
import { NoResults } from './FilterBar'
import { ReportError, Segmented } from './bits'

const money = (n: number) => formatINR(n, { whole: true })

/** Day of the week by hour, IST. A cell filters the rest of the page; the chart itself keeps every cell. */
export function WhenPeopleBuy({ state }: { state: AnalyticsState }) {
  const [metric, setMetric] = useState<'collected' | 'orders'>('collected')
  const q = { ...state.query, dow: '', hour: '', compare: 'none' as const }
  const { data, loading, refreshing: loadingNewer, stale, error, reload } = useReport(`heat${JSON.stringify(q)}`, () => analyticsService.heatmap(q))
  // A failed refresh keeps the last numbers on screen: dimmed, under a notice with a retry
  const refreshing = loadingNewer || stale
  if (error && !data) return <ReportError message={error} onRetry={reload} />
  const f = state.filters
  const hours = parseHours(f.hour)
  const pick = (dow: number, h: [number, number]) => {
    const value = h[0] === h[1] ? String(h[0]) : `${h[0]}-${h[1]}`
    const same = f.dow === String(dow) && f.hour === value
    state.update(same ? { dow: null, hour: null, page: null } : { dow: String(dow), hour: value, page: null }, { push: true })
  }
  const peak = data?.peak
  const busiest = data?.busiest_day ? data.by_dow[data.busiest_day - 1] : null
  return (
    <ChartCard
      id="when"
      title="When people buy"
      description={`Paid orders by day of the week and hour (IST), ${metric === 'orders' ? 'counted' : 'by ₹ collected'}. Click a cell to filter this page by that time.`}
      loading={loading}
      refreshing={refreshing}
      staleError={stale ? error : null}
      onRetry={reload}
      skeleton="heatmap"
      height={270}
      action={<Segmented label="Measure" value={metric} onChange={setMetric} options={[{ value: 'collected', label: 'Collected' }, { value: 'orders', label: 'Orders' }]} />}
      empty={data && data.total.orders === 0 && <NoResults what="No sales in this period." onClear={state.activeFilters ? state.clearFilters : undefined} />}
      exportName="sales-by-day-and-hour"
      csv={data ? () => ({ header: ['Day', 'Hour (IST)', 'Orders', 'Collected (INR)', 'Net of GST (INR)'], rows: data.cells.map((c) => [DOW_NAMES[c.dow - 1], hourSpan(c.hour), c.orders, c.collected, c.net]) }) : undefined}
      table={data && (
        <DataTableView
          caption="Sales by day and hour"
          rows={data.cells.filter((c) => c.orders > 0)}
          rowKey={(c) => `${c.dow}:${c.hour}`}
          columns={[
            { header: 'Day and hour (IST)', cell: (c) => `${DOW_NAMES[c.dow - 1]}, ${hourSpan(c.hour)}`, footer: 'Total' },
            { header: 'Orders', align: 'right', cell: (c) => formatCount(c.orders), footer: formatCount(data.total.orders) },
            { header: 'Collected', align: 'right', cell: (c) => formatINR(c.collected), footer: formatINR(data.total.collected) },
          ]}
        />
      )}
      footer={data && peak && (
        <p className="mt-3 text-[13px] text-muted-foreground">
          Busiest hour: <span className="font-medium text-foreground">{DOW_NAMES[peak.dow - 1]}s, {hourSpan(peak.hour)}</span> ({compactINR(peak.collected)}, {plural(peak.orders, 'order')}).
          {busiest && <> Busiest day: <span className="font-medium text-foreground">{DOW_NAMES[busiest.dow - 1]}</span> ({percent((busiest.collected / Math.max(1, data.total.collected)) * 100)} of revenue).</>}
        </p>
      )}
    >
      {data && (
        <Heatmap
          cells={data.cells}
          metric={metric}
          format={metric === 'orders' ? (n) => formatCount(n) : money}
          compact={metric === 'orders' ? compactCount : compactINR}
          label="Sales by day of the week and hour"
          selected={{ dow: f.dow ? Number(f.dow) : null, hours }}
          onSelect={pick}
        />
      )}
    </ChartCard>
  )
}

/** Billing state on each purchase. A state filters the rest of the page. */
export function WhereBuyersAre({ state }: { state: AnalyticsState }) {
  const [all, setAll] = useState(false)
  const q = { ...state.query, state: '' }
  const { data, loading, refreshing: loadingNewer, stale, error, reload } = useReport(`states${JSON.stringify(q)}`, () => analyticsService.states(q))
  // A failed refresh keeps the last numbers on screen: dimmed, under a notice with a retry
  const refreshing = loadingNewer || stale
  if (error && !data) return <ReportError message={error} onRetry={reload} />
  const rows = data?.rows.filter((r) => r.orders > 0) ?? []
  const shown = all ? rows : rows.slice(0, 10)
  const versus = versusText(data?.previous_range) ?? undefined
  const pick = (key: string) => state.update({ state: state.filters.state === key ? null : key, page: null }, { push: true })
  return (
    <ChartCard
      id="where"
      title="Where buyers are"
      description="₹ collected by the billing state on each purchase (else the student's own address). Click a state to filter this page."
      loading={loading}
      refreshing={refreshing}
      staleError={stale ? error : null}
      onRetry={reload}
      skeleton="bars"
      height={300}
      empty={data && rows.length === 0 && <NoResults what="No sales in this period." onClear={state.activeFilters ? state.clearFilters : undefined} />}
      exportName="sales-by-state"
      csv={data ? () => ({ header: ['State', 'Orders', 'Buyers', 'Collected (INR)', 'Net of GST (INR)', 'Share %', 'Previous period (INR)'], rows: [...data.rows.map((r) => [r.name, r.orders, r.buyers, r.collected, r.net, r.share, r.previous_collected]), ['Total', data.total.orders, data.total.buyers, data.total.collected, data.total.net, 100, '']] }) : undefined}
      table={data && (
        <DataTableView
          caption="Sales by state"
          rows={rows}
          rowKey={(r) => r.key}
          columns={[
            { header: 'State', cell: (r) => r.name, footer: 'Total' },
            { header: 'Orders', align: 'right', cell: (r) => formatCount(r.orders), footer: formatCount(data.total.orders) },
            { header: 'Buyers', align: 'right', cell: (r) => formatCount(r.buyers), footer: formatCount(data.total.buyers) },
            { header: 'Collected', align: 'right', cell: (r) => formatINR(r.collected), footer: formatINR(data.total.collected) },
            { header: 'Share', align: 'right', cell: (r) => `${r.share}%` },
          ]}
        />
      )}
      footer={data && rows.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted-foreground">
          <span>{plural(data.states_with_sales, 'state')} with sales. {percent(data.recorded_share)} of revenue has a billing state.</span>
          {rows.length > 10 && <button type="button" onClick={() => setAll((v) => !v)} className="font-medium text-primary hover:underline">{all ? 'Show the top 10' : `Show all ${rows.length}`}</button>}
        </div>
      )}
    >
      <RankedBars
        unit="collected"
        format={money}
        selected={state.filters.state || null}
        onSelect={pick}
        rows={shown.map((r) => ({
          key: r.key, name: r.name, value: r.collected, color: r.state ? 'var(--chart-primary)' : 'var(--chart-rest)',
          hint: `${plural(r.orders, 'order')}, ${plural(r.buyers, 'buyer')}, ${r.share}% of revenue`,
          aside: <Delta now={r.collected} before={r.previous_collected} versus={versus} />,
        }))}
      />
    </ChartCard>
  )
}
