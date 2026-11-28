import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import './charts.css'

interface ProgressRingProps {
  /** 0 to 1. Clamped; a value above 1 draws a full ring. */
  value: number
  /** What the share is of, for screen readers: "62% of all students used the app". */
  label: string
  size?: number
  stroke?: number
  /** Printed in the middle (usually the percent). Leave out on small rings. */
  children?: ReactNode
  /** The fill colour; the track is a lighter step of the same hue. */
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'estimate'
  className?: string
}

const TONE: Record<NonNullable<ProgressRingProps['tone']>, { fill: string; track: string }> = {
  primary: { fill: 'var(--chart-primary)', track: 'var(--chart-track)' },
  estimate: { fill: 'var(--chart-estimate)', track: 'var(--chart-estimate-wash)' },
  success: { fill: 'hsl(var(--success))', track: 'hsl(var(--success-soft))' },
  warning: { fill: 'hsl(var(--warning))', track: 'hsl(var(--warning-soft))' },
  danger: { fill: 'hsl(var(--danger))', track: 'hsl(var(--danger-soft))' },
}

/**
 * A share of a whole as a ring, only where a real proportion exists. The
 * number always sits beside or inside it as text, so the ring is never the
 * only way to read the value.
 */
export function ProgressRing({ value, label, size = 40, stroke = 4, children, tone = 'primary', className }: ProgressRingProps) {
  const share = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const { fill, track } = TONE[tone]
  return (
    <span role="img" aria-label={label} className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: size, height: size }}>
      <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {share > 0 && (
          <circle
            className="chart-ring"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={fill}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(c * share).toFixed(2)} ${c.toFixed(2)}`}
          />
        )}
      </svg>
      {children !== undefined && <span aria-hidden="true" className="relative text-[11px] font-semibold tabular-nums leading-none text-foreground">{children}</span>}
    </span>
  )
}
