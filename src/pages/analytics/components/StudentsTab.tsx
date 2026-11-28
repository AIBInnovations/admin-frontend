import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Section } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { formatCount } from '@/lib/format'
import { analyticsService } from '@/services/analytics.service'
import { ChartCard, ChartHeadline, DataTableView } from '@/components/charts/ChartCard'
import { RankedBars } from '@/components/charts/RankedBars'
import { ReportTable } from '@/components/charts/ReportTable'
import { TrendChart } from '@/components/charts/TrendChart'
import { PER, bucketLabel, compactCount, istDay, plural, spanLabel, tickLabel } from '@/components/charts/format'
import { useReport } from '@/components/charts/useReport'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { purchaseHref, versusText, type AnalyticsState } from '../useAnalyticsState'
import { StaleNotice, ExportButton, Figure, ReportError, TableSkeleton } from './bits'
import { planLabel } from './PackagesTable'
import { FunnelSection, StudentValueSection } from './StudentsMore'
import { StudentLink } from '@/components/students/StudentLink'

export function endsText(days: number): string {
  if (days <= 0) return 'Ends today'
  if (days === 1) return 'Ends tomorrow'
  return `Ends in ${days} days`
}

export function StudentsTab({ state }: { state: AnalyticsState }) {
  const { hasPermission } = useAuth()
  const q = { from: state.query.from, to: state.query.to, compare: state.query.compare, granularity: state.query.granularity }
  const users = useReport(JSON.stringify(q), () => analyticsService.users(q))
  // This tab shows no product filters, so none left in the URL by another tab may narrow it
  const scoped = state.scopedQuery('students')
  const eq = { subject_id: scoped.subject_id, package_id: scoped.package_id, limit: 10 }
  const expiring = useReport(`e${JSON.stringify(eq)}`, () => analyticsService.expiring(eq))
  const d = users.data
  const canUsers = hasPermission('users.read')
  // A purchase page opens with either permission
  const canPurchases = canUsers || hasPermission('payments.read')
  const versus = versusText(d?.previous_range) ?? undefined
  const common = { loading: users.loading, refreshing: (users.refreshing || users.stale), versus }
  const g = d?.granularity ?? 'day'
  const total = d ? d.points.reduce((n, p) => n + p.registrations, 0) : 0
  const before = d?.previous_points?.reduce((n, p) => n + p.registrations, 0) ?? 0
  // "Previous 30 days": the comparison named by its length
  const previousName = d?.previous_range?.days ? `Previous ${plural(d.previous_range.days, 'day')}` : 'Previous period'
  const e = expiring.data
  const wide = useMediaQuery('(min-width: 1280px)')

  return (
    <div className="space-y-6">
      <StaleNotice report={users} />
      {users.error && !d ? <ReportError message={users.error} onRetry={users.reload} /> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Figure {...common} label="Total users" value={formatCount(d?.total_users)} hint="Every registered student" href={canUsers ? '/users' : undefined} />
          <Figure {...common} label="New students" value={formatCount(d?.current.new_users)} now={d?.current.new_users} before={d?.previous?.new_users} hint="Registered in this period" href={canUsers ? '/users' : undefined} />
          <Figure {...common} label="Active students" value={formatCount(d?.current.active_users)} now={d?.current.active_users} before={d?.previous?.active_users} hint="With recorded activity" />
          <Figure {...common} label="Buyers" value={formatCount(d?.current.buyers)} hint={plural(d?.current.repeat_buyers ?? 0, 'bought more than once', 'bought more than once')} />
          <Figure {...common} label="First-time buyers" value={formatCount(d?.current.new_buyers)} hint={`${formatCount(d?.current.returning_buyers ?? 0)} had bought before`} />
          <Figure {...common} label="Registered and bought" value={d ? `${d.conversion.rate}%` : '—'} hint={d ? `${formatCount(d.conversion.bought)} of ${formatCount(d.conversion.registered)} new students` : ' '} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ChartCard
          title="New students over time"
          description={d ? `Registrations, ${PER[g]}.` : 'Registrations'}
          exportSubtitle={d ? `Registrations, ${PER[g]}. Total ${formatCount(total)}${d.previous_points ? `, previous period ${formatCount(before)}` : ''}.` : undefined}
          skeleton="trend"
          height={wide ? 300 : 260}
          fill
          headline={d && (
            <ChartHeadline
              value={formatCount(total)}
              unit={total === 1 ? 'new student' : 'new students'}
              delta={d.previous_points ? { now: total, before, versus: previousName.toLowerCase() } : undefined}
              items={d.previous_points ? [{ key: 'now', name: 'New students', color: 'var(--chart-primary)', shape: 'line', value: formatCount(total) }, { key: 'before', name: previousName, color: 'var(--chart-previous)', shape: 'dash', value: formatCount(before) }] : []}
            />
          )}
          csv={d ? () => ({ header: ['From', 'To', 'New students', ...(d.previous_points ? ['Previous period'] : [])], rows: d.points.map((p, i) => [p.from, p.to, p.registrations, ...(d.previous_points ? [d.previous_points[i].registrations] : [])]) }) : undefined}
          loading={users.loading}
          refreshing={(users.refreshing || users.stale)}
          action={<ExportButton report="users" query={q} />}
          legend={d?.previous_points ? [{ key: 'now', name: 'New students', color: 'var(--chart-primary)', shape: 'line' }, { key: 'before', name: previousName, color: 'var(--chart-previous)', shape: 'dash' }] : []}
          empty={d && total === 0 && before === 0 && <p>Nobody registered in this period.</p>}
          table={d && (
            <DataTableView
              caption="New students over time"
              rows={d.points}
              rowKey={(p) => p.key}
              columns={[
                { header: 'Period', cell: (p) => bucketLabel(p, g), footer: 'Total' },
                { header: 'New students', align: 'right', cell: (p) => formatCount(p.registrations), footer: formatCount(total) },
                ...(d.previous_points ? [{ header: 'Previous period', align: 'right' as const, cell: (p: (typeof d.points)[number]) => formatCount(d.previous_points![d.points.indexOf(p)].registrations), footer: formatCount(before) }] : []),
              ]}
            />
          )}
        >
          {d && (
            <TrendChart
              label={`New students, ${PER[g]}`}
              ticks={d.points.map((p) => tickLabel(p, g))}
              labels={d.points.map((p) => bucketLabel(p, g))}
              series={[
                { key: 'now', name: 'New students', color: 'var(--chart-primary)', kind: 'area', values: d.points.map((p) => p.registrations) },
                ...(d.previous_points ? [{ key: 'before', name: previousName, color: 'var(--chart-previous)', kind: 'muted' as const, values: d.previous_points.map((p) => p.registrations) }] : []),
              ]}
              format={formatCount}
              axisFormat={compactCount}
              whole
              fill
              height={wide ? 300 : 260}
              details={(i) => (d.previous_points ? [{ name: 'Previous dates', value: spanLabel(d.previous_points[i].from, d.previous_points[i].to) }] : [])}
            />
          )}
        </ChartCard>

        <ChartCard
          title="From registering to first purchase"
          description="Students who registered in this period, by when they first bought"
          skeleton="bars"
          csv={d ? () => ({ header: ['First purchase', 'Students', 'Share %'], rows: d.conversion.steps.map((x) => [x.label, x.students, x.share]) }) : undefined}
          loading={users.loading}
          refreshing={(users.refreshing || users.stale)}
          empty={d && d.conversion.registered === 0 && <p>Nobody registered in this period.</p>}
          table={d && (
            <DataTableView caption="From registering to first purchase" rows={d.conversion.steps} rowKey={(s) => s.key} columns={[
              { header: 'First purchase', cell: (s) => s.label, footer: 'Registered' },
              { header: 'Students', align: 'right', cell: (s) => formatCount(s.students), footer: formatCount(d.conversion.registered) },
              { header: 'Share', align: 'right', cell: (s) => `${s.share}%` },
            ]} />
          )}
        >
          <RankedBars
            unit="students"
            format={formatCount}
            max={d?.conversion.registered}
            rows={(d?.conversion.steps ?? []).map((s) => ({ key: s.key, name: s.label, value: s.students, hint: `${s.share}% of new students`, color: s.key === 'never' ? 'var(--chart-rest)' : 'var(--chart-primary)' }))}
          />
        </ChartCard>
      </div>

      <FunnelSection state={state} />

      <Section
        flush
        title="Subscriptions ending soon"
        description="Packages only. Already renewed ones are left out. These figures are from today, not the range above."
        action={canUsers ? <div className="flex flex-wrap gap-2"><ExportButton report="expiring" query={eq} /><Button asChild variant="outline" size="sm"><Link to="/users/subscriptions?status=expiring&window=30">Open subscriptions</Link></Button></div> : undefined}
      >
        {expiring.error && !e ? <div className="px-5 pb-5"><ReportError message={expiring.error} onRetry={expiring.reload} /></div> : (
          <>
            <dl className="grid grid-cols-2 gap-4 px-5 pb-4 lg:grid-cols-4">
              {[
                { k: 'Next 7 days', v: formatCount(e?.ending_7_days), h: 'Subscriptions' },
                { k: 'Next 30 days', v: formatCount(e?.ending_30_days), h: e ? `${formatCount(e.paid_30_days)} paid for` : ' ' },
                { k: 'Renewal rate', v: e ? (e.renewal_rate === null ? 'Not enough data' : `${e.renewal_rate}%`) : '—', h: 'Of those that ended in the last 90 days' },
                { k: 'Renewed', v: e ? `${formatCount(e.renewed_90_days)} of ${formatCount(e.ended_90_days)}` : '—', h: 'Bought the same package again' },
              ].map((x) => (
                <div key={x.k}>
                  <dt className="text-[13px] text-muted-foreground">{x.k}</dt>
                  <dd className="mt-0.5 text-xl font-semibold tracking-[-0.02em]">{x.v}</dd>
                  <dd className="text-[13px] text-muted-foreground">{x.h}</dd>
                </div>
              ))}
            </dl>
            <StaleNotice report={expiring} className="mx-5 mb-3 sm:mx-6" />
            {expiring.loading ? <TableSkeleton rows={4} /> : (
              <ReportTable
                caption="Subscriptions ending soon"
                refreshing={expiring.refreshing || expiring.stale}
                rows={e?.rows ?? []}
                rowKey={(r) => r.purchase_id}
                // The row opens the subscription; the name is its own link to the student
                rowHref={(r) => (canPurchases ? purchaseHref('package', r.purchase_id) : null)}
                empty="No subscription ends in the next 30 days."
                columns={[
                  { key: 'student', header: 'Student', ownLink: true, cell: (r) => <><StudentLink student={r.user} from="Analytics" className="block truncate" deletedClassName="block truncate" />{r.user?.student_id && <span className="block font-mono text-xs text-muted-foreground">{r.user.student_id}</span>}</> },
                  { key: 'package', header: 'Subscription', cell: (r) => <>{canPurchases ? <Link to={purchaseHref('package', r.purchase_id)} className="block max-w-[320px] truncate rounded-sm hover:text-primary" title={r.package_name}>{r.package_name}</Link> : <span className="block max-w-[320px] truncate" title={r.package_name}>{r.package_name}</span>}<span className="block text-xs text-muted-foreground">{planLabel(r)}{r.paid ? '' : ', given by an admin'}</span></> },
                  { key: 'ends', header: 'Ends', cell: (r) => <><span className="block">{istDay(r.expires_at)}</span><span className="block text-xs text-muted-foreground">{endsText(r.days_left)}</span></> },
                ]}
              />
            )}
          </>
        )}
      </Section>

      <StudentValueSection state={state} />
    </div>
  )
}
