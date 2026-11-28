import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { analyticsService } from '@/services/analytics.service'
import { videoAnalyticsService, type AudienceText, type VideoQuery } from '@/services/videoAnalytics.service'
import { ChartCard, DataTableView, chartTool } from '@/components/charts/ChartCard'
import { Delta } from '@/components/charts/Delta'
import { RankedBars } from '@/components/charts/RankedBars'
import { formatCount, formatINR, percent, plural } from '@/components/charts/format'
import { useReport } from '@/components/charts/useReport'
import { versusText, type AnalyticsState } from '../useAnalyticsState'
import { ReportError, StaleNotice } from './bits'
import { VideoExportButton } from './VideoExportButton'

const SHOWN = 10

/** One text breakdown (cities, colleges): the top names, everything else, and the blanks as their own bars. */
function TextCard({ title, description, data, noun, loading, refreshing, empty, exportName }: { title: string; description: string; data: AudienceText | null; noun: string; loading: boolean; refreshing: boolean; empty: React.ReactNode | false; exportName: string }) {
  const [all, setAll] = useState(false)
  const rows = data ? (all ? data.rows : data.rows.slice(0, SHOWN)) : []
  // "Other" holds every name not drawn: past the server's top list, and past the ten shown here
  const hidden = data ? data.rows.slice(rows.length) : []
  const rest = data ? { viewers: data.others.viewers + hidden.reduce((n, r) => n + r.viewers, 0), names: data.others.names + hidden.length } : { viewers: 0, names: 0 }
  const total = data ? data.rows.reduce((n, r) => n + r.viewers, 0) + data.others.viewers + data.not_recorded.viewers : 0
  const bars = data
    ? [
        ...rows.map((r) => ({ key: r.key, name: r.name, value: r.viewers, hint: `${percent(r.share)} of viewers` })),
        ...(rest.viewers > 0 ? [{ key: '_other', name: `Other ${noun === 'city' ? 'cities' : `${noun}s`} (${formatCount(rest.names)})`, value: rest.viewers, hint: `${percent(total ? (rest.viewers / total) * 100 : 0)} of viewers`, color: 'var(--chart-rest)' }] : []),
        ...(data.not_recorded.viewers > 0 ? [{ key: '_none', name: 'Not recorded', value: data.not_recorded.viewers, hint: `${percent(data.not_recorded.share)} of viewers, no ${noun} on their profile`, color: 'var(--chart-rest)' }] : []),
      ]
    : []
  return (
    <ChartCard
      title={title}
      description={description}
      loading={loading}
      refreshing={refreshing}
      skeleton="bars"
      height={300}
      exportName={exportName}
      empty={empty}
      csv={data ? () => ({ header: [noun[0].toUpperCase() + noun.slice(1), 'Viewers', 'Share %'], rows: [...data.rows.map((r) => [r.name, r.viewers, r.share]), ['Other', data.others.viewers, data.others.share], ['Not recorded', data.not_recorded.viewers, data.not_recorded.share]] }) : undefined}
      table={data && (
        <DataTableView caption={title} rows={bars} rowKey={(r) => r.key} columns={[
          { header: noun[0].toUpperCase() + noun.slice(1), cell: (r) => r.name },
          { header: 'Viewers', align: 'right', cell: (r) => formatCount(r.value) },
        ]} />
      )}
      footer={data && data.rows.length > SHOWN && (
        <div className="mt-2 text-[13px]">
          <button type="button" onClick={() => setAll((v) => !v)} className="font-medium text-primary hover:underline">{all ? `Show the top ${SHOWN}` : `Show the top ${data.rows.length}`}</button>
        </div>
      )}
    >
      <RankedBars unit="viewers" format={formatCount} rows={bars} />
    </ChartCard>
  )
}

/**
 * Who watches a package (or all packages, or one video): their state, city and
 * UG college from each student's own profile. "Not recorded" is its own bar.
 * For a package, also where it sells (billing state, the one sale definition).
 */
export function VideoAudience({ state, query, rangeWord }: { state: AnalyticsState; query: VideoQuery; rangeWord: string }) {
  const q: VideoQuery = { from: query.from, to: query.to, subject_id: query.subject_id, package_id: query.package_id, video_id: query.video_id }
  const aud = useReport(`va${JSON.stringify(q)}`, () => videoAnalyticsService.audience(q))
  const sq = { from: query.from, to: query.to, compare: query.compare, type: 'package', package_id: query.package_id, subject_id: query.subject_id }
  const sales = useReport(query.video_id ? null : `vs${JSON.stringify(sq)}`, () => analyticsService.states(sq))
  const d = aud.data
  const refreshing = aud.refreshing || aud.stale
  if (aud.error && !d) return <ReportError message={aud.error} onRetry={aud.reload} />
  const none = !!d && d.viewers === 0
  const nobody = none && <p>{d.basis === 'events' ? 'Nobody watched in this period.' : 'Nobody has watched yet.'}</p>
  const who = d?.basis === 'events' ? `Students who played ${query.video_id ? 'this video' : 'a video'} in this period` : `Students with saved progress on ${query.video_id ? 'this video' : 'any of its videos'}`
  const s = sales.data
  const saleRows = s?.rows.filter((r) => r.orders > 0) ?? []
  const versus = versusText(s?.previous_range) ?? undefined
  const stateBars = (d?.states.rows ?? []).map((r) => ({ key: r.key, name: r.name, value: r.viewers, hint: `${percent(r.share)} of viewers`, color: r.state ? 'var(--chart-primary)' : 'var(--chart-rest)' }))

  return (
    <div className="space-y-6">
      <StaleNotice report={aud} />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-3.5 shadow-card">
        <p className="flex min-w-0 items-center gap-2.5 text-sm">
          <Users aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>
            <span className="font-semibold tabular-nums">{d ? plural(d.viewers, 'student') : '…'}</span>
            <span className="text-muted-foreground">{` watched, ${rangeWord.toLowerCase()}. ${who}; state, city and college come from each student's own profile.`}</span>
            {d && d.deleted_students > 0 && <span className="text-muted-foreground">{` ${plural(d.deleted_students, 'of them has', 'of them have')} since deleted their account.`}</span>}
          </span>
        </p>
        <VideoExportButton report="video_audience" query={q} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          title="By state"
          description="From the billing address on each student's profile"
          loading={aud.loading}
          refreshing={refreshing}
          staleError={aud.stale ? aud.error : null}
          onRetry={aud.reload}
          skeleton="bars"
          height={300}
          exportName="viewers-by-state"
          empty={nobody}
          csv={d ? () => ({ header: ['State', 'Viewers', 'Share %'], rows: d.states.rows.map((r) => [r.name, r.viewers, r.share]) }) : undefined}
          table={d && (
            <DataTableView caption="Viewers by state" rows={d.states.rows} rowKey={(r) => r.key} columns={[
              { header: 'State', cell: (r) => r.name, footer: 'Total' },
              { header: 'Viewers', align: 'right', cell: (r) => formatCount(r.viewers), footer: formatCount(d.viewers) },
              { header: 'Share', align: 'right', cell: (r) => `${r.share}%` },
            ]} />
          )}
          footer={d && !none && <p className="mt-2 text-[13px] text-muted-foreground">{plural(d.states.distinct, 'state')}. {percent(d.viewers ? (d.states.recorded / d.viewers) * 100 : 0)} of viewers have a state recorded.</p>}
        >
          <RankedBars unit="viewers" format={formatCount} rows={stateBars} />
        </ChartCard>
        <TextCard title="Top cities" description="City on each student's billing address, spelling and case ignored" data={d?.cities ?? null} noun="city" loading={aud.loading} refreshing={refreshing} empty={nobody} exportName="viewers-by-city" />
        <TextCard title="Top UG colleges" description="The UG college each student entered, spelling and case ignored" data={d?.colleges ?? null} noun="college" loading={aud.loading} refreshing={refreshing} empty={nobody} exportName="viewers-by-college" />
      </div>

      {!query.video_id && (
        sales.error && !s ? <ReportError message={sales.error} onRetry={sales.reload} /> : (
          <ChartCard
            title={query.package_id ? 'Where this package sells' : 'Where packages sell'}
            description="₹ collected by the billing state on each paid package purchase (else the student's own address). Grants, combo parts, refunds and test orders are not sales."
            loading={sales.loading}
            refreshing={sales.refreshing || sales.stale}
            staleError={sales.stale ? sales.error : null}
            onRetry={sales.reload}
            skeleton="bars"
            height={300}
            exportName="package-sales-by-state"
            action={<Link to={state.href({ tab: 'sales', video: null, vview: null, vpage: null })} className={chartTool}>Open in Sales</Link>}
            empty={s && saleRows.length === 0 && <p>No package sales in this period.</p>}
            csv={s ? () => ({ header: ['State', 'Orders', 'Buyers', 'Collected (INR)', 'Net of GST (INR)', 'Share %', 'Previous period (INR)'], rows: saleRows.map((r) => [r.name, r.orders, r.buyers, r.collected, r.net, r.share, r.previous_collected]) }) : undefined}
            table={s && (
              <DataTableView caption="Package sales by state" rows={saleRows} rowKey={(r) => r.key} columns={[
                { header: 'State', cell: (r) => r.name, footer: 'Total' },
                { header: 'Orders', align: 'right', cell: (r) => formatCount(r.orders), footer: formatCount(s.total.orders) },
                { header: 'Buyers', align: 'right', cell: (r) => formatCount(r.buyers), footer: formatCount(s.total.buyers) },
                { header: 'Collected', align: 'right', cell: (r) => formatINR(r.collected), footer: formatINR(s.total.collected) },
              ]} />
            )}
            footer={s && saleRows.length > 0 && <p className="mt-2 text-[13px] text-muted-foreground">{plural(s.states_with_sales, 'state')} with sales. {percent(s.recorded_share)} of revenue has a billing state.</p>}
          >
            <RankedBars
              unit="collected"
              format={(n) => formatINR(n, { whole: true })}
              rows={saleRows.slice(0, 12).map((r) => ({
                key: r.key, name: r.name, value: r.collected, color: r.state ? 'var(--chart-primary)' : 'var(--chart-rest)',
                hint: `${plural(r.orders, 'order')}, ${plural(r.buyers, 'buyer')}, ${r.share}% of revenue`,
                aside: <Delta now={r.collected} before={r.previous_collected} versus={versus} />,
              }))}
            />
          </ChartCard>
        )
      )}
    </div>
  )
}
