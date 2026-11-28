import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/** Calendar days in IST, both inclusive, as YYYY-MM-DD. Empty = no limit. */
export interface DateRange { from: string; to: string; preset: string }

const istParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
const label = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })

export const istToday = () => istParts.format(new Date())
export function shiftDay(day: string, by: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + by)
  return d.toISOString().slice(0, 10)
}
const monthStart = (day: string) => `${day.slice(0, 7)}-01`
function prevMonth(day: string): [string, string] {
  const end = shiftDay(monthStart(day), -1)
  return [monthStart(end), end]
}
/** Indian financial year (1 April to 31 March) containing the day. */
function financialYear(day: string): [string, string] {
  const y = Number(day.slice(0, 4))
  const start = Number(day.slice(5, 7)) >= 4 ? y : y - 1
  return [`${start}-04-01`, day]
}

export const PRESETS: { id: string; name: string; range: () => [string, string] }[] = [
  { id: 'today', name: 'Today', range: () => [istToday(), istToday()] },
  { id: 'yesterday', name: 'Yesterday', range: () => [shiftDay(istToday(), -1), shiftDay(istToday(), -1)] },
  { id: '7d', name: 'Last 7 days', range: () => [shiftDay(istToday(), -6), istToday()] },
  { id: '30d', name: 'Last 30 days', range: () => [shiftDay(istToday(), -29), istToday()] },
  { id: 'month', name: 'This month', range: () => [monthStart(istToday()), istToday()] },
  { id: 'last_month', name: 'Last month', range: () => prevMonth(istToday()) },
  { id: '90d', name: 'Last 90 days', range: () => [shiftDay(istToday(), -89), istToday()] },
  { id: 'year', name: 'This year', range: () => [`${istToday().slice(0, 4)}-01-01`, istToday()] },
  { id: 'fy', name: 'This financial year', range: () => financialYear(istToday()) },
  { id: 'all', name: 'All time', range: () => ['', ''] },
]

export function presetRange(id: string): DateRange {
  const preset = PRESETS.find((p) => p.id === id) ?? PRESETS[3]
  const [from, to] = preset.range()
  return { from, to, preset: preset.id }
}

const isDay = (v: string | null) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))

/** Reads a range from the URL (?range=30d, or ?from=&to=), ignoring bad values. */
export function rangeFromParams(params: URLSearchParams, fallback = '30d'): DateRange {
  const from = params.get('from'); const to = params.get('to')
  if (isDay(from) && isDay(to) && from! <= to!) return { from: from!, to: to!, preset: 'custom' }
  return presetRange(PRESETS.some((p) => p.id === params.get('range')) ? params.get('range')! : fallback)
}

/** Writes a range into URL params, for a shareable, Back-able view. */
export function rangeToParams(range: DateRange, params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params)
  ;['range', 'from', 'to'].forEach((k) => next.delete(k))
  if (range.preset === 'custom') { next.set('from', range.from); next.set('to', range.to) }
  else next.set('range', range.preset)
  return next
}

export function rangeLabel(range: DateRange): string {
  if (range.preset !== 'custom') return PRESETS.find((p) => p.id === range.preset)?.name ?? 'Custom'
  const a = label.format(new Date(range.from)); const b = label.format(new Date(range.to))
  return range.from === range.to ? a : `${a} – ${b}`
}

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
  /** Hide presets that make no sense here (e.g. ['all']). */
  exclude?: string[]
  align?: 'start' | 'end'
  className?: string
}

export function DateRangeFilter({ value, onChange, exclude = [], align = 'start', className }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(value.from)
  const [to, setTo] = useState(value.to)
  const today = istToday()
  useEffect(() => { if (open) { setFrom(value.from); setTo(value.to) } }, [open, value.from, value.to])

  const problem = useMemo(() => {
    if (!isDay(from) || !isDay(to)) return 'Pick both dates.'
    if (from > to) return 'The start is after the end.'
    if (from > today) return 'The start is in the future.'
    return null
  }, [from, to, today])

  const field = 'h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15'
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('h-9 justify-between gap-2 bg-card font-normal', className)}>
          <CalendarDays aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{rangeLabel(value)}</span>
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} collisionPadding={12} className="w-[min(340px,calc(100vw-1.5rem))] p-0">
        <div role="listbox" aria-label="Date range" className="grid grid-cols-2 gap-0.5 p-2">
          {PRESETS.filter((p) => !exclude.includes(p.id)).map((p) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={value.preset === p.id}
              onClick={() => { onChange(presetRange(p.id)); setOpen(false) }}
              className={cn('flex h-9 items-center justify-between rounded-md px-2.5 text-left text-[13px] transition-colors hover:bg-muted', value.preset === p.id && 'bg-accent font-medium text-accent-foreground')}
            >
              {p.name}
              {value.preset === p.id && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
        <form
          className="space-y-3 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (problem) return
            onChange({ from, to, preset: 'custom' })
            setOpen(false)
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-muted-foreground">From<input type="date" max={today} value={from} onChange={(e) => setFrom(e.target.value)} className={cn(field, 'text-foreground')} /></label>
            <label className="space-y-1 text-xs text-muted-foreground">To<input type="date" min={from || undefined} max={today} value={to} onChange={(e) => setTo(e.target.value)} className={cn(field, 'text-foreground')} /></label>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{problem && (from || to) ? problem : 'Dates are in IST, both included.'}</p>
            <Button type="submit" size="sm" disabled={!!problem}>Apply</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
