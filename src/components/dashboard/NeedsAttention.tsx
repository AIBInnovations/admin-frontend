import { Link } from 'react-router-dom'
import { AlertTriangle, Briefcase, CalendarClock, ChevronRight, FileWarning, Film, MessageSquareText, PackageX, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Section } from '@/components/common/detail'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { adminAlertsService, type AdminAlert } from '@/services/adminAlerts.service'
import { analyticsService } from '@/services/analytics.service'
import { useReport } from '@/components/charts/useReport'
import { plural } from '@/components/charts/format'
import { istToday, shiftDay } from '@/components/common/DateRangeFilter'
import { ProgressRing } from '@/components/charts/ProgressRing'

const ICON: Record<AdminAlert['kind'], LucideIcon> = {
  payment_case: AlertTriangle, feedback: MessageSquareText, delivery_note: FileWarning, video: Film, zoho_item: PackageX, career_application: Briefcase,
}

interface Item { id: string; icon: LucideIcon; title: string; description: string; count: number; href?: string; high?: boolean; ring?: { value: number; text: string } }

/**
 * What is waiting for a person: the panel's alerts, subscriptions about to end
 * and this week's low ratings. A source that fails is left out; the others stay.
 */
export function NeedsAttention({ analytics, className }: { analytics: boolean; className?: string }) {
  const { hasPermission } = useAuth()
  const alerts = useReport('alerts', async () => (await adminAlertsService.list()).data?.alerts ?? [])
  const expiring = useReport(analytics ? 'expiring' : null, () => analyticsService.expiring({ limit: 1 }))
  const today = istToday()
  const week = { from: shiftDay(today, -6), to: today, compare: 'none' as const }
  const feedback = useReport(analytics ? 'feedback' : null, () => analyticsService.feedback(week))

  const items: Item[] = (alerts.data ?? []).map((a) => ({ id: a.id, icon: ICON[a.kind] ?? AlertTriangle, title: a.title, description: a.description, count: a.count, href: a.href, high: a.severity === 'high' }))
  if (expiring.data && expiring.data.ending_30_days > 0) {
    const e = expiring.data
    items.push({
      id: 'expiring', icon: CalendarClock, title: 'Subscriptions ending soon',
      description: `${plural(e.ending_7_days, 'subscription')} in the next 7 days, ${e.ending_30_days} in 30 days`,
      // The renewal rate is a real share (renewed of those that ended), so it gets a ring
      ring: e.renewal_rate === null ? undefined : { value: e.renewal_rate / 100, text: `${e.renewal_rate}% renew` },
      count: e.ending_7_days || e.ending_30_days,
      href: hasPermission('users.read') ? `/users/subscriptions?status=expiring&window=${e.ending_7_days ? 7 : 30}` : undefined,
      high: e.ending_7_days > 0,
    })
  }
  if (feedback.data && feedback.data.current.low_ratings > 0 && !items.some((i) => alerts.data?.some((a) => a.id === i.id && a.kind === 'feedback'))) {
    const f = feedback.data.current
    items.push({
      id: 'low', icon: MessageSquareText, title: 'Low ratings this week',
      description: `${plural(f.low_comments, 'negative comment')}. Average ${f.average?.toFixed(2) ?? 'none'} of 5`,
      count: f.low_ratings,
      href: hasPermission('videos.read') ? `/feedback?${new URLSearchParams({ from: week.from, to: week.to, status: 'all', rating: '1,2' })}` : undefined,
    })
  }
  const loading = alerts.loading || (analytics && (expiring.loading || feedback.loading))
  items.sort((a, b) => Number(!!b.high) - Number(!!a.high))

  return (
    <Section title="Needs attention" description="Waiting for someone" className={className}>
      {loading && items.length === 0 ? (
        <div role="status" aria-label="Loading what needs attention" className="space-y-3">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
      ) : items.length === 0 && alerts.error ? (
        <p className="py-6 text-center text-sm text-muted-foreground">What is waiting could not be loaded. <button type="button" className="underline" onClick={() => { alerts.reload(); expiring.reload(); feedback.reload() }}>Try again</button></p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nothing is waiting. Disputes, low ratings, failed deliveries and ending subscriptions show up here.</p>
      ) : (
        <ul className="-mx-2 -mt-1 divide-y divide-border/70">
          {items.map((i) => {
            // One grammar per row: icon, title on the first line, count and chevron on that same line
            const body = (
              <>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center"><i.icon aria-hidden="true" className={cn('h-4 w-4', i.high ? 'text-danger' : 'text-warning')} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-5">{i.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">{i.description}</span>
                  {i.ring && (
                    <span className="mt-1.5 flex items-center gap-2 text-[13px] leading-5 text-muted-foreground">
                      <ProgressRing value={i.ring.value} size={18} stroke={3} label={`${i.ring.text} after their subscription ends`} />
                      {i.ring.text}
                    </span>
                  )}
                </span>
                <span className="flex h-5 shrink-0 items-center gap-1.5">
                  <span className="inline-flex h-5 min-w-[28px] items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold tabular-nums text-foreground">{i.count}<span className="sr-only"> waiting</span></span>
                  <span className="flex w-4 justify-center">{i.href && <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />}</span>
                </span>
              </>
            )
            return (
              <li key={i.id}>
                {i.href ? <Link to={i.href} className="group flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-accent/60">{body}</Link> : <div className="flex items-start gap-3 px-2 py-2.5">{body}</div>}
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}
