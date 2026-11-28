import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { monthLabel, plural } from './format'
import { useChartPicture } from './frame'
import { resolveColor } from './exporting'
import { seqColor, seqInk } from './palette'

/** Shares run steps 1 to 5 of the cobalt ramp: a page of 100% cells stays calm, and the text stays readable. */
const cohortStep = (rate: number) => (rate > 0 ? Math.max(1, Math.min(5, Math.ceil(rate / 20))) : 0)
import './charts.css'

export interface CohortRow { month: string; students: number; cells: { k: number; students: number; retained: number; rate: number | null }[] }

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * Cohorts as rows, months since the first purchase as columns. Each cell
 * prints its share (colour is never the only signal); an empty cell is a month
 * that has not happened yet for that cohort.
 */
export function CohortGrid({ rows, months, onOpen }: { rows: CohortRow[]; months: number; onOpen?: (month: string) => void }) {
  const tableRef = useRef<HTMLTableElement>(null)

  // For "Download PNG": the same grid, as an SVG
  useChartPicture(() => {
    const cell = 44
    const head = 88
    const width = head + 70 + months * cell
    const height = 26 + rows.length * 30
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement
    svg.setAttribute('width', String(width)); svg.setAttribute('height', String(height))
    const ink = resolveColor('hsl(var(--foreground))')
    const muted = resolveColor('hsl(var(--muted-foreground))')
    const t = (x: number, y: number, s: string, color: string, anchor = 'start', weight = 400) => {
      const e = document.createElementNS(SVG_NS, 'text')
      e.setAttribute('x', String(x)); e.setAttribute('y', String(y)); e.setAttribute('font-size', '12'); e.setAttribute('fill', color); e.setAttribute('text-anchor', anchor); e.setAttribute('font-weight', String(weight))
      e.setAttribute('font-family', "'IBM Plex Sans', system-ui, sans-serif")
      e.textContent = s
      svg.appendChild(e)
    }
    t(0, 14, 'Cohort', muted); t(head + 60, 14, 'Students', muted, 'end')
    for (let k = 1; k <= months; k += 1) t(head + 70 + (k - 1) * cell + cell / 2, 14, `M${k}`, muted, 'middle')
    rows.forEach((r, i) => {
      const y = 26 + i * 30
      t(0, y + 18, monthLabel(r.month), ink, 'start', 500)
      t(head + 60, y + 18, String(r.students), ink, 'end')
      r.cells.forEach((c, j) => {
        const step = c.rate === null ? -1 : cohortStep(c.rate)
        const x = head + 70 + j * cell
        if (step >= 0) {
          const rect = document.createElementNS(SVG_NS, 'rect')
          rect.setAttribute('x', String(x + 1)); rect.setAttribute('y', String(y)); rect.setAttribute('width', String(cell - 2)); rect.setAttribute('height', '26'); rect.setAttribute('rx', '3')
          rect.setAttribute('fill', resolveColor(seqColor(step)))
          svg.appendChild(rect)
          t(x + cell / 2, y + 17, `${Math.round(c.rate as number)}%`, resolveColor(seqInk(step)), 'middle', 500)
        }
      })
    })
    return { svg, width, height }
  })

  return (
    <div className="pg-scroll-x overflow-x-auto rounded-lg" role="region" aria-label="Cohorts" tabIndex={0}>
      <table ref={tableRef} className="w-full min-w-[640px] border-separate text-[13px]" style={{ borderSpacing: 2 }}>
        <caption className="sr-only">Share of each cohort with paid access, by months since their first purchase</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-[1] bg-card px-2 py-1.5 text-left font-medium text-muted-foreground">Cohort</th>
            <th scope="col" className="px-2 py-1.5 text-right font-medium text-muted-foreground">Students</th>
            {Array.from({ length: months }, (_, i) => (
              <th key={i} scope="col" className="px-1 py-1.5 text-center font-medium text-muted-foreground"><span aria-hidden="true">{i + 1}</span><span className="sr-only">Month {i + 1}</span></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <th scope="row" className="sticky left-0 z-[1] whitespace-nowrap bg-card px-2 py-1 text-left font-medium">
                {onOpen
                  ? <button type="button" onClick={() => onOpen(r.month)} className="rounded-sm underline-offset-4 hover:text-primary hover:underline">{monthLabel(r.month)}</button>
                  : monthLabel(r.month)}
              </th>
              <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{r.students}</td>
              {r.cells.map((c) => {
                const step = c.rate === null ? -1 : cohortStep(c.rate)
                return (
                  <td
                    key={c.k}
                    title={c.rate === null ? 'Not reached yet' : `${c.retained} of ${plural(c.students, 'student')} still had paid access ${c.k} ${c.k === 1 ? 'month' : 'months'} after their first purchase`}
                    className={cn('chart-cell h-8 min-w-[40px] rounded-[4px] px-1 text-center font-medium tabular-nums', c.rate !== null && 'chart-lift', c.rate === null && 'text-muted-foreground/50')}
                    style={step >= 0 ? { background: seqColor(step), color: seqInk(step) } : undefined}
                  >
                    {c.rate === null ? <span aria-label="Not reached yet">·</span> : `${Math.round(c.rate)}%`}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
