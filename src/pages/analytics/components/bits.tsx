import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ChevronRight, Download, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Delta } from '@/components/charts/Delta'
import { CountUp } from '@/components/charts/motion'
import { figureINR, formatCount, formatINR } from '@/components/charts/format'
import { analyticsService, type ExportReport, type ReportQuery } from '@/services/analytics.service'

interface FigureProps {
  label: string
  /** What to show; or `count` to count up to a number. */
  value?: ReactNode
  now?: number
  before?: number | null
  upIsGood?: boolean
  neutral?: boolean
  hint?: ReactNode
  href?: string
  loading?: boolean
  refreshing?: boolean
  versus?: string
  /** Counts up to this number the first time it appears (with motion on). Replaces `value`. */
  count?: number | null
  /** How `count` reads: money is exact up to ₹9,99,999, then ₹12.3L or ₹3.4Cr. */
  as?: 'money' | 'count'
}

/** One number, what it is compared with, and where it leads. */
export function Figure({ label, value, now, before, upIsGood, neutral, hint, href, loading, refreshing, versus, count, as = 'money' }: FigureProps) {
  const fmt = as === 'money' ? figureINR : (n: number) => formatCount(Math.round(n))
  const exact = count !== undefined && count !== null && as === 'money' && Math.abs(count) >= 1_000_000 ? formatINR(count) : undefined
  const shown = count !== undefined && count !== null ? <span title={exact}><CountUp id={`figure:${label}`} value={count} format={fmt} /></span> : value
  const body = (
    <>
      <span className="flex items-start justify-between gap-2 text-[13px] text-muted-foreground">
        <span className="min-w-0">{label}</span>
        {href && <ChevronRight aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />}
      </span>
      {loading
        ? <Skeleton className="h-[27px] w-24" />
        : <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="break-words text-[20px] font-semibold leading-tight tracking-[-0.02em] min-[1440px]:text-[22px]">{shown}</span>
            {now !== undefined && <Delta now={now} before={before} upIsGood={upIsGood} neutral={neutral} versus={versus} />}
          </span>}
      {hint && !loading ? <span className="block text-[13px] text-muted-foreground">{hint}</span> : loading && hint !== undefined ? <Skeleton className="mt-1 h-4 w-28" /> : <span aria-hidden="true" />}
    </>
  )
  // A subgrid: in a grid of figures the label, value and hint rows line up across each row,
  // however many lines a label or a hint takes. Outside a grid it is a plain stack.
  const base = cn('row-span-3 grid min-w-0 grid-rows-subgrid content-start gap-y-1 rounded-xl border border-border bg-card px-4 py-3.5 text-left shadow-card transition-opacity duration-150', refreshing && 'opacity-60')
  return href
    ? <Link to={href} className={cn(base, 'transition-[border-color,box-shadow,opacity] hover:border-primary/40 hover:shadow-raised')}>{body}</Link>
    : <div className={base}>{body}</div>
}

/**
 * A refresh that failed while older numbers stay on screen. Says so beside
 * them, so they are never read as the new range's, and offers a retry.
 * Pair it with dimmed figures (`refreshing || stale`).
 */
export function StaleNotice({ report, className }: { report: { stale: boolean; error: string | null; reload: () => void }; className?: string }) {
  if (!report.stale) return null
  return (
    <p role="alert" className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger', className)}>
      <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>{report.error && !/[.!?]$/.test(report.error.trim()) ? `${report.error}.` : report.error} These are the last numbers loaded, not the ones for the current choice.</span>
      <button type="button" onClick={report.reload} className="font-medium underline underline-offset-2 pointer-coarse:min-h-10">Try again</button>
    </p>
  )
}

/** A failed report in the place of its content; keeps the rest of the page. */
export function ReportError({ message, onRetry, className }: { message: string; onRetry: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-card', className)}>
      <p className="flex items-center gap-2 text-sm"><AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-danger" />{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}><RotateCw className="h-3.5 w-3.5" />Try again</Button>
    </div>
  )
}

export function ExportButton({ report, query, label = 'Export CSV' }: { report: ExportReport; query: ReportQuery; label?: string }) {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          const { filename } = await analyticsService.exportCsv(report, query)
          toast.success(`Exported ${filename}`)
        } catch (err) {
          toast.error(err instanceof Error && err.message ? err.message : 'The export failed. Please try again.')
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {busy ? 'Exporting…' : label}
    </Button>
  )
}

/** Two or three choices that switch what a chart shows. */
export function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="group" aria-label={label} className="inline-flex shrink-0 rounded-md border border-input bg-card p-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)} className={cn('h-[26px] whitespace-nowrap rounded px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground pointer-coarse:min-w-10', value === o.value && 'bg-accent font-medium text-accent-foreground hover:text-accent-foreground')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return <div role="status" aria-label="Loading table" className="space-y-3 px-5 pb-5">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-7 w-full" />)}</div>
}
