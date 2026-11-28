import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Calendar, Eye, IndianRupee, Users, Video, type LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { Section } from '@/components/common/detail'
import { istToday, shiftDay } from '@/components/common/DateRangeFilter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { formatCount, formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { analyticsService } from '@/services/analytics.service'
import { chartTool } from '@/components/charts/ChartCard'
import { Delta } from '@/components/charts/Delta'
import { ProgressRing } from '@/components/charts/ProgressRing'
import { Sparkline } from '@/components/charts/Sparkline'
import { figureINR, plural, spanLabel } from '@/components/charts/format'
import { useReport } from '@/components/charts/useReport'
import { NeedsAttention } from '@/components/dashboard/NeedsAttention'
import { ZohoSyncCard } from '@/components/dashboard/ZohoSyncCard'
import { ReportError } from '@/pages/analytics/components/bits'
import { SalesTrend } from '@/pages/analytics/components/SalesTrend'
import { InsightStrip } from '@/pages/analytics/components/Insights'
import { RunRate } from '@/pages/analytics/components/RunRate'
import { videoHref } from '@/pages/analytics/useAnalyticsState'
import type { InsightLink } from '@/services/analytics.service'

interface StatTileProps {
  title: string
  icon: LucideIcon
  value: ReactNode
  /** Small words after the value, on its baseline ("of 247"). */
  unit?: ReactNode
  /** Right of the value: a 12-point sparkline, a ring, or a second figure. */
  visual?: ReactNode
  /** The one line under the value: a change against a named period, or the honest secondary line. */
  line: ReactNode
  href?: string
  loading: boolean
}

/**
 * One stat tile. Every tile has the same rows (label and icon, value and its
 * picture, one line), so a row of them lines up to the pixel.
 */
function StatTile({ title, icon: Icon, value, unit, visual, line, href, loading }: StatTileProps) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2 text-[13px] font-medium text-muted-foreground">
        <span className="min-w-0 truncate" title={title}>{title}</span>
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
      </span>
      <span className="mt-3 flex h-10 items-end justify-between gap-3">
        {loading
          ? <Skeleton className="h-7 w-28" />
          : <span className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-foreground">{value}</span>
              {unit && <span className="text-[13px] text-muted-foreground">{unit}</span>}
            </span>}
        {!loading && visual && <span className="flex h-10 min-w-0 flex-1 items-end justify-end">{visual}</span>}
      </span>
      <span className="mt-3 flex h-[22px] min-w-0 items-center gap-1.5 whitespace-nowrap text-[13px] text-muted-foreground">
        {loading ? <Skeleton className="h-4 w-32" /> : line}
      </span>
    </>
  )
  const base = 'flex h-full min-w-0 flex-col rounded-xl border border-border bg-card p-5 shadow-card'
  return href
    ? <Link to={href} className={cn(base, 'transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-raised')}>{body}</Link>
    : <div className={base}>{body}</div>
}

const RowsSkeleton = () => <div role="status" aria-label="Loading" className="space-y-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}</div>

function Rank({ n }: { n: number }) {
  return <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground tabular-nums">{n}</span>
}

const ROW = 'flex items-center justify-between gap-4 rounded-lg border border-border p-3'

/** The card's body grows with the row; a short list ends in a note that fills the rest instead of a blank patch. */
const GROW = 'flex flex-col [&>div:last-child]:flex [&>div:last-child]:flex-1 [&>div:last-child]:flex-col'
function Remainder({ shown, of, children }: { shown: number; of: number; children: ReactNode }) {
  if (shown >= of) return null
  return <li className="flex min-h-14 flex-1 items-center justify-center rounded-lg border border-dashed border-border px-4 py-3 text-center text-[13px] text-muted-foreground">{children}</li>
}

/** The Monday that starts this IST week, and the eleven weeks before it: twelve weekly points. */
function twelveWeeks(today: string) {
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7
  const monday = shiftDay(today, -dow)
  return { from: shiftDay(monday, -77), to: today, granularity: 'week' as const, compare: 'none' as const }
}

/** Sales and students. Only for admins who may see the numbers. */
function Numbers() {
  const { hasPermission } = useAuth()
  // 'analytics.dashboard' may see the numbers here; the pages behind them need analytics.read
  const to = (href: string) => (hasPermission('analytics.read') ? href : undefined)
  const headline = useReport('headline', () => analyticsService.headline())
  const today = istToday()
  const month = { from: `${today.slice(0, 7)}-01`, to: today, compare: 'previous' as const }
  const thisMonth = useReport('month', () => analyticsService.overview(month))
  const weeks = twelveWeeks(today)
  const signups = useReport(`signups${weeks.from}`, () => analyticsService.users(weeks))
  const h = headline.data
  const m = thisMonth.data
  // Month so far against the same number of days just before the 1st (for
  // 1-27 Nov that is 5-31 Oct). The Run-rate card compares with the same
  // days of last month instead (1-27 Oct), so each card names its baseline.
  const pr = m?.previous_range
  const prev = pr?.from && pr.to && pr.days ? { from: pr.from, to: pr.to, days: pr.days } : null
  const versus = prev ? `the previous ${plural(prev.days, 'day')} (${spanLabel(prev.from, prev.to)})` : 'the days before'
  const vsLine = (now: number | undefined, before: number | null | undefined) => (now !== undefined && before !== null && before !== undefined && prev
    ? (
      <span className="inline-flex items-center gap-1.5" title={`Compared with ${spanLabel(prev.from, prev.to)}`}>
        <Delta pill now={now} before={before} versus={versus} />
        <span aria-hidden="true">vs previous {plural(prev.days, 'day')}</span>
      </span>
    )
    : null)

  // Weekly sign-ups for twelve weeks; the running total is today's students by the week they joined
  const weekly = signups.data?.points.map((p) => p.registrations) ?? []
  const total = h?.users.total
  let running: number[] = []
  if (total !== undefined && weekly.length > 1) {
    let left = total
    running = new Array(weekly.length).fill(0)
    for (let i = weekly.length - 1; i >= 0; i -= 1) { running[i] = left; left -= weekly[i] }
    if (running.some((v) => v < 0)) running = []
  }
  const activeShare = h && h.users.total > 0 ? h.users.active_30_days / h.users.total : null

  if (headline.error && !h) return <ReportError message={headline.error} onRetry={headline.reload} className="col-span-12" />
  const tile = 'col-span-12 sm:col-span-6 xl:col-span-3'
  return (
    <>
      <div className={tile}>
        <StatTile
          title="Total Users" icon={Users} loading={headline.loading} value={formatCount(h?.users.total)}
          visual={running.length > 1 && <Sparkline fluid zero={false} values={running} height={32} label="Students today, by the week they joined, last 12 weeks" />}
          line={plural(h?.users.new_this_month ?? 0, 'new this month', 'new this month')}
          href={hasPermission('users.read') ? '/users' : to('/analytics?tab=students')}
        />
      </div>
      <div className={tile}>
        <StatTile
          title="Revenue (Month)" icon={IndianRupee} loading={headline.loading} value={formatINR(h?.revenue.this_month, { whole: true })}
          visual={h && (
            <span className="flex flex-col items-end text-right leading-tight" title={`${formatINR(h.revenue.total, { whole: true })} collected in all`}>
              <span className="text-[13px] font-semibold tabular-nums text-foreground">{figureINR(h.revenue.total)}</span>
              <span className="text-[11px] text-muted-foreground">total</span>
            </span>
          )}
          line={vsLine(m?.current.collected, m?.previous?.collected) ?? `${formatINR(h?.revenue.total, { whole: true })} total`}
          href={to('/commerce/revenue?range=month')}
        />
      </div>
      <div className={tile}>
        <StatTile
          title="Active Users (30d)" icon={Eye} loading={headline.loading} value={formatCount(h?.users.active_30_days)}
          unit={h ? `of ${formatCount(h.users.total)}` : undefined}
          visual={activeShare !== null && (
            <ProgressRing value={activeShare} size={40} stroke={4} label={`${Math.round(activeShare * 100)}% of all ${formatCount(h!.users.total)} users were active in the last 30 days`}>
              {Math.round(activeShare * 100)}%
            </ProgressRing>
          )}
          line="Used the app or the site"
          href={to('/analytics?tab=students&range=30d')}
        />
      </div>
      <div className={tile}>
        <StatTile
          title="New Users (Month)" icon={Calendar} loading={headline.loading} value={formatCount(h?.users.new_this_month)}
          visual={weekly.length > 1 && <Sparkline fluid values={weekly} height={32} empty={null} label="New students per week, last 12 weeks" />}
          line={vsLine(m?.current.new_users, m?.previous?.new_users) ?? 'Registered this month'}
          href={to('/analytics?tab=students&range=month')}
        />
      </div>
    </>
  )
}

function ContentInsights() {
  const { hasPermission } = useAuth()
  const subjects = useReport('subjects', () => analyticsService.content({ limit: 5 }))
  const videos = useReport('videos', () => analyticsService.videos({ limit: 5 }))
  return (
    <>
      <Section
        className={cn('col-span-12 h-full lg:col-span-6', GROW)}
        title="Popular Subjects"
        description="By package purchases, all time"
        action={hasPermission('subjects.read') ? <Button asChild variant="ghost" size="sm" className="-mr-2"><Link to="/content/subjects">View All<ArrowUpRight className="h-3 w-3" /></Link></Button> : undefined}
      >
        {subjects.error && !subjects.data ? <p className="py-4 text-center text-sm text-muted-foreground">Subjects could not be loaded. <button type="button" className="underline" onClick={subjects.reload}>Try again</button></p>
          : subjects.loading ? <RowsSkeleton />
            : subjects.data?.popular_subjects.length ? (
              <ol className="flex flex-1 flex-col gap-3">
                {subjects.data.popular_subjects.map((s, i) => (
                  <li key={s.subject_id}>
                    {(() => {
                      const body = (
                        <>
                          <span className="flex min-w-0 items-center gap-3"><Rank n={i + 1} /><span className="truncate text-sm font-medium" title={s.name}>{s.name}</span></span>
                          <Badge variant="secondary" className="shrink-0 bg-accent text-accent-foreground">{plural(s.purchase_count, 'purchase')}</Badge>
                        </>
                      )
                      return hasPermission('analytics.read')
                        ? <Link to={`/analytics?tab=sales&range=all&subject=${s.subject_id}`} className={cn(ROW, 'transition-colors hover:border-primary/40 hover:bg-accent/40')}>{body}</Link>
                        : <div className={ROW}>{body}</div>
                    })()}
                  </li>
                ))}
                <Remainder shown={subjects.data.popular_subjects.length} of={5}>
                  {subjects.data.popular_subjects.length === 1 ? 'Only this subject has' : `Only these ${subjects.data.popular_subjects.length} subjects have`} package purchases so far.
                </Remainder>
              </ol>
            ) : <p className="py-4 text-center text-sm text-muted-foreground">No package has been bought yet.</p>}
      </Section>

      <Section
        className={cn('col-span-12 h-full lg:col-span-6', GROW)}
        title="Most Viewed Videos"
        description="By plays, all time"
        action={hasPermission('videos.read') ? <Button asChild variant="ghost" size="sm" className="-mr-2"><Link to="/content/videos">View All<ArrowUpRight className="h-3 w-3" /></Link></Button> : undefined}
      >
        {videos.error && !videos.data ? <p className="py-4 text-center text-sm text-muted-foreground">Videos could not be loaded. <button type="button" className="underline" onClick={videos.reload}>Try again</button></p>
          : videos.loading ? <RowsSkeleton />
            : videos.data?.most.length ? (
              <ol className="flex flex-1 flex-col gap-3">
                {videos.data.most.map((v, i) => {
                  const href = videoHref(v, hasPermission)
                  const body = (
                    <>
                      <span className="flex min-w-0 items-center gap-3"><Rank n={i + 1} /><span className="truncate text-sm font-medium" title={v.title}>{v.title}</span></span>
                      <Badge variant="secondary" className="shrink-0 bg-accent text-accent-foreground">{plural(v.plays, 'view')}</Badge>
                    </>
                  )
                  return (
                    <li key={v.video_id}>
                      {href ? <Link to={href} className={cn(ROW, 'transition-colors hover:border-primary/40 hover:bg-accent/40')}>{body}</Link> : <div className={ROW}>{body}</div>}
                    </li>
                  )
                })}
                <Remainder shown={videos.data.most.length} of={5}>
                  {videos.data.most.length === 1 ? 'Only this video has' : `Only these ${videos.data.most.length} videos have`} been played so far.
                </Remainder>
              </ol>
            ) : <p className="py-4 text-center text-sm text-muted-foreground">No video has been played yet.</p>}
      </Section>
    </>
  )
}

/** This month so far, against the same number of days before it, and where the month is heading. */
function MonthInsights() {
  const { hasPermission } = useAuth()
  const today = istToday()
  const month = { from: `${today.slice(0, 7)}-01`, to: today, compare: 'previous' as const }
  const insights = useReport('dash-insights', () => analyticsService.insights(month))
  const runrate = useReport('dash-runrate', () => analyticsService.runrate({}))
  const can = hasPermission('analytics.read')
  // 'analytics.dashboard' sees the sentences; the pages behind them need analytics.read
  const hrefFor = (link: InsightLink): string | null => {
    if (link.path) return link.path.startsWith('/commerce/cases') && !hasPermission('payments.read') ? null : link.path
    if (!can) return null
    const p = new URLSearchParams({ from: month.from, to: month.to })
    if (link.tab && link.tab !== 'overview') p.set('tab', link.tab)
    for (const [k, v] of Object.entries(link.params ?? {})) if (v) p.set(k, v)
    return `/analytics?${p}${link.focus ? `#focus-${link.focus}` : ''}`
  }
  return (
    <>
      <div className={cn('col-span-12 min-w-0', WIDE)}>
        <InsightStrip
          report={insights} hrefFor={hrefFor} compact fill limit={5}
          title="This month so far" description="Against the same number of days before"
          moreHref={can ? `/analytics?${new URLSearchParams({ from: month.from, to: month.to })}` : null}
        />
      </div>
      <div className={cn('col-span-12 min-w-0', NARROW)}>
        <RunRate report={runrate} compact fill revenueHref={can ? '/commerce/revenue?range=month' : null} />
      </div>
    </>
  )
}

// Rows 2 and 3 split the same way so their right column lines up exactly: 7 + 5 from 1280
// to 1599 (Needs attention and Run-rate need the room to read on one or two lines), 8 + 4
// from 1600 up. Non-overlapping ranges, so the order of the generated rules cannot matter.
const WIDE = 'xl:max-[1600px]:col-span-7 min-[1600px]:col-span-8'
const NARROW = 'xl:max-[1600px]:col-span-5 min-[1600px]:col-span-4'

const ACTIONS: { icon: LucideIcon; label: string; path: string; permission: string }[] = [
  { icon: Users, label: 'View Users', path: '/users', permission: 'users.read' },
  { icon: Video, label: 'Manage Videos', path: '/content/videos', permission: 'videos.read' },
  { icon: Calendar, label: 'Live Sessions', path: '/sessions', permission: 'live_sessions.read' },
  { icon: IndianRupee, label: 'View Revenue', path: '/commerce/revenue', permission: 'analytics.read' },
]

export function DashboardPage() {
  const { hasPermission } = useAuth()
  const numbers = hasPermission('analytics.read') || hasPermission('analytics.dashboard')
  const today = istToday()
  const trend = { from: shiftDay(today, -29), to: today, compare: 'previous' as const }
  const actions = ACTIONS.filter((a) => hasPermission(a.permission))

  return (
    <div className="pg-viz space-y-6">
      <PageHeader title="Dashboard" description="Welcome back! Here's what's happening with PGME today." />

      {/* One 12-column grid: tiles 3+3+3+3, then 8+4 twice so the right column lines up, then 6+6 */}
      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        {numbers && <Numbers />}

        {numbers && <MonthInsights />}

        {numbers ? (
          <>
            <div className={cn('col-span-12 flex min-w-0 flex-col', WIDE)}>
              <SalesTrend
                query={trend}
                title={(m) => ({ collected: 'Revenue, last 30 days', net: 'Net revenue, last 30 days', orders: 'Orders, last 30 days' })[m]}
                height={280}
                fill
                action={hasPermission('analytics.read') ? <Link to="/commerce/revenue" className={chartTool}>Open revenue<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></Link> : undefined}
              />
            </div>
            <div className={cn('col-span-12 min-w-0', NARROW)}>
              <NeedsAttention analytics className="h-full" />
            </div>
          </>
        ) : (
          <div className="col-span-12 space-y-6">
            <NeedsAttention analytics={false} />
            <p className="text-[13px] text-muted-foreground">Sales and student figures are shown to admins with the analytics permission.</p>
          </div>
        )}

        {numbers && <ContentInsights />}

        {actions.length > 0 && (
          <Section title="Quick Actions" className="col-span-12">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {actions.map((a) => (
                <Button key={a.label} asChild variant="outline" className="h-20 flex-col gap-2 bg-card">
                  <Link to={a.path}><a.icon className="h-5 w-5 text-primary" /><span className="text-[13px]">{a.label}</span></Link>
                </Button>
              ))}
            </div>
          </Section>
        )}

        {/* The sync itself needs packages.update */}
        {hasPermission('packages.update') && <div className="col-span-12"><ZohoSyncCard /></div>}
      </div>
    </div>
  )
}
