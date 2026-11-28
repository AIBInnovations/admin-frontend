import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown } from 'lucide-react'
import { barsPicture } from './exporting'
import { formatCount, percent } from './format'
import { useChartPicture } from './frame'
import { ORDINAL } from './palette'
import './charts.css'

export interface FunnelStep { key: string; label: string; students: number; share: number; of_previous: number | null; href?: string }

/**
 * Stages from first to last, each bar measured against the first stage. The
 * step from one stage to the next is written between them, so the drop-off
 * reads in words as well as length. Stage colours run light to dark.
 */
export function FunnelBars({ steps }: { steps: FunnelStep[] }) {
  const ref = useRef<HTMLOListElement>(null)
  const top = Math.max(1, steps[0]?.students ?? 0)
  useChartPicture(() => barsPicture(steps.map((s, i) => ({ name: s.label, value: `${formatCount(s.students)} (${percent(s.share)})`, parts: [{ share: s.students / top, color: ORDINAL[Math.min(i, ORDINAL.length - 1)] }] })), Math.max(320, Math.min(900, ref.current?.clientWidth ?? 640))))
  return (
    <ol ref={ref} className="space-y-1">
      {steps.map((s, i) => {
        const pct = (s.students / top) * 100
        // The count sits just past the bar's tip on the track; a bar too long for that carries it inside, in the ink its fill needs
        const inside = pct > 78
        const step = Math.min(i, ORDINAL.length - 1)
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">{s.label}</span>
              {i > 0 && <span className="text-xs text-muted-foreground tabular-nums">{percent(s.share)} of registered</span>}
            </span>
            <span aria-hidden="true" className="relative mt-1.5 flex h-6 w-full items-center rounded-[4px] bg-[var(--chart-track)]">
              <span className="chart-grow flex h-full items-center justify-end rounded-[4px]" style={{ width: `${s.students > 0 ? Math.max(pct, 0.8) : 0}%`, background: ORDINAL[step] }}>
                {inside && <span className="px-2 text-[13px] font-semibold leading-none tabular-nums" style={{ color: `var(--ord-ink-${step + 1})` }}>{formatCount(s.students)}</span>}
              </span>
              {!inside && <span className="pl-2 text-[13px] font-semibold leading-none tabular-nums text-foreground">{formatCount(s.students)}</span>}
            </span>
          </>
        )
        return (
          <li key={s.key}>
            {i > 0 && s.of_previous !== null && (
              <p className="flex items-center gap-1.5 py-1 pl-1 text-xs text-muted-foreground">
                <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
                {percent(s.of_previous)} of the stage before
              </p>
            )}
            {s.href ? <Link to={s.href} className="-mx-2 block rounded-md px-2 py-1.5 transition-colors hover:bg-accent/60">{body}</Link> : <div className="py-1.5">{body}</div>}
          </li>
        )
      })}
    </ol>
  )
}
