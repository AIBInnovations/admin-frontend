import { Link } from 'react-router-dom'
import { Section } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { analyticsService, type StudentValueReport } from '@/services/analytics.service'
import { ChartCard, DataTableView } from '@/components/charts/ChartCard'
import { FunnelBars } from '@/components/charts/FunnelBars'
import { RankedBars } from '@/components/charts/RankedBars'
import { ReportTable } from '@/components/charts/ReportTable'
import { compactINR, formatCount, formatINR, istDay, monthLabel, percent, plural } from '@/components/charts/format'
import { downloadCsv, fileName } from '@/components/charts/exporting'
import { useReport } from '@/components/charts/useReport'
import { versusText, type AnalyticsState } from '../useAnalyticsState'
import { StaleNotice, Figure, ReportError, TableSkeleton } from './bits'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

const money = (n: number) => formatINR(n, { whole: true })
const days = (n: number | null) => (n === null ? 'No purchases yet' : n === 0 ? 'the same day' : n === 1 ? '1 day' : `${formatCount(n)} days`)

/** Registered in the range, then a first and a second purchase of anything, by today. */
export function FunnelSection({ state }: { state: AnalyticsState }) {
  const q = { from: state.query.from, to: state.query.to }
  const { data: d, loading, refreshing: loadingNewer, stale, error, reload } = useReport(`funnel${JSON.stringify(q)}`, () => analyticsService.funnel(q))
  // A failed refresh keeps the last numbers on screen: dimmed, under a notice with a retry
  const refreshing = loadingNewer || stale
  if (error && !d) return <ReportError message={error} onRetry={reload} />
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <ChartCard
        id="funnel"
        title="From registering to buying again"
        description="Students who registered in this period, and how many of them have bought once and twice by today (any product)."
        loading={loading}
        refreshing={refreshing}
        staleError={stale ? error : null}
        onRetry={reload}
        skeleton="funnel"
        height={250}
        empty={d && d.registered === 0 && <p>Nobody registered in this period.</p>}
        exportName="funnel"
        csv={d ? () => ({ header: ['Registered in', 'Registered', 'Made a first purchase', 'Bought a second time', 'First purchase rate %'], rows: [...d.by_month.map((m) => [m.month, m.registered, m.bought, m.second, m.rate]), ['Total', d.registered, d.first_purchase, d.second_purchase, d.steps[1].share]] }) : undefined}
        table={d && (
          <DataTableView
            caption="Funnel by month of registering"
            rows={d.by_month}
            rowKey={(m) => m.month}
            columns={[
              { header: 'Registered in', cell: (m) => monthLabel(m.month), footer: 'Total' },
              { header: 'Registered', align: 'right', cell: (m) => formatCount(m.registered), footer: formatCount(d.registered) },
              { header: 'First purchase', align: 'right', cell: (m) => formatCount(m.bought), footer: formatCount(d.first_purchase) },
              { header: 'Second purchase', align: 'right', cell: (m) => formatCount(m.second), footer: formatCount(d.second_purchase) },
              { header: 'Bought', align: 'right', cell: (m) => `${m.rate}%`, footer: `${d.steps[1].share}%` },
            ]}
          />
        )}
        footer={d && d.registered > 0 && (
          <p className="mt-3 text-[13px] text-muted-foreground">
            Half of those who bought did so within <span className="font-medium text-foreground">{days(d.median_days_to_first)}</span> of registering
            {d.median_days_to_second !== null && <>, and came back for a second purchase within <span className="font-medium text-foreground">{days(d.median_days_to_second)}</span></>}.
            {d.bought_before_registering > 0 && <> {plural(d.bought_before_registering, 'older account has', 'older accounts have')} a purchase dated before registering; counted as the same day.</>}
          </p>
        )}
      >
        {d && <FunnelBars steps={d.steps} />}
      </ChartCard>

      <ChartCard
        id="time-to-first"
        title="Time to first purchase"
        description="Of the students above who have bought, how long after registering they first did"
        loading={loading}
        refreshing={refreshing}
        skeleton="bars"
        height={250}
        empty={d && d.first_purchase === 0 && <p>None of them has bought yet.</p>}
        exportName="time-to-first-purchase"
        csv={d ? () => ({ header: ['First purchase', 'Students', 'Share %'], rows: d.time_to_first.map((b) => [b.label, b.students, b.share]) }) : undefined}
        table={d && (
          <DataTableView caption="Time to first purchase" rows={d.time_to_first} rowKey={(b) => b.key} columns={[
            { header: 'First purchase', cell: (b) => b.label, footer: 'Bought' },
            { header: 'Students', align: 'right', cell: (b) => formatCount(b.students), footer: formatCount(d.first_purchase) },
            { header: 'Share', align: 'right', cell: (b) => `${b.share}%` },
          ]} />
        )}
      >
        <RankedBars unit="students" format={formatCount} max={d?.first_purchase} rows={(d?.time_to_first ?? []).map((b) => ({ key: b.key, name: b.label, value: b.students, hint: `${percent(b.share)} of those who bought` }))} />
      </ChartCard>
    </div>
  )
}

/** Spend per student in the range, repeat buyers, and the students who spent the most. */
export function StudentValueSection({ state }: { state: AnalyticsState }) {
  const { hasPermission } = useAuth()
  // Only what the Students tab shows: the range (no product or cross-filters)
  const q = state.scopedQuery('students')
  const { data: d, loading, refreshing: loadingNewer, stale, error, reload } = useReport(`value${JSON.stringify(q)}`, () => analyticsService.studentValue(q))
  // A failed refresh keeps the last numbers on screen: dimmed, under a notice with a retry
  const refreshing = loadingNewer || stale
  const canUsers = hasPermission('users.read')
  if (error && !d) return <ReportError message={error} onRetry={reload} />
  const versus = versusText(d?.previous_range) ?? undefined
  const common = { loading, refreshing, versus }
  const top = d?.top ?? []
  const exportTop = () => {
    if (!d) return
    downloadCsv(fileName('pgme-top-students', q.from, q.to), {
      header: ['Rank', 'Student', 'Student ID', 'Orders', 'Collected in period (INR)', 'Share %', 'Lifetime (INR)', 'First purchase in period (IST)', 'Last purchase in period (IST)'],
      rows: top.map((t) => [t.rank, t.user?.name ?? (d.names_hidden ? 'Hidden' : 'Deleted student'), t.user?.student_id ?? '', t.orders, t.collected, t.share, t.lifetime, istDay(t.first_at), istDay(t.last_at)]),
    })
  }
  return (
    <section aria-labelledby="value-title" className="space-y-3" id="focus-value">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="value-title" className="text-[15px] font-semibold">Student value</h2>
        <p className="text-[13px] text-muted-foreground">Buyers in this period, all products</p>
      </div>
      <StaleNotice report={{ stale, error, reload }} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Figure {...common} label="Spend per buyer" count={d?.average_per_buyer} now={d?.average_per_buyer} before={d?.previous?.average_per_buyer} hint={d ? `Median ${compactINR(d.median_per_buyer)}` : undefined} />
        <Figure {...common} label="Buyers" count={d?.buyers} as="count" now={d?.buyers} before={d?.previous?.buyers} hint={d ? `${compactINR(d.collected)} between them` : undefined} />
        <Figure {...common} label="Bought more than once" count={d?.repeat.buyers} as="count" now={d?.repeat.buyers} before={d?.previous?.repeat_buyers} hint={d ? `${percent(d.repeat.share)} of buyers` : undefined} />
        <Figure {...common} label="From repeat buyers" value={d ? percent(d.repeat.collected_share) : '—'} hint={d ? `${compactINR(d.repeat.collected)} of revenue` : undefined} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ChartCard
          id="spend"
          title="Spend per student"
          description="Buyers by what they spent in this period, GST included"
          loading={loading}
          refreshing={refreshing}
          skeleton="bars"
          height={280}
          empty={d && d.buyers === 0 && <p>No buyers in this period.</p>}
          exportName="spend-per-student"
          csv={d ? () => ({ header: ['Spent', 'Buyers', 'Share of buyers %', 'Collected (INR)'], rows: d.bands.map((b) => [b.label, b.buyers, b.share, b.collected]) }) : undefined}
          table={d && (
            <DataTableView caption="Spend per student" rows={d.bands} rowKey={(b) => b.key} columns={[
              { header: 'Spent', cell: (b) => b.label, footer: 'Total' },
              { header: 'Buyers', align: 'right', cell: (b) => formatCount(b.buyers), footer: formatCount(d.buyers) },
              { header: 'Collected', align: 'right', cell: (b) => formatINR(b.collected), footer: formatINR(d.collected) },
            ]} />
          )}
        >
          <RankedBars unit="buyers" format={formatCount} max={Math.max(1, ...(d?.bands ?? []).map((b) => b.buyers))} rows={(d?.bands ?? []).map((b) => ({ key: b.key, name: b.label, value: b.buyers, hint: `${percent(b.share)} of buyers, ${compactINR(b.collected)}` }))} />
        </ChartCard>

        <Section
          id="focus-top-students"
          flush
          title="Top students"
          description={d?.names_hidden ? 'Names need the users permission; ranks and amounts are shown.' : 'Who spent the most in this period. Open a row to see the student.'}
          action={top.length > 0 ? <Button type="button" variant="outline" size="sm" onClick={exportTop}><Download className="h-3.5 w-3.5" />Download CSV</Button> : undefined}
        >
          {loading ? <TableSkeleton rows={6} /> : (
            <ReportTable<StudentValueReport['top'][number]>
              caption="Top students"
              refreshing={refreshing}
              rows={top}
              rowKey={(t) => String(t.rank)}
              rowHref={(t) => (canUsers && t.user ? `/users/${t.user.user_id}` : null)}
              maxHeight={420}
              empty="No buyers in this period."
              columns={[
                { key: 'student', header: 'Student', cell: (t) => <span className="flex items-center gap-3"><span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{t.rank}</span><span className="min-w-0"><span className="block truncate font-medium">{t.user?.name ?? (d?.names_hidden ? `Student ${t.rank}` : 'Deleted student')}</span>{t.user?.student_id && <span className="block font-mono text-xs text-muted-foreground">{t.user.student_id}</span>}</span></span> },
                { key: 'collected', header: 'In this period', align: 'right', sort: (t) => t.collected, cell: (t) => <><span className="block font-medium">{money(t.collected)}</span><span className="block text-xs text-muted-foreground">{plural(t.orders, 'order')}, {percent(t.share)}</span></> },
                { key: 'lifetime', header: 'All time', align: 'right', sort: (t) => t.lifetime, cell: (t) => <><span className="block">{money(t.lifetime)}</span><span className="block text-xs text-muted-foreground">{plural(t.lifetime_orders, 'order')}</span></> },
                { key: 'last', header: 'Last bought', cell: (t) => istDay(t.last_at) },
                ...(canUsers ? [{ key: 'open', header: 'Student page', cell: (t: StudentValueReport['top'][number]) => (t.user ? <Link to={`/users/${t.user.user_id}`} className="text-primary underline-offset-4 hover:underline">Open student</Link> : '') }] : []),
              ]}
            />
          )}
        </Section>
      </div>
    </section>
  )
}
