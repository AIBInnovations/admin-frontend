import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, BarChart3, Download, FileSpreadsheet, Image as ImageIcon, Maximize2, Minimize2, Table2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChartSkeleton, type SkeletonShape } from './ChartSkeleton'
import { ChartFrame, type ChartPicture } from './frame'
import { Delta } from './Delta'
import { LineKey } from './TrendChart'
import { downloadCsv, downloadPng, fileName, type CsvTable } from './exporting'
import './charts.css'

export interface LegendItem { key: string; name: string; color: string; shape?: 'line' | 'box' | 'dash' | 'column' }

/** The key for a soft column (a day under its average): the column's own wash with a rounded top. */
function ColumnKey({ color }: { color: string }) {
  return <span aria-hidden="true" className="chart-swatch mx-[3px] inline-block h-2.5 w-2.5 shrink-0 rounded-t-[3px]" style={{ background: `color-mix(in srgb, ${color} 35%, transparent)` }} />
}

/** Identity is never colour alone: the key always sits beside the name. Lines get a line key (dashed for a comparison), bars a box. */
export function Legend({ items, className }: { items: LegendItem[]; className?: string }) {
  if (items.length < 2) return null
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground', className)}>
      {items.map((i) => (
        <li key={i.key} className="flex items-center gap-1.5">
          {i.shape === 'dash' || i.shape === 'line'
            ? <LineKey color={i.color} dashed={i.shape === 'dash'} />
            : i.shape === 'column' ? <ColumnKey color={i.color} />
              : <span aria-hidden="true" className="chart-swatch h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: i.color }} />}
          {i.name}
        </li>
      ))}
    </ul>
  )
}

export interface HeadlineItem extends LegendItem { value?: ReactNode }

interface ChartHeadlineProps {
  /** The period's total, e.g. "₹6,94,707". */
  value: ReactNode
  /** What the figure counts: "collected", "orders". */
  unit?: string
  /** The change against the comparison period, as a pill, and what it is against. */
  delta?: { now: number; before: number | null | undefined; versus: string; upIsGood?: boolean }
  /** Each series with its own total ("Previous 30 days ₹4,10,603"). Shown for two or more. */
  items?: HeadlineItem[]
  /** Exact value for the figure's title, when the figure is shortened. */
  title?: string
  /** A quiet chip after the change ("Today so far ₹4,120"). */
  note?: ReactNode
}

/**
 * The line above a plot: the big total, the change against the comparison
 * period (an arrow, a number and words, never colour alone) and a legend
 * that gives each series its total.
 */
export function ChartHeadline({ value, unit, delta, items = [], title, note }: ChartHeadlineProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2.5">
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-foreground" title={title}>{value}</span>
        {unit && <span className="text-[13px] text-muted-foreground">{unit}</span>}
        {delta && delta.before !== null && delta.before !== undefined && (
          <span className="inline-flex items-center gap-1.5 self-center">
            <Delta pill now={delta.now} before={delta.before} upIsGood={delta.upIsGood} versus={delta.versus} />
            <span aria-hidden="true" className="text-[13px] text-muted-foreground">vs {delta.versus}</span>
          </span>
        )}
        {note && <span className="inline-flex h-[22px] items-center self-center whitespace-nowrap rounded-full border border-dashed border-border bg-muted/60 px-2 text-xs font-medium tabular-nums text-muted-foreground">{note}</span>}
      </p>
      {items.length > 1 && (
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]" aria-label="Series">
          {items.map((i) => (
            <li key={i.key} className="flex items-center gap-1.5 whitespace-nowrap">
              {i.shape === 'box'
                ? <span aria-hidden="true" className="chart-swatch h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: i.color }} />
                : i.shape === 'column' ? <ColumnKey color={i.color} />
                  : <LineKey color={i.color} dashed={i.shape === 'dash'} />}
              <span className="text-muted-foreground">{i.name}</span>
              {i.value !== undefined && <span className="font-semibold tabular-nums text-foreground">{i.value}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export interface TableColumn<T> { header: string; cell: (row: T) => ReactNode; align?: 'left' | 'right'; footer?: ReactNode }

/** The same numbers as a real table, for anyone who cannot or would rather not read a chart. */
export function DataTableView<T>({ caption, columns, rows, rowKey, maxHeight = 360 }: { caption: string; columns: TableColumn<T>[]; rows: T[]; rowKey: (r: T, i: number) => string; maxHeight?: number }) {
  const hasFooter = columns.some((c) => c.footer !== undefined)
  return (
    <div className="relative overflow-auto rounded-lg border border-border" style={{ maxHeight }} tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border">
            {columns.map((c) => <th key={c.header} scope="col" className={cn('whitespace-nowrap px-3 py-2 text-[13px] font-medium text-muted-foreground', c.align === 'right' ? 'text-right' : 'text-left')}>{c.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)} className="border-b border-border last:border-0">
              {columns.map((c, j) => j === 0
                ? <th key={c.header} scope="row" className="whitespace-nowrap px-3 py-1.5 text-left font-normal">{c.cell(r)}</th>
                : <td key={c.header} className={cn('whitespace-nowrap px-3 py-1.5 tabular-nums', c.align === 'right' && 'text-right')}>{c.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
        {hasFooter && (
          <tfoot className="sticky bottom-0 bg-muted">
            <tr className="border-t border-border font-medium">
              {columns.map((c) => <td key={c.header} className={cn('whitespace-nowrap px-3 py-2 tabular-nums', c.align === 'right' && 'text-right')}>{c.footer}</td>)}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

/** Every control in a chart card's toolbar: one height, one border, one type size. */
export const chartTool = 'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border pointer-coarse:h-10 pointer-coarse:min-w-10 border-input bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
const iconButton = chartTool

interface ChartCardProps {
  title: string
  /** What is plotted and in which unit, e.g. "Collected, ₹ per day, GST included". */
  description?: ReactNode
  legend?: LegendItem[]
  action?: ReactNode
  /** First load. */
  loading?: boolean
  /** Newer numbers are on the way; the old ones stay, dimmed. */
  refreshing?: boolean
  /** Shown in place of the chart when there is nothing to plot. */
  empty?: ReactNode | false
  table?: ReactNode
  height?: number
  className?: string
  footer?: ReactNode
  children: ReactNode
  /** Where an insight link lands ("#focus-<id>"). */
  id?: string
  /** The shape of the placeholder while loading. */
  skeleton?: SkeletonShape
  /** The block's numbers for "Download CSV". */
  csv?: () => CsvTable | null
  /** Base of the file names, e.g. "revenue-by-subject". */
  exportName?: string
  /** Offer full screen (default yes). */
  expandable?: boolean
  /** A line between the header and the plot: the period's total, its change and a legend with totals. Replaces the plain legend on screen. */
  headline?: ReactNode
  /** Take the height the row gives it; the plot grows into it. */
  fill?: boolean
  /** The subtitle for the PNG, when `description` is not plain text or says less. */
  exportSubtitle?: string
  /**
   * The last refresh failed and the chart still shows older numbers: the
   * error is shown under the chart with a retry, and the chart stays dimmed.
   */
  staleError?: string | null
  onRetry?: () => void
}

/**
 * A titled chart with a legend, a table behind it, full screen, CSV and PNG
 * downloads, and its loading and empty states. Loading, empty and loaded all
 * take the same height, so nothing below it moves.
 */
export function ChartCard({ title, description, legend = [], action, loading, refreshing: loadingNewer, empty, table, height = 260, className, footer, children, id, skeleton = 'block', csv, exportName, expandable = true, headline, fill, exportSubtitle, staleError, onRetry }: ChartCardProps) {
  const stale = !!staleError && !loading
  // Old numbers stay dimmed while newer ones load, and when loading them failed
  const refreshing = loadingNewer || stale
  const [asTable, setAsTable] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const bodyId = useId()
  const cardRef = useRef<HTMLElement>(null)
  const openRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const pictures = useRef(new Set<() => ChartPicture | null>())
  const [canPicture, setCanPicture] = useState(false)
  const showTable = asTable && !!table
  const name = fileName('pgme', exportName ?? title)

  const register = useCallback((draw: () => ChartPicture | null) => {
    pictures.current.add(draw)
    setCanPicture(true)
    return () => { pictures.current.delete(draw); setCanPicture(pictures.current.size > 0) }
  }, [])
  const frame = useMemo(() => ({ expanded, register }), [expanded, register])

  // Full screen: Escape or the button closes it; focus goes back where it was
  useEffect(() => {
    if (!expanded) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      // An open menu, select or popover inside the card closes first, on its own Escape: leave the event to it
      if (document.querySelector('[data-radix-popper-content-wrapper], [role="menu"], [role="listbox"]')) return
      e.stopPropagation()
      setExpanded(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey, true); openRef.current?.focus() }
  }, [expanded])

  const savePng = async () => {
    const draw = [...pictures.current][0]
    const picture = draw?.()
    if (!picture || !cardRef.current) { toast.error('This chart cannot be saved as a picture yet.'); return }
    setBusy(true)
    try {
      await downloadPng({ name, title, subtitle: exportSubtitle ?? (typeof description === 'string' ? description : undefined), legend: legend.map((l) => ({ name: l.name, color: l.color, shape: l.shape })), picture, card: cardRef.current })
      toast.success(`Downloaded ${name}.png`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The picture could not be saved.')
    } finally {
      setBusy(false)
    }
  }
  const saveCsv = () => {
    const t = csv?.()
    if (!t) { toast.error('There is nothing to download yet.'); return }
    downloadCsv(name, t)
    toast.success(`Downloaded ${name}.csv`)
  }
  const exportable = !loading && (!!csv || (canPicture && !showTable && !empty))

  return (
    <ChartFrame.Provider value={frame}>
      <section
        ref={cardRef}
        id={id ? `focus-${id}` : undefined}
        aria-label={expanded ? `${title}, full screen` : undefined}
        className={cn('@container min-w-0 scroll-mt-40 rounded-xl border border-border bg-card shadow-card', fill && !expanded && 'chart-fill h-full', expanded && 'chart-expanded', className)}
      >
        <div className={cn(fill && !expanded && 'chart-fill chart-fill-body', expanded && 'chart-expanded-inner px-2 py-4 sm:px-6')}>
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-5 sm:px-6">
            <div className="min-w-0">
              <h2 className={cn('font-display font-semibold leading-snug tracking-[-0.01em]', expanded ? 'text-xl' : 'text-[17px]')}>{title}</h2>
              {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {action}
              {table && !loading && (
                <button type="button" aria-pressed={showTable} aria-controls={bodyId} onClick={() => setAsTable((v) => !v)} className={iconButton} aria-label={showTable ? 'View as chart' : 'View as table'} title={showTable ? 'View as chart' : 'View as table'}>
                  {showTable ? <BarChart3 aria-hidden="true" className="h-3.5 w-3.5" /> : <Table2 aria-hidden="true" className="h-3.5 w-3.5" />}
                  {/* The words show where the toolbar has room; a narrower card keeps the icon, its name and a hover title */}
                  <span className="hidden @2xl:inline">{showTable ? 'View as chart' : 'View as table'}</span>
                </button>
              )}
              {exportable && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className={iconButton} aria-label={`Download ${title}`} title="Download" disabled={busy}>
                      <Download aria-hidden="true" className="h-3.5 w-3.5" /><span className="hidden @3xl:inline">Download</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {csv && <DropdownMenuItem onSelect={saveCsv}><FileSpreadsheet aria-hidden="true" className="h-4 w-4" />Download CSV</DropdownMenuItem>}
                    {canPicture && !showTable && !empty && <DropdownMenuItem onSelect={() => void savePng()}><ImageIcon aria-hidden="true" className="h-4 w-4" />Download PNG</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {expandable && !loading && (
                expanded
                  ? <button ref={closeRef} type="button" onClick={() => setExpanded(false)} className={iconButton}><Minimize2 aria-hidden="true" className="h-3.5 w-3.5" />Close full screen</button>
                  : <button ref={openRef} type="button" onClick={() => setExpanded(true)} className={cn(iconButton, 'w-8 px-0')} aria-label={`Show ${title} full screen`}><Maximize2 aria-hidden="true" className="h-3.5 w-3.5" /></button>
              )}
            </div>
          </div>
          {!loading && !empty && headline && <div className={cn('px-5 pt-5 sm:px-6', refreshing && 'opacity-60 transition-opacity duration-150')}>{headline}</div>}
          {!loading && !showTable && !empty && !headline && legend.length > 1 && <Legend items={legend} className="px-5 pt-3 sm:px-6" />}
          <div id={bodyId} aria-busy={loading || loadingNewer || undefined} className={cn('px-5 pb-5 pt-4 transition-opacity duration-150 sm:px-6 sm:pb-6', fill && !expanded && 'chart-fill-body', refreshing && 'opacity-60')}>
            {loading
              ? <ChartSkeleton shape={skeleton} height={height} label={title} />
              : showTable ? table
                : empty
                  ? <div className="flex flex-col items-center justify-center gap-1 rounded-lg bg-muted/60 px-6 text-center text-sm text-muted-foreground" style={{ minHeight: Math.min(height, 220) }}>{empty}</div>
                  : children}
            {!loading && footer}
            {stale && (
              <p role="alert" className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-[13px] text-danger">
                <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>{/[.!?]$/.test(staleError!.trim()) ? staleError : `${staleError}.`} These are the last numbers loaded, not the ones for the current choice.</span>
                {onRetry && <button type="button" onClick={onRetry} className="font-medium underline underline-offset-2 pointer-coarse:min-h-10">Try again</button>}
              </p>
            )}
          </div>
        </div>
      </section>
    </ChartFrame.Provider>
  )
}
