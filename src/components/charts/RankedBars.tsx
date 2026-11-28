import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { barsPicture } from './exporting'
import { useChartPicture } from './frame'
import './charts.css'

export interface BarSegment { key: string; name: string; value: number; color: string }
export interface RankedBar {
  key: string
  name: string
  value: number
  /** Second line under the name. */
  hint?: ReactNode
  segments?: BarSegment[]
  href?: string
  color?: string
  aside?: ReactNode
}

interface RankedBarsProps {
  rows: RankedBar[]
  format: (n: number) => string
  /** Announced with each row, e.g. "collected". */
  unit: string
  /** Bars measure against this instead of the largest row. */
  max?: number
  onSelect?: (key: string) => void
  /** The row that filters the page now (cross-filter); the others dim. */
  selected?: string | null
}

/**
 * Ranked horizontal bars, largest first. Each row is one link: the whole row
 * opens what it counts. A segmented row names its parts on hover and focus.
 */
export function RankedBars({ rows, format, unit, max, onSelect, selected }: RankedBarsProps) {
  const [open, setOpen] = useState<string | null>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const top = max ?? Math.max(...rows.map((r) => r.value), 0)
  // For "Download PNG": the same bars, drawn as an SVG
  useChartPicture(() => {
    const width = Math.max(320, Math.min(900, listRef.current?.clientWidth ?? 640))
    return barsPicture(rows.map((r) => {
      const parts = (r.segments ?? []).filter((s) => s.value > 0)
      const whole = top > 0 ? r.value / top : 0
      return { name: r.name, value: format(r.value), parts: parts.length > 1 ? parts.map((p) => ({ share: (p.value / Math.max(r.value, 1e-9)) * whole, color: p.color })) : [{ share: whole, color: parts[0]?.color ?? r.color ?? 'var(--chart-primary)' }] }
    }), width)
  })
  // Room at the right of every bar for the longest value, so bars share one scale and each value sits at its tip
  const reserve = Math.ceil(Math.max(4, ...rows.map((r) => format(r.value).length)) * 7.4 + 10)
  return (
    <ol ref={listRef} className="space-y-0.5">
      {rows.map((r) => {
        const pct = top > 0 ? Math.max(0, (r.value / top) * 100) : 0
        const parts = (r.segments ?? []).filter((s) => s.value > 0)
        const spoken = `${r.name}: ${format(r.value)} ${unit}${parts.length > 1 ? `. ${parts.map((p) => `${p.name} ${format(p.value)}`).join(', ')}` : ''}`
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium" title={r.name}>{r.name}</span>
              {r.aside && <span className="flex shrink-0 items-baseline gap-2">{r.aside}</span>}
            </span>
            <span className="mt-1.5 flex h-4 w-full items-center" aria-hidden="true">
              {r.value > 0
                ? (
                  <span className="chart-bar chart-grow flex h-3 shrink-0 gap-[2px] overflow-hidden rounded-r-[4px]" style={{ width: `calc((100% - ${reserve}px) * ${Math.max(pct, 0.6) / 100})`, minWidth: 3 }}>
                    {parts.length > 1
                      ? parts.map((p) => <span key={p.key} className="chart-swatch chart-grow h-full" style={{ width: `${(p.value / r.value) * 100}%`, minWidth: 2, background: p.color }} />)
                      : <span className="chart-swatch h-full w-full" style={{ background: parts[0]?.color ?? r.color ?? 'var(--chart-primary)' }} />}
                  </span>
                )
                : <span className="h-3 w-px shrink-0 bg-border" />}
              <span className="ml-2 shrink-0 text-sm font-semibold leading-none tabular-nums text-foreground">{format(r.value)}</span>
            </span>
            {r.hint && <span className="mt-1 block truncate text-xs text-muted-foreground">{r.hint}</span>}
          </>
        )
        const clickable = !!(r.href || onSelect)
        const isOn = selected === r.key
        const cls = cn('relative block w-full rounded-md px-2 py-2 text-left', clickable && 'pr-8 transition-[background-color,opacity] hover:bg-accent/60', selected && !isOn && 'opacity-55', isOn && 'bg-accent/70')
        const inner = (
          <>
            {body}
            {clickable && <ChevronRight aria-hidden="true" className="absolute right-1.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
          </>
        )
        return (
          <li key={r.key} className="relative -mx-2" onMouseEnter={() => setOpen(r.key)} onMouseLeave={() => setOpen((k) => (k === r.key ? null : k))} onFocus={() => setOpen(r.key)} onBlur={() => setOpen((k) => (k === r.key ? null : k))}>
            {r.href
              ? <Link to={r.href} aria-label={spoken} className={cls}>{inner}</Link>
              : onSelect
                ? <button type="button" aria-label={spoken} aria-pressed={selected !== undefined ? isOn : undefined} onClick={() => onSelect(r.key)} className={cls}>{inner}</button>
                : <div className={cls} aria-label={spoken} role="group">{inner}</div>}
            {open === r.key && parts.length > 1 && (
              <div className="pointer-events-none absolute right-8 top-full z-20 -mt-1 w-max max-w-[90%] rounded-lg border border-border bg-popover px-3 py-2 text-[13px] shadow-raised" role="presentation">
                <ul className="space-y-0.5">
                  {parts.map((p) => (
                    <li key={p.key} className="flex items-center justify-between gap-5">
                      <span className="flex items-center gap-1.5 text-muted-foreground"><span aria-hidden="true" className="chart-swatch h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} />{p.name}</span>
                      <span className="font-semibold tabular-nums">{format(p.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
