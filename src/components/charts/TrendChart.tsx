import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'
import { Delta } from './Delta'
import { areaPath, bandPath, linePath, type Curve } from './curve'
import { niceTicks } from './format'
import { useChartFrame, useChartHeight, useChartPicture } from './frame'
import { useTween } from './motion'
import { useBox } from './useSize'
import './charts.css'

export interface TrendSeries {
  key: string
  name: string
  color: string
  values: (number | null)[]
  /**
   * area: the main line, with a gradient wash. line: a plain line.
   * muted: the comparison period, a thin dashed slate line drawn underneath.
   * estimate: dashed, for a projection.
   * bars: soft columns behind the lines (each day's own value under its average).
   */
  kind?: 'area' | 'line' | 'muted' | 'estimate' | 'bars'
  /** A likely range around this series, drawn as a wash (an estimate's band). */
  band?: { low: (number | null)[]; high: (number | null)[] }
  /** Not drawn; read out in the tooltip and to screen readers (a value worth having beside the lines). */
  hidden?: boolean
}

interface TrendChartProps {
  /** One per point: short for the axis, full for the readout. */
  ticks: string[]
  labels: string[]
  series: TrendSeries[]
  /** 'line' overlays the series; 'stack' stacks them as columns; 'column' draws one series as columns. */
  mode?: 'line' | 'stack' | 'column'
  format: (n: number) => string
  axisFormat?: (n: number) => string
  /** Says what the chart shows, for screen readers. */
  label: string
  /** The plot's height; with `fill`, its minimum. */
  height?: number
  whole?: boolean
  /** A fixed top, e.g. 5 for ratings. */
  max?: number
  /** Extra lines in the readout for a point. */
  details?: (i: number) => { name: string; value: string }[]
  onSelect?: (i: number) => void
  selectHint?: string
  /** 'smooth' (default) curves through the points without overshooting; 'linear' keeps straight segments. */
  curve?: Curve
  /** Grow to the height the card gives it (equal-height rows). `height` is then the minimum. */
  fill?: boolean
  /** Print the latest value of the main line at its end point (default on). */
  endLabel?: boolean
  /**
   * The bucket still in progress (today, in IST). Its column is drawn as "so far"
   * (a lighter wash with a dashed outline) and named `partialName` in the
   * tooltip; callers leave the lines empty there so they end at the last
   * complete day.
   */
  partial?: number | null
  partialName?: string
  /** The change row's name in the tooltip ("Change, 7-day average"). */
  changeLabel?: string
}

const TOP = 14
const AXIS = 28
const fmtNum = (v: number | null | undefined) => v !== null && v !== undefined && !Number.isNaN(v)

/** A short stroke in the series colour: the key for a line, solid or dashed. */
export function LineKey({ color, dashed, className }: { color: string; dashed?: boolean; className?: string }) {
  return (
    <svg aria-hidden="true" width="16" height="6" className={cn('chart-swatch shrink-0', className)}>
      <line x1="1.5" x2="14.5" y1="3" y2="3" stroke={color} strokeWidth={dashed ? 1.75 : 2.25} strokeLinecap="round" strokeDasharray={dashed ? '3 3' : undefined} />
    </svg>
  )
}

/**
 * Trend over time, drawn as SVG. Smooth monotone lines with a gradient wash
 * under the main series, the comparison period as a thin dashed line beneath
 * it, and the latest point marked live. Pointer anywhere finds the nearest
 * point; with the keyboard the arrow keys move the crosshair and the readout
 * is spoken, so nothing is reachable by mouse only.
 */
export function TrendChart({ ticks, labels, series: target, mode = 'line', format, axisFormat = format, label, height: baseHeight = 260, whole, max, details, onSelect, selectHint, curve = 'smooth', fill, endLabel = true, partial = null, partialName = 'So far', changeLabel = 'Change' }: TrendChartProps) {
  const { expanded } = useChartFrame()
  const fixedHeight = useChartHeight(baseHeight)
  const growing = !!fill && !expanded
  const { ref, width, height: boxHeight } = useBox<HTMLDivElement>()
  const height = growing ? Math.max(fixedHeight, boxHeight) : fixedHeight
  const svgRef = useRef<SVGSVGElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [pointer, setPointer] = useState<{ i: number; y: number | null } | null>(null)
  const [tipSize, setTipSize] = useState({ w: 0, h: 0 })
  const n = labels.length
  const index = pointer === null || pointer.i >= n ? null : pointer.i
  const columns = mode !== 'line'

  const top = useMemo(() => {
    let m = 0
    for (let i = 0; i < n; i += 1) {
      if (mode === 'stack') m = Math.max(m, target.reduce((s, x) => s + (x.hidden ? 0 : x.values[i] || 0), 0))
      else for (const s of target) if (!s.hidden) m = Math.max(m, s.values[i] || 0, s.band?.high[i] || 0)
    }
    return m
  }, [target, n, mode])
  const yTicks = useMemo(() => (max ? Array.from({ length: max + 1 }, (_, i) => i) : niceTicks(top, height < 200 ? 3 : 4, whole)), [top, whole, max, height])
  const yTarget = Math.max(yTicks[yTicks.length - 1], 1)

  // Every number glides to its new value: the scale, then each series (and its band)
  const flat = useMemo(() => [yTarget, ...target.flatMap((s) => [...s.values.slice(0, n), ...(s.band ? [...s.band.low.slice(0, n), ...s.band.high.slice(0, n)] : [])])], [target, yTarget, n])
  const moving = useTween(flat, 520)
  const yMax = (moving[0] as number) || yTarget
  const series = useMemo(() => {
    let k = 1
    const take = () => { const out = moving.slice(k, k + n); k += n; return out.length === n ? out : new Array(n).fill(null) }
    return target.map((s) => ({ ...s, values: take(), band: s.band ? { low: take(), high: take() } : undefined }))
  }, [moving, target, n])

  // The main series: the one with the wash, else the first plain line. Soft columns are never the main line.
  const drawnTarget = target.filter((s) => !s.hidden)
  const primary = columns ? null : (drawnTarget.find((s) => s.kind === 'area') ?? drawnTarget.find((s) => s.kind !== 'muted' && s.kind !== 'estimate' && s.kind !== 'bars') ?? null)
  const dayBars = columns ? null : drawnTarget.find((s) => s.kind === 'bars') ?? null
  // The change in the tooltip is the main line against the comparison; with columns only, the day against it
  const changeBase = primary ?? dayBars
  const compare = changeBase ? drawnTarget.find((s) => s.kind === 'muted') ?? null : null
  const inProgress = partial !== null && partial >= 0 && partial < n ? partial : null
  const lastIndex = (values: (number | null)[]) => { for (let i = values.length - 1; i >= 0; i -= 1) if (fmtNum(values[i])) return i; return -1 }
  const live = primary && n > 1 ? lastIndex(primary.values) : -1
  const liveText = primary && live >= 0 ? format(primary.values[live] as number) : ''
  // The end label sits right of the last point when the line runs to the end
  const endRoom = endLabel && live === n - 1 && liveText ? Math.ceil(liveText.length * 7 + 18) : 0

  useChartPicture(() => (svgRef.current && width > 0 ? { svg: svgRef.current, width, height } : null))

  const left = Math.max(...yTicks.map((t) => axisFormat(t).length)) * 6.6 + 14
  const right = Math.max(10, endRoom)
  const plotW = Math.max(0, width - left - right)
  const plotH = Math.max(0, height - TOP - AXIS)
  const band = n ? plotW / n : 0
  // Room at both ends, so the first and last date labels sit under their points
  const pad = columns || n === 1 ? 0 : Math.min(14, plotW / 12)
  const x = (i: number) => columns ? left + band * (i + 0.5) : n === 1 ? left + plotW / 2 : left + pad + ((plotW - pad * 2) * i) / (n - 1)
  const y = (v: number) => TOP + plotH - (v / yMax) * plotH
  const base = y(0)
  const barW = Math.max(2, Math.min(24, band - Math.max(2, band * 0.28)))
  // Soft columns under the lines: at most 24px, centred on each day's point
  const step = n > 1 ? (plotW - pad * 2) / (n - 1) : plotW
  const softW = Math.max(2, Math.min(24, step * 0.62))

  // About six date labels, always the latest, evenly spaced, never touching
  const labelW = Math.max(...ticks.map((t) => t.length), 4) * 6.6 + 16
  const shownTicks = useMemo(() => {
    const out = new Set<number>()
    if (!n || plotW <= 0) return out
    if (n === 1) { out.add(0); return out }
    const fit = Math.max(1, Math.floor((plotW - pad * 2) / labelW))
    const want = Math.max(2, Math.min(6, fit))
    const every = Math.max(1, Math.ceil((n - 1) / (want - 1)))
    for (let i = n - 1; i >= 0; i -= every) out.add(i)
    const first = Math.min(...out)
    const step = ((plotW - pad * 2) / Math.max(1, n - 1)) * first
    if (first > 0 && (columns ? band * first : step) >= labelW * 1.05) out.add(0)
    return out
  }, [n, plotW, pad, labelW, columns, band])

  const nearest = (clientX: number, el: Element) => {
    const px = clientX - el.getBoundingClientRect().left
    const i = columns ? Math.floor((px - left) / band) : n === 1 ? 0 : Math.round(((px - left - pad) / Math.max(1, plotW - pad * 2)) * (n - 1))
    return Math.max(0, Math.min(n - 1, i))
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!n) return
    const r = e.currentTarget.getBoundingClientRect()
    setPointer({ i: nearest(e.clientX, e.currentTarget), y: e.clientY - r.top })
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!n) return
    const cur = index ?? n - 1
    const next = { ArrowLeft: cur - 1, ArrowRight: cur + 1, Home: 0, End: n - 1, PageUp: cur - 7, PageDown: cur + 7 }[e.key]
    if (next !== undefined) { e.preventDefault(); setPointer({ i: Math.max(0, Math.min(n - 1, next)), y: null }) }
    else if (e.key === 'Escape') setPointer(null)
    else if (e.key === 'Enter' && onSelect && index !== null) onSelect(index)
  }

  const seriesName = (s: TrendSeries, i: number) => (i === inProgress && s.kind === 'bars' ? partialName : s.name)
  // The readout and tooltip always speak the real values, never a value mid-glide
  const readout = (i: number) => [labels[i], ...target.filter((s) => !(i === inProgress && !fmtNum(s.values[i]))).map((s) => `${seriesName(s, i)} ${fmtNum(s.values[i]) ? format(s.values[i]!) : 'none'}`), ...(details?.(i) ?? []).map((d) => `${d.name} ${d.value}`)].join(', ')

  const roundedTop = (cx: number, yTop: number, yBottom: number, w = barW) => {
    const h = yBottom - yTop
    const r = Math.max(0, Math.min(4, w / 2, h))
    const a = cx - w / 2
    const b = cx + w / 2
    return `M${a},${yBottom}V${yTop + r}Q${a},${yTop} ${a + r},${yTop}H${b - r}Q${b},${yTop} ${b},${yTop + r}V${yBottom}Z`
  }
  // With few points every point of a plain line gets a dot
  const dots = !columns && n <= 12

  // Draw order: comparison underneath, estimates, other lines, the main line on top (soft columns are drawn first, apart)
  const rank = (s: TrendSeries) => (s.kind === 'muted' ? 0 : s.kind === 'estimate' ? 1 : s.key === primary?.key ? 3 : 2)
  const ordered = series.filter((s) => !s.hidden && s.kind !== 'bars').sort((a, b) => rank(a) - rank(b))
  const softSeries = columns ? [] : series.filter((s) => !s.hidden && s.kind === 'bars')
  // In the tooltip: the day's own value, the main line, the comparison's same day, the comparison, then the rest
  const tipOrder = [...target].sort((a, b) => {
    const r = (s: TrendSeries) => (s.kind === 'bars' ? 0 : s.key === primary?.key ? 1 : s.hidden ? 2 : s.kind === 'muted' ? 3 : 4)
    return r(a) - r(b)
  })

  // Tooltip: beside the pointer, flipped near the right edge, never outside the plot
  const tipX = index === null ? 0 : x(index)
  const primaryY = index !== null && primary && fmtNum(primary.values[index]) ? y(series.find((s) => s.key === primary.key)!.values[index] as number) : TOP + plotH / 2
  const anchorY = pointer?.y ?? primaryY
  let tx = tipX + 16
  if (tx + tipSize.w > width) tx = tipX - 16 - tipSize.w
  tx = Math.max(0, Math.min(Math.max(0, width - tipSize.w), tx))
  const ty = Math.max(0, Math.min(Math.max(0, TOP + plotH - tipSize.h), anchorY - tipSize.h / 2))
  useLayoutEffect(() => {
    const el = tipRef.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    setTipSize((s) => (s.w === w && s.h === h ? s : { w, h }))
  }, [index, target, details])

  // No change for a day still in progress: a part-day against a whole day says nothing
  const change = index !== null && index !== inProgress && changeBase && compare && fmtNum(changeBase.values[index]) && fmtNum(compare.values[index]) ? { now: changeBase.values[index] as number, before: compare.values[index] as number } : null

  return (
    <div
      ref={ref}
      className={cn('chart-plot relative select-none rounded-md outline-offset-4', growing && 'min-h-0 flex-1')}
      style={growing ? { minHeight: fixedHeight, touchAction: 'pan-y' } : { height, touchAction: 'pan-y' }}
      role="slider"
      tabIndex={0}
      aria-label={`${label}. Use the arrow keys to read each point.`}
      aria-orientation="horizontal"
      aria-valuemin={1}
      aria-valuemax={Math.max(n, 1)}
      aria-valuenow={(index ?? n - 1) + 1}
      aria-valuetext={n ? readout(index ?? n - 1) : 'No points'}
      onPointerMove={onMove}
      onPointerDown={onMove}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setPointer(null) }}
      onBlur={() => setPointer(null)}
      onKeyDown={onKey}
      onClick={(e) => { if (onSelect && n) onSelect(nearest(e.clientX, e.currentTarget)) }}
    >
      {width > 0 && height > 0 && (
        <svg ref={svgRef} width={width} height={height} aria-hidden="true" className={cn('block overflow-visible', growing && 'absolute inset-0', onSelect && 'cursor-pointer')}>
          <defs>
            {series.map((s, k) => s.kind === 'area' && (
              <linearGradient key={s.key} id={`${uid}-wash-${k}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" style={{ stopColor: s.color, stopOpacity: 'var(--chart-wash-top)' }} />
                <stop offset="100%" style={{ stopColor: s.color, stopOpacity: 0 }} />
              </linearGradient>
            ))}
          </defs>

          {/* Faint dashed gridlines on clean ticks; a solid baseline */}
          {yTicks.map((t) => (
            <g key={t}>
              {t !== 0 && <line x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth={1} strokeDasharray="3 4" shapeRendering="crispEdges" />}
              <text x={left - 10} y={y(t)} dy="0.32em" textAnchor="end" fontSize={12} fill="hsl(var(--muted-foreground))">{axisFormat(t)}</text>
            </g>
          ))}
          {ticks.map((t, i) => {
            if (!shownTicks.has(i)) return null
            const cx = x(i)
            const anchor = cx + labelW / 2 > width ? 'end' : cx - labelW / 2 < 0 ? 'start' : 'middle'
            return <text key={i} x={anchor === 'end' ? Math.min(cx + 6, width) : cx} y={height - 8} textAnchor={anchor} fontSize={12} fill="hsl(var(--muted-foreground))">{t}</text>
          })}

          {index !== null && !columns && <line x1={x(index)} x2={x(index)} y1={TOP - 4} y2={base} stroke="var(--chart-crosshair)" strokeWidth={1} shapeRendering="crispEdges" />}
          {index !== null && columns && <rect x={left + band * index} y={TOP} width={band} height={plotH} rx={4} fill="hsl(var(--muted))" opacity={0.9} />}

          {/* Each day as a soft column behind the lines; today, still in progress, as a dashed "so far" outline */}
          {softSeries.map((s) => (
            <g key={s.key} className="chart-fade">
              {s.values.map((v, i) => {
                if (!fmtNum(v)) return null
                const so = i === inProgress
                const yTop = Math.min(y(v as number), so ? base - 4 : base)
                if (!so && (v as number) <= 0) return null
                return (
                  <path
                    key={i}
                    className="chart-bar"
                    d={roundedTop(x(i), yTop, base, softW)}
                    fill={s.color}
                    fillOpacity={so ? 0.08 : index === i ? 0.4 : 0.22}
                    stroke={so ? s.color : 'none'}
                    strokeOpacity={so ? 0.75 : undefined}
                    strokeWidth={so ? 1 : undefined}
                    strokeDasharray={so ? '3 2.5' : undefined}
                  />
                )
              })}
            </g>
          ))}

          {columns
            ? labels.map((_, i) => {
                let acc = 0
                // A hidden series is read out, never drawn, in columns as in lines
                const shown = series.filter((s) => !s.hidden && (s.values[i] || 0) > 0)
                return (
                  <g key={i} className="chart-bar" opacity={index !== null && index !== i ? 0.55 : 1}>
                    {shown.map((s, k) => {
                      const v = s.values[i] || 0
                      const y0 = y(acc)
                      acc += v
                      const y1 = y(acc)
                      const last = k === shown.length - 1
                      // 2px of card colour between touching segments
                      const gap = last ? 0 : Math.min(2, Math.max(0, (y0 - y1) - 1))
                      return last
                        ? <path key={s.key} d={roundedTop(x(i), y1, Math.max(y0, y1 + 1))} fill={s.color} />
                        : <rect key={s.key} x={x(i) - barW / 2} y={y1 + gap} width={barW} height={Math.max(1, y0 - y1 - gap)} fill={s.color} />
                    })}
                  </g>
                )
              })
            : ordered.map((s) => {
                const k = series.indexOf(s)
                const isPrimary = s.key === primary?.key
                const line = n > 1 ? linePath(s.values, x, y, curve) : ''
                return (
                  <g key={s.key}>
                    {s.band && n > 1 && <path className="chart-fade" d={bandPath(s.band.low, s.band.high, x, y, curve)} fill={s.color} fillOpacity={0.12} stroke="none" />}
                    {s.kind === 'area' && n > 1 && <path className="chart-fade" d={areaPath(s.values, x, y, base, curve)} fill={`url(#${uid}-wash-${k})`} />}
                    {n > 1 && (s.kind === 'muted'
                      ? <path className="chart-fade" d={line} fill="none" stroke={s.color} strokeWidth={1.5} strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" />
                      : s.kind === 'estimate'
                        ? <path className="chart-fade" d={line} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round" />
                        : <path className="chart-draw" pathLength={1} d={line} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />)}
                    {s.values.map((v, i) => fmtNum(v) && (i === index || n === 1 || (dots && s.kind !== 'muted' && s.kind !== 'estimate') || (!isPrimary && s.kind !== 'muted' && s.kind !== 'estimate' && i === lastIndex(s.values))) && (
                      <circle key={i} className={i === index ? undefined : 'chart-fade-late'} cx={x(i)} cy={y(v as number)} r={i === index ? (isPrimary ? 5 : 4.5) : 3.5} fill={s.color} stroke="var(--chart-surface)" strokeWidth={2} />
                    ))}
                  </g>
                )
              })}

          {/* The live end point: a ringed dot with a soft sky halo, and its value */}
          {primary && live >= 0 && (() => {
            const s = series.find((q) => q.key === primary.key)!
            const v = s.values[live]
            if (!fmtNum(v)) return null
            const cx = x(live)
            const cy = y(v as number)
            // Beside the point at the right edge. Otherwise the first spot around it, out of six, that
            // touches no line, no column top, not the axis and not the plot's edges.
            const textW = liveText.length * 7 + 4
            let lx = cx + 11
            let ly = cy
            let anchor: 'start' | 'middle' | 'end' = 'start'
            if (!endRoom) {
              const lines = series.filter((q) => !q.hidden && q.kind !== 'bars')
              const yAt = (q: (typeof series)[number], px: number) => {
                // The line's height at px, straight between its two neighbouring points
                for (let i = 0; i < n - 1; i += 1) {
                  const a = q.values[i]
                  const b = q.values[i + 1]
                  if (x(i) <= px && px <= x(i + 1) && fmtNum(a) && fmtNum(b)) return y(a as number) + ((px - x(i)) / Math.max(1e-6, x(i + 1) - x(i))) * (y(b as number) - y(a as number))
                }
                return null
              }
              const clash = (x0: number, x1: number, y0: number, y1: number) => {
                // The margin above the plot is free room; the axis and the sides are not
                if (y0 < 0 || y1 > base - 4 || x0 < left + 2 || x1 > width - 2) return 99
                let hits = 0
                for (const q of lines) for (let k = 0; k <= 8; k += 1) {
                  const yy = yAt(q, x0 + ((x1 - x0) * k) / 8)
                  if (yy !== null && yy >= y0 - 3 && yy <= y1 + 3) { hits += 1; break }
                }
                for (const q of softSeries) q.values.forEach((v, i) => {
                  if (!fmtNum(v)) return
                  const top = y(v as number)
                  if (x(i) + softW / 2 > x0 && x(i) - softW / 2 < x1 && top < y1 && base > y0) hits += 0.25
                })
                return hits
              }
              const spots: { a: 'start' | 'middle' | 'end'; dx: number; dy: number }[] = [
                { a: 'end', dx: -9, dy: -15 }, { a: 'start', dx: 9, dy: -15 }, { a: 'middle', dx: 0, dy: -17 },
                { a: 'end', dx: -9, dy: 16 }, { a: 'start', dx: 9, dy: 16 }, { a: 'middle', dx: 0, dy: 19 },
              ]
              let best = { score: Infinity, a: 'end' as 'start' | 'middle' | 'end', x: cx - 11, y: cy }
              for (const sp of spots) {
                const tx = cx + sp.dx
                const x0 = sp.a === 'end' ? tx - textW : sp.a === 'middle' ? tx - textW / 2 : tx
                const score = clash(x0, x0 + textW, cy + sp.dy - 8, cy + sp.dy + 8)
                if (score < best.score) best = { score, a: sp.a, x: tx, y: cy + sp.dy }
                if (score === 0) break
              }
              anchor = best.a; lx = best.x; ly = best.y
            }
            return (
              <g className="chart-fade-late" pointerEvents="none">
                <circle className="chart-halo" cx={cx} cy={cy} r={11} fill="var(--chart-halo)" />
                <circle cx={cx} cy={cy} r={4.5} fill={s.color} stroke="var(--chart-surface)" strokeWidth={2} />
                {endLabel && index === null && <text className="chart-label" x={lx} y={ly} dy="0.32em" textAnchor={anchor} fontSize={12} fontWeight={600} fill="hsl(var(--foreground))">{liveText}</text>}
              </g>
            )
          })()}

          {/* A single point has no line to read it by, so it says its value */}
          {n === 1 && !columns && target.map((s, k) => {
            const v = s.values[0]
            if (!fmtNum(v)) return null
            const others = target.slice(0, k).map((o) => o.values[0]).filter((o): o is number => fmtNum(o))
            const clash = others.some((o) => Math.abs(y(o) - y(v as number)) < 16)
            return <text key={s.key} className="chart-label" x={x(0) + (clash ? -12 : 12)} y={y(v as number)} dy="0.32em" textAnchor={clash ? 'end' : 'start'} fontSize={12} fontWeight={600} fill="hsl(var(--foreground))">{`${format(v as number)} ${s.name.toLowerCase()}`}</text>
          })}
          <line x1={left} x2={left + plotW} y1={base} y2={base} stroke="var(--chart-axis)" strokeWidth={1} shapeRendering="crispEdges" />
        </svg>
      )}

      {index !== null && width > 0 && (
        <div
          ref={tipRef}
          className="chart-tip pointer-events-none absolute left-0 top-0 z-10 w-max min-w-[176px] max-w-[min(300px,86%)] rounded-lg border border-border bg-popover px-3 py-2.5 text-[13px] shadow-raised"
          style={{ transform: `translate(${Math.round(tx)}px, ${Math.round(ty)}px)`, opacity: tipSize.w ? 1 : 0 }}
        >
          <p className="text-xs font-medium text-muted-foreground">{labels[index]}</p>
          <ul className="mt-1.5 space-y-1">
            {tipOrder.map((s) => {
              const v = s.values[index]
              // Lines stop at the last complete day: on today they have nothing to say
              if (index === inProgress && !fmtNum(v)) return null
              const day = s.kind === 'bars'
              return (
                <li key={s.key} className="flex items-center justify-between gap-5">
                  <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                    {day
                      ? <span aria-hidden="true" className={cn('chart-swatch mx-[3px] h-2.5 w-2.5 shrink-0 rounded-t-[3px]', index === inProgress && 'border border-dashed')} style={{ background: `color-mix(in srgb, ${s.color} ${index === inProgress ? 12 : 35}%, transparent)`, borderColor: s.color }} />
                      : s.hidden ? <span aria-hidden="true" className="w-4 shrink-0" /> : <LineKey color={s.color} dashed={s.kind === 'muted' || s.kind === 'estimate'} />}
                    <span className="truncate">{seriesName(s, index)}</span>
                  </span>
                  <span className={cn('tabular-nums text-foreground', day ? 'text-[14px] font-bold' : 'font-semibold')}>{fmtNum(v) ? format(v!) : 'None'}</span>
                </li>
              )
            })}
            {change && (
              <li className="flex items-center justify-between gap-5">
                <span className="pl-[22px] text-muted-foreground">{changeLabel}</span>
                <Delta now={change.now} before={change.before} versus={compare!.name.toLowerCase()} className="text-[13px]" />
              </li>
            )}
            {(details?.(index) ?? []).map((d) => (
              <li key={d.name} className="flex items-center justify-between gap-5 border-border first-of-type:mt-0"><span className="pl-[22px] text-muted-foreground">{d.name}</span><span className="font-medium tabular-nums text-foreground">{d.value}</span></li>
            ))}
          </ul>
          {onSelect && selectHint && <p className="mt-1.5 border-t border-border pt-1.5 text-xs text-muted-foreground">{selectHint}</p>}
        </div>
      )}
    </div>
  )
}
