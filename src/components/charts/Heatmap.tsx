import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { DOW_NAMES, DOW_SHORT, hourName, hourSpan } from './format'
import { useChartHeight, useChartPicture } from './frame'
import { SEQ_STEPS, seqColor, seqStep } from './palette'
import { useWidth } from './useSize'
import './charts.css'

export interface HeatCell { dow: number; hour: number; orders: number; collected: number }

interface HeatmapProps {
  cells: HeatCell[]
  metric: 'collected' | 'orders'
  /** Formats the metric. */
  format: (n: number) => string
  /** Short money or count for the row totals. */
  compact: (n: number) => string
  label: string
  height?: number
  /** The cell that filters the page now. */
  selected?: { dow: number | null; hours: [number, number] | null }
  /** A weekday and an hour span (both included) were chosen. */
  onSelect?: (dow: number, hours: [number, number]) => void
}

const LEFT = 40
const AXIS = 22
const GAP = 2

/**
 * Seven weekdays by 24 hours (IST). One cobalt hue, darker = more. On a narrow
 * screen the hours fold into 3-hour blocks so every cell stays tappable. The
 * arrow keys walk the grid and the readout is spoken; Enter filters the page.
 */
export function Heatmap({ cells, metric, format, compact, label, height: baseHeight = 270, selected, onSelect }: HeatmapProps) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const height = useChartHeight(baseHeight)
  const svgRef = useRef<SVGSVGElement>(null)
  const narrow = width > 0 && width < 560
  const span = narrow ? 3 : 1
  const cols = 24 / span
  const right = narrow ? 0 : 64
  const [picked, setActive] = useState<{ r: number; c: number } | null>(null)

  // The grid folds from 24 hourly columns to 8 blocks when the card narrows (and back):
  // a cell picked before is dropped, and is never read past the grid's edge in between
  useEffect(() => { setActive(null) }, [cols])
  const active = picked && picked.r >= 0 && picked.r < 7 && picked.c >= 0 && picked.c < cols ? picked : null

  // Values per (weekday, column), folded into blocks on a narrow screen
  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array.from({ length: cols }, () => ({ orders: 0, collected: 0 })))
    for (const c of cells) {
      const cell = g[c.dow - 1]?.[Math.floor(c.hour / span)]
      if (cell) { cell.orders += c.orders; cell.collected += c.collected }
    }
    return g
  }, [cells, cols, span])
  const rowTotals = grid.map((row) => row.reduce((s, x) => s + x[metric], 0))
  const max = Math.max(0, ...grid.flat().map((x) => x[metric]))

  const plotW = Math.max(0, width - LEFT - right)
  const plotH = Math.max(0, height - AXIS)
  const cw = plotW / cols
  const ch = plotH / 7
  // Rounded cells: 4px where they are big enough, never more than a quarter of the cell
  const radius = Math.max(2, Math.min(4, (cw - GAP) / 4, (ch - GAP) / 4))
  const hoursOf = (c: number): [number, number] => [c * span, c * span + span - 1]
  const isSelected = (r: number, c: number) => {
    if (!selected?.dow && !selected?.hours) return false
    const [a, b] = hoursOf(c)
    const dowOk = !selected.dow || selected.dow === r + 1
    const hourOk = !selected.hours || (a <= selected.hours[1] && b >= selected.hours[0])
    return dowOk && hourOk
  }
  const anySelected = !!(selected?.dow || selected?.hours)
  const readout = (r: number, c: number) => {
    const x = grid[r][c]
    const [a, b] = hoursOf(c)
    return `${DOW_NAMES[r]}, ${hourSpan(a, b)}: ${x.orders} ${x.orders === 1 ? 'order' : 'orders'}, ${format(x.collected)} collected`
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const cur = active ?? { r: 0, c: 0 }
    const move: Record<string, [number, number]> = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }
    if (move[e.key]) {
      e.preventDefault()
      setActive({ r: Math.max(0, Math.min(6, cur.r + move[e.key][0])), c: Math.max(0, Math.min(cols - 1, cur.c + move[e.key][1])) })
    } else if (e.key === 'Home') { e.preventDefault(); setActive({ r: cur.r, c: 0 }) }
    else if (e.key === 'End') { e.preventDefault(); setActive({ r: cur.r, c: cols - 1 }) }
    else if ((e.key === 'Enter' || e.key === ' ') && active && onSelect && grid[active.r][active.c].orders > 0) { e.preventDefault(); onSelect(active.r + 1, hoursOf(active.c)) }
    else if (e.key === 'Escape') setActive(null)
  }

  useChartPicture(() => (svgRef.current && width > 0 ? { svg: svgRef.current, width, height } : null))

  const tickEvery = narrow ? 2 : 3 // columns between hour labels
  const tip = active && width > 0 ? { left: LEFT + active.c * cw + cw / 2, top: active.r * ch } : null
  const flip = tip ? tip.left > width * 0.6 : false

  return (
    <div>
      <div
        ref={ref}
        className="chart-plot relative select-none rounded-md outline-offset-4"
        style={{ height }}
        role="group"
        tabIndex={0}
        aria-label={`${label}. Use the arrow keys to read each cell${onSelect ? ' and Enter to filter the page by it' : ''}.`}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActive(null) }}
      >
        {width > 0 && (
          <svg ref={svgRef} width={width} height={height} aria-hidden="true" className="block">
            {DOW_SHORT.map((d, r) => (
              <text key={d} x={LEFT - 8} y={r * ch + ch / 2} dy="0.32em" textAnchor="end" fontSize={12} fill="hsl(var(--muted-foreground))">{d}</text>
            ))}
            {Array.from({ length: cols }, (_, c) => c % tickEvery === 0 && (
              <text key={c} x={LEFT + c * cw + (span === 1 ? 0 : 1)} y={height - 6} fontSize={12} fill="hsl(var(--muted-foreground))">{hourName(c * span).replace(' ', '')}</text>
            ))}
            {grid.map((row, r) => row.map((x, c) => {
              const step = seqStep(x[metric], max)
              const picked = isSelected(r, c)
              return (
                <rect
                  key={`${r}:${c}`}
                  className={cn('chart-cell', onSelect && x.orders > 0 && 'cursor-pointer')}
                  x={LEFT + c * cw + GAP / 2}
                  y={r * ch + GAP / 2}
                  width={Math.max(1, cw - GAP)}
                  height={Math.max(1, ch - GAP)}
                  rx={radius}
                  fill={seqColor(step)}
                  opacity={anySelected && !picked ? 0.4 : 1}
                  stroke={picked ? 'hsl(var(--foreground))' : 'none'}
                  strokeWidth={picked ? 1.5 : 0}
                  onPointerEnter={() => setActive({ r, c })}
                  onPointerDown={() => setActive({ r, c })}
                  onClick={() => { if (x.orders > 0) onSelect?.(r + 1, hoursOf(c)) }}
                />
              )
            }))}
            {/* The cell under the pointer lifts: drawn again on top, a little larger, ringed in the card colour */}
            {active && (() => {
              const x = grid[active.r][active.c]
              const w = Math.max(1, cw - GAP)
              const h = Math.max(1, ch - GAP)
              return (
                <rect
                  pointerEvents="none"
                  x={LEFT + active.c * cw + GAP / 2}
                  y={active.r * ch + GAP / 2}
                  width={w}
                  height={h}
                  rx={radius}
                  fill={seqColor(seqStep(x[metric], max))}
                  stroke="hsl(var(--foreground))"
                  strokeOpacity={0.7}
                  strokeWidth={1.5}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: 'scale(1.14)', filter: 'drop-shadow(0 3px 6px hsl(233 63% 11% / 0.28))' }}
                />
              )
            })()}
            {!narrow && rowTotals.map((t, r) => (
              <text key={r} x={width - 4} y={r * ch + ch / 2} dy="0.32em" textAnchor="end" fontSize={12} fontWeight={r === rowTotals.indexOf(Math.max(...rowTotals)) && t > 0 ? 600 : 400} fill={t > 0 ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}>{t > 0 ? compact(t) : '–'}</text>
            ))}
          </svg>
        )}
        {tip && active && (
          <div
            className="pointer-events-none absolute z-10 w-max max-w-[min(260px,80%)] rounded-lg border border-border bg-popover px-3 py-2 text-[13px] shadow-raised"
            style={{ top: Math.max(0, tip.top - 64), ...(flip ? { right: width - tip.left + 10 } : { left: tip.left + 10 }) }}
          >
            <p className="font-medium">{DOW_NAMES[active.r]}, {hourSpan(...hoursOf(active.c))}</p>
            <p className="mt-0.5 flex justify-between gap-4"><span className="text-muted-foreground">Collected</span><span className="font-semibold tabular-nums">{format(grid[active.r][active.c].collected)}</span></p>
            <p className="flex justify-between gap-4"><span className="text-muted-foreground">Orders</span><span className="font-semibold tabular-nums">{grid[active.r][active.c].orders}</span></p>
            {onSelect && grid[active.r][active.c].orders > 0 && <p className="mt-1 text-xs text-muted-foreground">Click to filter the page by this time</p>}
          </div>
        )}
        <p className="sr-only" aria-live="polite">{active ? readout(active.r, active.c) : ''}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span>Fewer</span>
          <span aria-hidden="true" className="flex gap-[2px]">{Array.from({ length: SEQ_STEPS + 1 }, (_, i) => <span key={i} className="h-2.5 w-4 rounded-[3px]" style={{ background: seqColor(i) }} />)}</span>
          <span>More{max > 0 ? `, up to ${metric === 'orders' ? `${max} orders` : format(max)} in one ${span === 1 ? 'hour' : '3-hour block'}` : ''}</span>
        </span>
        <span>Times in IST{narrow ? ', in 3-hour blocks' : ''}</span>
      </div>
    </div>
  )
}
