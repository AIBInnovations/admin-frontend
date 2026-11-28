import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Check, Copy, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/** Building blocks for every full-page record (purchase, invoice, book, case…). */

// ── Header ───────────────────────────────────────────────────────────────
interface DetailHeaderProps {
  back: { label: string; href: string }
  title: ReactNode
  /** One line under the title: the two or three facts that identify it. */
  subtitle?: ReactNode
  status?: ReactNode
  actions?: ReactNode
}

export function DetailHeader({ back, title, subtitle, status, actions }: DetailHeaderProps) {
  return (
    <header>
      <Link to={back.href} className="-ml-2 mb-3 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground pointer-coarse:h-10">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {back.label}
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="min-w-0 break-words font-display text-[22px] font-semibold leading-tight tracking-[-0.015em] sm:text-[26px]">{title}</h1>
            {status}
          </div>
          {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  )
}

// ── Section ──────────────────────────────────────────────────────────────
interface SectionProps {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  /** Tables and lists run edge to edge. */
  flush?: boolean
  id?: string
}

export function Section({ title, description, action, children, className, flush, id }: SectionProps) {
  return (
    <section id={id} className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-card', className)}>
      {(title || action) && (
        <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4', flush && 'pb-3')}>
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold leading-snug">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={flush ? '' : 'px-5 pb-5 pt-4'}>{children}</div>
    </section>
  )
}

// ── Facts ────────────────────────────────────────────────────────────────
export interface Fact {
  label: string
  value: ReactNode
  /** Adds a copy button. */
  copy?: string | null
  /** Ids and codes. */
  mono?: boolean
  wide?: boolean
}

export function FactGrid({ facts, className }: { facts: (Fact | null | false | undefined)[]; className?: string }) {
  return (
    <dl className={cn('grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {facts.filter((f): f is Fact => !!f).map((f) => (
        <div key={f.label} className={cn('min-w-0', f.wide && 'sm:col-span-2 xl:col-span-3')}>
          <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
          <dd className={cn('mt-0.5 flex min-w-0 items-center gap-1.5 text-sm font-medium', f.mono && 'font-mono text-[13px]')}>
            <span className="min-w-0 break-words">{f.value === null || f.value === undefined || f.value === '' ? <span className="font-normal text-muted-foreground">Not set</span> : f.value}</span>
            {f.copy && <CopyButton value={f.copy} label={f.label} />}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <button
      type="button"
      data-no-row-click
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      onClick={() => { navigator.clipboard?.writeText(value).then(() => setCopied(true)).catch(() => {}) }}
      className="pg-hit inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-success" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
    </button>
  )
}

// ── Status ───────────────────────────────────────────────────────────────
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'
const TONE: Record<Tone, string> = {
  neutral: 'bg-muted text-foreground',
  info: 'bg-accent text-accent-foreground',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}

/** Always a word; colour only supports it. */
export function StatusPill({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold', TONE[tone], className)}>{children}</span>
}

// ── Figures ──────────────────────────────────────────────────────────────
interface StatProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  /** Makes the whole tile a link to what the number is made of. */
  href?: string
  loading?: boolean
}

export function Stat({ label, value, hint, href, loading }: StatProps) {
  const body = (
    <>
      <p className="text-[13px] text-muted-foreground">{label}</p>
      {loading ? <Skeleton className="mt-1 h-[30px] w-24" /> : <p className="mt-1 break-words font-display text-[24px] font-semibold leading-tight tracking-[-0.02em] tabular-nums">{value}</p>}
      {hint && <p className="mt-1 text-[13px] text-muted-foreground">{hint}</p>}
      {/* hint={null} while loading: the line it will fill is held, so the tile does not grow */}
      {loading && hint === null && <Skeleton className="mt-2 h-[15.5px] w-28" />}
    </>
  )
  const base = 'block rounded-xl border border-border bg-card px-5 py-4 shadow-card'
  return href
    ? <Link to={href} className={cn(base, 'transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-raised')}>{body}</Link>
    : <div className={base}>{body}</div>
}

// ── Timeline ─────────────────────────────────────────────────────────────
export interface TimelineEntry { id: string; title: ReactNode; meta?: ReactNode; body?: ReactNode; tone?: Tone }

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-border">
      {entries.map((e) => (
        <li key={e.id} className="relative pl-6">
          <span aria-hidden="true" className={cn('absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-card', e.tone === 'danger' ? 'bg-danger' : e.tone === 'success' ? 'bg-success' : e.tone === 'warning' ? 'bg-warning' : 'bg-primary')} />
          <p className="text-sm font-medium">{e.title}</p>
          {e.meta && <p className="text-xs text-muted-foreground">{e.meta}</p>}
          {e.body && <div className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/85">{e.body}</div>}
        </li>
      ))}
    </ol>
  )
}

// ── Page states ──────────────────────────────────────────────────────────
export function ErrorState({ title = 'This could not be loaded', message, onRetry, back }: { title?: string; message?: string; onRetry?: () => void; back?: { label: string; href: string } }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-14 text-center shadow-card">
      <AlertCircle aria-hidden="true" className="h-7 w-7 text-danger" />
      <div>
        {back ? <h1 className="text-[15px] font-semibold">{title}</h1> : <p className="text-[15px] font-semibold">{title}</p>}
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{message || 'Check your connection and try again.'}</p>
      </div>
      <div className="flex gap-2">
        {onRetry && <Button variant="outline" size="sm" onClick={onRetry}><RotateCw className="h-3.5 w-3.5" />Try again</Button>}
        {back && <Button asChild variant="ghost" size="sm"><Link to={back.href}>{back.label}</Link></Button>}
      </div>
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-8 w-72 max-w-full" /><Skeleton className="h-4 w-48" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

/**
 * The message from an API error, in words an admin can act on. apiService
 * throws Error objects carrying status, serverMessage, code and details.
 */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const e = err as { status?: number; serverMessage?: string; message?: string } | null
  if (e?.status && e.status >= 500) return fallback
  return e?.serverMessage || e?.message || fallback
}

/** `error_code` and `details` of an API error, when the backend sent them. */
export function apiErrorInfo<T = unknown>(err: unknown): { status?: number; code?: string; details?: T } {
  const e = err as { status?: number; code?: string; details?: T } | null
  return { status: e?.status, code: e?.code, details: e?.details }
}
