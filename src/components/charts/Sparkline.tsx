import { useId, type ReactNode } from 'react'
import { areaPath, linePath } from './curve'
import { useWidth } from './useSize'
import './charts.css'

interface SparklineProps {
  values: number[]
  /** Fixed width; ignored with `fluid`. */
  width?: number
  height?: number
  /** Take the width of the space it is given (a stat tile); hidden when there is too little. */
  fluid?: boolean
  /** Shown instead when every value is zero. */
  empty?: ReactNode
  /** Spoken (and the hover title): what the line is, e.g. "Collected per week, last 12 weeks". */
  label?: string
  /** Measure from zero (default). Off for a running total, where the shape is the story. */
  zero?: boolean
}

const MIN_FLUID = 40

/** Shape of a trend: a smooth line with a soft wash and a ringed end dot. The numbers beside it say the same thing. */
export function Sparkline({ values, width = 88, height = 24, fluid, empty = 'No sales', label, zero = true }: SparklineProps) {
  const { ref, width: measured } = useWidth<HTMLSpanElement>()
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const max = Math.max(...values, 0)
  const min = zero ? 0 : Math.min(...values)
  const w = fluid ? Math.min(measured, 112) : width
  if (values.length < 2 || max <= 0) {
    return fluid
      ? <span ref={ref} className="block min-w-0 flex-1" />
      : <span aria-hidden="true" className="inline-block text-xs text-muted-foreground" style={{ width }}>{empty}</span>
  }
  const pad = 4
  const x = (i: number) => pad + ((w - pad * 2) * i) / (values.length - 1)
  const y = (v: number) => height - 3 - ((v - min) / Math.max(1e-9, max - min)) * (height - pad - 3)
  const last = values.length - 1
  const svg = w >= (fluid ? MIN_FLUID : 2) && (
    <svg aria-hidden="true" width={w} height={height} className="block overflow-visible">
      <defs>
        <linearGradient id={`${uid}-spark`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--chart-primary)', stopOpacity: 'var(--chart-wash-top)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--chart-primary)', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={areaPath(values, x, y, height)} fill={`url(#${uid}-spark)`} />
      <path d={linePath(values, x, y)} fill="none" stroke="var(--chart-primary)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last)} cy={y(values[last])} r={3} fill="var(--chart-primary)" stroke="var(--chart-surface)" strokeWidth={1.5} />
    </svg>
  )
  if (!fluid) return svg || null
  return (
    <span ref={ref} className="flex min-w-0 flex-1 justify-end" title={label}>
      {svg}
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}
