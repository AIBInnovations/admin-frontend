import { useState } from 'react'
import { Legend } from './ChartCard'
import { resolveColor } from './exporting'
import { formatCount, percent } from './format'
import { useChartPicture } from './frame'
import { useWidth } from './useSize'
import './charts.css'

/** `ink` is the label colour inside the block (white unless the block is light). */
export interface Segment { key: string; name: string; value: number; color: string; ink?: string }

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * One whole split into its parts, at a glance: a tall bar of blocks with a 2px
 * gap, each printing its share where it fits, and a legend naming them in
 * order. Hover or focus a block for its name and count.
 */
export function SegmentBar({ parts, unit = 'subscriptions' }: { parts: Segment[]; unit?: string }) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const [on, setOn] = useState<string | null>(null)
  const total = parts.reduce((s, p) => s + p.value, 0)
  const shown = parts.filter((p) => p.value > 0)
  const gaps = Math.max(0, shown.length - 1) * 2
  const px = (v: number) => (total > 0 ? ((width - gaps) * v) / total : 0)

  useChartPicture(() => {
    if (!width) return null
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement
    svg.setAttribute('width', String(width)); svg.setAttribute('height', '28')
    let x = 0
    for (const p of shown) {
      const w = px(p.value)
      const r = document.createElementNS(SVG_NS, 'rect')
      r.setAttribute('x', String(x)); r.setAttribute('width', String(Math.max(1, w))); r.setAttribute('height', '28'); r.setAttribute('rx', '4')
      r.setAttribute('fill', resolveColor(p.color))
      svg.appendChild(r)
      const label = percent((p.value / total) * 100)
      if (w > label.length * 7.5 + 12) {
        const t = document.createElementNS(SVG_NS, 'text')
        t.setAttribute('x', String(x + 8)); t.setAttribute('y', '18'); t.setAttribute('font-size', '12'); t.setAttribute('font-weight', '600'); t.setAttribute('fill', resolveColor(p.ink ?? '#ffffff'))
        t.setAttribute('font-family', "'IBM Plex Sans', system-ui, sans-serif")
        t.textContent = label
        svg.appendChild(t)
      }
      x += w + 2
    }
    return { svg, width, height: 28 }
  })

  const active = shown.find((p) => p.key === on)
  return (
    <div>
      <div ref={ref} className="relative">
        <div className="flex h-7 w-full gap-[2px]" role="list" aria-label={`${formatCount(total)} ${unit}, by outcome`}>
          {width > 0 && shown.map((p) => {
            const w = px(p.value)
            const label = percent((p.value / total) * 100)
            return (
              <span
                key={p.key}
                role="listitem"
                tabIndex={0}
                aria-label={`${p.name}: ${formatCount(p.value)}, ${label}`}
                onPointerEnter={() => setOn(p.key)}
                onPointerLeave={() => setOn(null)}
                onFocus={() => setOn(p.key)}
                onBlur={() => setOn(null)}
                className="chart-grow chart-lift flex h-full items-center overflow-visible rounded-[4px] outline-none first:rounded-l-md last:rounded-r-md"
                style={{ width: Math.max(2, w), background: p.color }}
              >
                {w > label.length * 7.5 + 12 && <span aria-hidden="true" className="whitespace-nowrap px-2 text-xs font-semibold tabular-nums" style={{ color: p.ink ?? '#ffffff' }}>{label}</span>}
              </span>
            )
          })}
        </div>
        {active && (
          <div className="pointer-events-none absolute left-0 top-9 z-10 w-max rounded-lg border border-border bg-popover px-3 py-2 text-[13px] shadow-raised" role="presentation">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><span aria-hidden="true" className="chart-swatch h-2.5 w-2.5 rounded-[3px]" style={{ background: active.color }} />{active.name}</p>
            <p className="mt-0.5 tabular-nums text-muted-foreground"><span className="font-semibold text-foreground">{formatCount(active.value)}</span> of {formatCount(total)}, {percent((active.value / total) * 100)}</p>
          </div>
        )}
      </div>
      <Legend className="mt-3" items={parts.map((p) => ({ key: p.key, name: p.name, color: p.color }))} />
    </div>
  )
}
