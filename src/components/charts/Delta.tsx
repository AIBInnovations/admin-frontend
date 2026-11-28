import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { change } from './format'

interface DeltaProps {
  now: number
  before: number | null | undefined
  /** For refunds and low ratings, up is bad. */
  upIsGood?: boolean
  /** Neither direction is good or bad (discounts). */
  neutral?: boolean
  /** Say what it is compared with, for screen readers and long form. */
  versus?: string
  /** A soft pill (the headline of a chart or a figure); plain text otherwise. */
  pill?: boolean
  className?: string
}

/** Change against the previous period: an arrow, a number and words, never colour alone. */
export function Delta({ now, before, upIsGood = true, neutral, versus = 'the previous period', pill, className }: DeltaProps) {
  if (before === null || before === undefined) return null
  const pct = change(now, before)
  const base = cn(
    'inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium tabular-nums',
    pill && 'h-[22px] rounded-full px-2 font-semibold leading-none',
    className,
  )
  if (pct === null) return <span className={cn(base, 'text-muted-foreground', pill && 'bg-muted')}>New<span className="sr-only">, nothing in {versus}</span></span>
  const rounded = Math.abs(pct) >= 10 ? Math.round(pct) : Math.round(pct * 10) / 10
  if (rounded === 0) {
    return <span className={cn(base, 'text-muted-foreground', pill && 'bg-muted')}><Minus aria-hidden="true" className="h-3 w-3" />0%<span className="sr-only"> same as {versus}</span></span>
  }
  const good = rounded > 0 === upIsGood
  const Icon = rounded > 0 ? ArrowUp : ArrowDown
  const shown = Math.abs(rounded) > 999 ? '999%+' : `${Math.abs(rounded)}%`
  const tone = neutral ? 'text-muted-foreground' : good ? 'text-success' : 'text-danger'
  const soft = neutral ? 'bg-muted' : good ? 'bg-success-soft' : 'bg-danger-soft'
  return (
    <span className={cn(base, tone, pill && soft)}>
      <Icon aria-hidden="true" className="h-3 w-3" strokeWidth={pill ? 2.5 : 2} />
      <span className="sr-only">{rounded > 0 ? 'Up ' : 'Down '}</span>{shown}<span className="sr-only"> from {versus}</span>
    </span>
  )
}
