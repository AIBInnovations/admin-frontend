import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Info, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDuration } from '@/lib/format'
import type { InsightFact, InsightLink, InsightsReport } from '@/services/analytics.service'
import { compactINR, formatCount, percent, plural, signedINR } from '@/components/charts/format'
import { KIND_NAME } from '@/components/charts/palette'
import type { ReportState } from '@/components/charts/useReport'
import { ReportError, StaleNotice } from './bits'
import type { AnalyticsState } from '../useAnalyticsState'

/** Where a fact's proof lives, keeping the range and filters of the page. */
export function insightHref(state: AnalyticsState, can: (permission: string) => boolean) {
  return (link: InsightLink): string | null => {
    if (link.path) return link.path.startsWith('/commerce/cases') && !can('payments.read') ? null : link.path
    const params = Object.fromEntries(Object.entries(link.params ?? {}).map(([k, v]) => [k, v || null]))
    const changes: Record<string, string | null> = { tab: link.tab && link.tab !== 'overview' ? link.tab : null, page: null, ...params }
    // Opening one package: its type filter would hide it
    if (params.package) changes.kind = null
    return `${state.href(changes, '/analytics')}${link.focus ? `#focus-${link.focus}` : ''}`
  }
}

const B = ({ children }: { children: ReactNode }) => <strong className="font-semibold text-foreground tabular-nums">{children}</strong>

/** "TECOM Theory Package, 12 months" */
function productName(d: NonNullable<InsightFact['driver']>): string {
  const plan = d.tier_duration_days ? formatDuration(d.tier_duration_days) : d.tier_name
  return plan ? `${d.name}, ${plan}` : d.name
}

const pctWord = (n: number | null | undefined) => (n === null || n === undefined ? '' : percent(Math.abs(n)))

function versus(days: number | null | undefined): string {
  if (!days) return 'the period before'
  return days === 1 ? 'the day before' : `the ${days} days before`
}

/** "Refunds doubled", "Refunds up 50%" */
function multiple(ratio: number | null | undefined, up: boolean, change: number): string {
  if (ratio === null || ratio === undefined) return up ? 'appeared' : 'stopped'
  if (up && ratio >= 2.9) return `rose ${Math.round(ratio)}-fold`
  if (up && ratio >= 1.95) return 'doubled'
  if (!up && ratio <= 0.55 && ratio > 0) return 'halved'
  return `${up ? 'up' : 'down'} ${percent(Math.abs(change))}`
}

interface Line { key: string; tone: InsightFact['tone']; direction: InsightFact['direction']; body: ReactNode; link: InsightLink; extra?: { label: ReactNode; link: InsightLink; joiner?: string } }

/** One fact, one sentence. Numbers come from the fact; nothing is guessed. */
function sentence(f: InsightFact, days: number | null): Line | null {
  const base = { key: f.id, tone: f.tone, direction: f.direction, link: f.link }
  const vs = versus(days)
  const driverLink = (d: NonNullable<InsightFact['driver']>): InsightLink => (d.type === 'package' && d.product_id
    ? { tab: 'sales', params: { subject: d.subject_id ?? '', package: d.product_id, tier: d.tier && d.tier !== 'none' ? d.tier : '' } }
    : { tab: 'sales', params: { type: d.type } })
  switch (f.id) {
    case 'revenue': {
      const d = f.driver
      const head = f.direction === 'flat'
        ? <>Revenue is unchanged on {vs} at <B>{compactINR(f.now ?? 0)}</B></>
        : f.change === null
          ? <>Revenue of <B>{compactINR(f.now ?? 0)}</B>, against nothing in {vs}</>
          : <>Revenue {f.direction === 'up' ? 'up' : 'down'} <B>{pctWord(f.change)}</B> on {vs} (<B>{compactINR(f.now ?? 0)}</B>, was {compactINR(f.before ?? 0)})</>
      return { ...base, body: head, ...(d && { extra: { label: <>mostly <B>{productName(d)}</B> ({signedINR(d.delta)})</>, link: driverLink(d) } }) }
    }
    case 'top_product': {
      const d = f.driver!
      return { ...base, body: <>Revenue of <B>{compactINR(f.now ?? 0)}</B>. The biggest seller is</>, extra: { label: <><B>{productName(d)}</B> at {compactINR(d.now)}, {percent(d.share)} of it</>, link: driverLink(d), joiner: ' ' } }
    }
    case 'refunds': {
      const up = f.direction === 'up'
      const change = f.before ? (((f.now ?? 0) - f.before) / f.before) * 100 : 0
      return { ...base, body: <>Refunds and revocations {multiple(f.ratio, up, change)}: <B>{plural(f.now ?? 0, 'order')}</B> against {formatCount(f.before ?? 0)} ({compactINR(f.amount ?? 0)}, {percent(f.rate)} of paid orders)</> }
    }
    case 'no_sales':
      return { ...base, body: <>No sales in this period{f.before_too ? ' or the one before it' : ''}. Try a longer range, or clear the filters</> }
    case 'refund_rate':
      return { ...base, body: <><B>{percent(f.rate)}</B> of paid orders were refunded or revoked ({plural(f.now ?? 0, 'order')}, {compactINR(f.amount ?? 0)})</> }
    case 'mix': {
      const name = KIND_NAME[f.kind ?? 'other']
      return { ...base, body: <>{name} share of package revenue {f.direction === 'up' ? 'rose' : 'fell'} from <B>{percent(f.share_before)}</B> to <B>{percent(f.share_now)}</B></> }
    }
    case 'mix_share':
      return { ...base, body: <>{KIND_NAME[f.kind ?? 'other']} makes up <B>{percent(f.share_now)}</B> of package revenue</> }
    case 'subject':
      return { ...base, body: <><B>{f.name}</B> went the other way: {f.direction === 'up' ? 'up' : 'down'} {f.change === null || f.change === undefined ? '' : pctWord(f.change)} ({signedINR(f.delta ?? 0)})</> }
    case 'new_buyers':
      return { ...base, body: <>First-time buyers {f.direction === 'up' ? 'up' : 'down'} {f.change === null ? '' : <B>{pctWord(f.change)}</B>}: {formatCount(f.now ?? 0)} against {formatCount(f.before ?? 0)}</> }
    case 'average_order':
      return { ...base, body: <>Average order {f.direction === 'up' ? 'up' : 'down'} <B>{pctWord(f.change)}</B> to {compactINR(f.now ?? 0)} (was {compactINR(f.before ?? 0)})</> }
    case 'discounts':
      return { ...base, body: <>Coupons gave away <B>{percent(f.share_now)}</B> of the list price, {f.direction === 'up' ? 'up' : 'down'} from {percent(f.share_before)} ({compactINR(f.now ?? 0)} off)</> }
    case 'coupon_new_buyers':
      return { ...base, body: <>Coupon <B><span className="font-mono">{f.code}</span></B> brought <B>{plural(f.new_buyers ?? 0, 'first-time buyer')}</B> of its {formatCount(f.buyers ?? 0)}</> }
    case 'open_disputes':
      return { ...base, body: <><B>{plural(f.now ?? 0, 'bank dispute')}</B> {f.now === 1 ? 'is' : 'are'} open and {f.now === 1 ? 'needs' : 'need'} a response</> }
    default:
      return null
  }
}

function Icon({ tone, direction }: { tone: InsightFact['tone']; direction: InsightFact['direction'] }) {
  const cls = cn('h-4 w-4 shrink-0', tone === 'good' && 'text-success', tone === 'bad' && 'text-danger', tone === 'neutral' && 'text-muted-foreground')
  if (direction === 'up') return <TrendingUp aria-hidden="true" className={cls} />
  if (direction === 'down') return <TrendingDown aria-hidden="true" className={cls} />
  if (direction === 'flat') return <Minus aria-hidden="true" className={cls} />
  if (tone === 'bad') return <AlertTriangle aria-hidden="true" className={cls} />
  return <Info aria-hidden="true" className={cls} />
}

interface InsightStripProps {
  report: ReportState<InsightsReport>
  /** Where a fact's proof is. */
  hrefFor: (link: InsightLink) => string | null
  title?: string
  description?: ReactNode
  compact?: boolean
  className?: string
  /** How many facts at most (3 compact, 6 otherwise). */
  limit?: number
  /** Take the height the row gives it: the facts spread evenly and a quiet footer sits at the bottom. */
  fill?: boolean
  /** "Open analytics" in the footer. */
  moreHref?: string | null
  moreLabel?: string
}

const istTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' })
const istDayShort = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })
/** "8:31 am" today, "27 Nov, 8:31 am" before. */
function updatedAt(iso: string | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const sameDay = istDayShort.format(d) === istDayShort.format(new Date())
  return sameDay ? istTime.format(d) : `${istDayShort.format(d)}, ${istTime.format(d)}`
}

/**
 * What changed and why, in a few sentences computed from the numbers. Each
 * one links to the view that proves it. A fact appears only when its numbers
 * are big enough to mean something.
 */
export function InsightStrip({ report, hrefFor, title = 'What changed', description, compact, className, limit: max, fill, moreHref, moreLabel = 'Open analytics' }: InsightStripProps) {
  const { data, loading, refreshing: loadingNewer, stale, error, reload } = report
  if (error && !data) return <ReportError message={error} onRetry={reload} className={className} />
  // A failed refresh keeps the last facts, dimmed, under a notice
  const refreshing = loadingNewer || stale
  const limit = max ?? (compact ? 3 : 6)
  const stamp = updatedAt(data?.generated_at)
  const lines = (data?.facts ?? []).map((f) => sentence(f, data?.previous_range?.days ?? null)).filter((l): l is Line => !!l).slice(0, limit)
  return (
    <section aria-labelledby="insights-title" aria-busy={loading || refreshing || undefined} className={cn('min-w-0 rounded-xl border border-border bg-card shadow-card', fill && 'flex h-full flex-col', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pt-5 sm:px-6">
        <h2 id="insights-title" className="font-display text-[17px] font-semibold leading-snug tracking-[-0.01em]">{title}</h2>
        {description && <p className="text-[13px] text-muted-foreground max-sm:basis-full">{description}</p>}
      </div>
      <StaleNotice report={report} className="mx-5 mt-3 sm:mx-6" />
      <div className={cn('px-5 pb-4 pt-2 transition-opacity duration-150 sm:px-6', fill && 'flex flex-1 flex-col', refreshing && 'opacity-60')} aria-live="polite">
        {loading ? (
          <div role="status" aria-label="Loading what changed" className="space-y-3 py-1">
            {Array.from({ length: Math.min(limit, compact ? 3 : 4) }, (_, i) => <div key={i} className="flex items-start gap-3 py-1"><Skeleton className="mt-1 h-4 w-4 shrink-0 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4" style={{ width: `${92 - i * 9}%` }} /><Skeleton className="h-4" style={{ width: `${58 - i * 7}%` }} /></div></div>)}
          </div>
        ) : lines.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Nothing stands out yet: no sale, refund or dispute in this period moved enough to call out.</p>
        ) : (
          <ul className={cn('divide-y divide-border', fill && 'flex flex-1 flex-col')}>
            {lines.map((l) => {
              const href = hrefFor(l.link)
              const extra = l.extra ? hrefFor(l.extra.link) : null
              return (
                <li key={l.key} className={cn('py-3 first:pt-2 last:pb-1.5', fill && 'flex flex-1 flex-col justify-center first:pt-3 last:pb-3')}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-4 shrink-0 items-center"><Icon tone={l.tone} direction={l.direction} /></span>
                    <p className="min-w-0 flex-1 text-sm leading-6 text-muted-foreground">
                      {l.body}
                      {l.extra && <>{l.extra.joiner ?? ', '}{extra ? <Link to={extra} className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-primary">{l.extra.label}</Link> : l.extra.label}</>}
                      .
                    </p>
                    {href && (
                      <Link to={href} className="inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-md px-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-accent pointer-coarse:-my-2 pointer-coarse:min-h-10 pointer-coarse:min-w-10">
                        <span className={cn(compact && 'sr-only sm:not-sr-only')}>See why</span><ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {fill && (stamp || moreHref) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border px-5 py-3 text-xs text-muted-foreground sm:px-6">
          <span>{stamp ? `Updated ${stamp} IST` : ''}</span>
          {moreHref && <Link to={moreHref} className="inline-flex items-center gap-1 font-medium text-primary hover:underline pointer-coarse:min-h-10">{moreLabel}<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>}
        </div>
      )}
    </section>
  )
}
