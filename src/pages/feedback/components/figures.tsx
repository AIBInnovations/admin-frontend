import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StarDisplay } from '@/components/videoReviews/StarDisplay'
import { formatCount } from '@/lib/format'
import type { FeedbackFigures, TrendPoint } from '@/services/feedback.service'
import { average, monthLabel, plural } from '../lib'

/** "4.2" with stars, or "No ratings". */
export function AverageRating({ value, count, className }: { value: number | null; count?: number; className?: string }) {
  if (value === null) return <span className={cn('text-sm text-muted-foreground', className)}>No ratings</span>
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-sm', className)}>
      <StarDisplay rating={value} />
      <span className="font-medium tabular-nums">{average(value)}</span>
      {count !== undefined && <span className="text-muted-foreground tabular-nums">({formatCount(count)})</span>}
    </span>
  )
}

/** Difference against the period before. Always says the direction in words for screen readers. */
export function Change({ value: exact, unit = '', goodWhenUp = true }: { value: number | null | undefined; unit?: string; goodWhenUp?: boolean }) {
  if (exact === null || exact === undefined) return <span className="text-muted-foreground">No earlier ratings</span>
  const value = Math.round(exact * 10) / 10 // one decimal, like the averages it compares
  if (value === 0) return <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus aria-hidden="true" className="h-3.5 w-3.5" />No change</span>
  const up = value > 0
  const good = up === goodWhenUp
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={cn('inline-flex items-center gap-1', good ? 'text-success' : 'text-danger')}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      <span className="sr-only">{up ? 'Up by' : 'Down by'}</span>
      <span className="tabular-nums"><span aria-hidden="true">{up ? '+' : '−'}</span>{formatCount(Math.abs(value))}{unit}</span>
    </span>
  )
}

/** The line under a figure: what it is made of, and how it moved. */
export function Hint({ text, change }: { text: ReactNode; change?: ReactNode }) {
  return <span className="flex flex-wrap items-center gap-x-2">{text}{change}</span>
}

/** How many of each star. Each row can open the matching reviews. */
export function RatingBars({ figures, hrefFor }: { figures: FeedbackFigures; hrefFor?: (stars: number) => string }) {
  const total = figures.rating_count
  return (
    <ul className="space-y-1.5">
      {([5, 4, 3, 2, 1] as const).map((stars) => {
        const n = figures.distribution[String(stars) as '1'] || 0
        const share = total ? (n / total) * 100 : 0
        const row = (
          <>
            <span className="w-14 shrink-0 text-[13px] text-muted-foreground">{plural(stars, 'star')}</span>
            <span aria-hidden="true" className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${n ? Math.max(share, 2) : 0}%` }} />
            </span>
            <span className="w-20 shrink-0 text-right text-[13px] tabular-nums">
              {formatCount(n)} <span className="text-muted-foreground">({Math.round(share)}%)</span>
            </span>
          </>
        )
        const base = 'flex items-center gap-3 rounded-md px-1.5 py-1 pointer-coarse:min-h-10'
        return (
          <li key={stars}>
            {hrefFor && n > 0
              ? <Link to={hrefFor(stars)} className={cn(base, 'transition-colors hover:bg-muted')} aria-label={`${plural(stars, 'star')}: ${plural(n, 'review')}. Show them`}>{row}</Link>
              : <div className={base}>{row}</div>}
          </li>
        )
      })}
    </ul>
  )
}

const H = 148; const PAD = { l: 26, r: 14, t: 16, b: 26 }

/** Average rating per month (IST), on the fixed 1 to 5 scale so months compare honestly. */
export function RatingTrend({ points }: { points: TrendPoint[] }) {
  const id = useId()
  const box = useRef<HTMLElement>(null)
  // Drawn at the real width, so the labels keep their size in a narrow column
  const [W, setW] = useState(480)
  const [active, setActive] = useState<number | null>(null)
  const drawn = points.length >= 2
  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setW(Math.max(220, Math.round(el.clientWidth)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [drawn])
  if (!drawn) {
    return <p className="text-sm text-muted-foreground">{points.length === 1 ? `Only one month has ratings so far: ${monthLabel(points[0].month)}, average ${average(points[0].average)}.` : 'No ratings yet.'}</p>
  }
  const x = (i: number) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + ((5 - v) / 4) * (H - PAD.t - PAD.b)
  const step = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(W / 80))))
  const shown = active ?? points.length - 1
  const p = points[shown]
  return (
    <figure ref={box} className="min-w-0" aria-labelledby={`${id}-cap`}>
      <figcaption id={`${id}-cap`} className="mb-2 text-[13px] text-muted-foreground" aria-live="polite">
        {monthLabel(p.month)}: <span className="font-medium text-foreground tabular-nums">{average(p.average)}</span> from {plural(p.count, 'rating')}
      </figcaption>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-label="Average rating by month. The table below has the same figures." onMouseLeave={() => setActive(null)}>
        {[1, 3, 5].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">{v}</text>
          </g>
        ))}
        <polyline points={points.map((pt, i) => `${x(i)},${y(pt.average)}`).join(' ')} className="fill-none stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((pt, i) => (
          <g key={pt.month}>
            <circle cx={x(i)} cy={y(pt.average)} r={i === shown ? 5 : 4} className="fill-primary stroke-card" strokeWidth={2} />
            {(i % step === 0 || i === points.length - 1) && !(i !== points.length - 1 && points.length - 1 - i < step) && (
              <text x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} className="fill-muted-foreground text-[11px]">{monthLabel(pt.month)}</text>
            )}
            <rect
              x={x(i) - (W / points.length) / 2} y={0} width={W / points.length} height={H} fill="transparent"
              onMouseEnter={() => setActive(i)}
            />
          </g>
        ))}
      </svg>
      <table className="sr-only">
        <caption>Average rating by month</caption>
        <thead><tr><th>Month</th><th>Average</th><th>Ratings</th></tr></thead>
        <tbody>{points.map((pt) => <tr key={pt.month}><td>{monthLabel(pt.month)}</td><td>{average(pt.average)}</td><td>{pt.count}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}
