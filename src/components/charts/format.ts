import { formatCount, formatINR } from '@/lib/format'

export { formatCount, formatINR }

/** Axis and label money: ₹45K, ₹1.2L, ₹3.4Cr. Full rupees below 10,000. */
export function compactINR(n: number): string {
  const sign = n < 0 ? '-' : ''
  const v = Math.abs(n)
  const cut = (x: number) => (x >= 100 ? Math.round(x) : x >= 10 ? Math.round(x * 10) / 10 : Math.round(x * 100) / 100).toString()
  if (v >= 9_999_500) return `${sign}₹${cut(v / 1e7)}Cr`
  if (v >= 99_950) return `${sign}₹${cut(v / 1e5)}L`
  if (v >= 9_995) return `${sign}₹${cut(v / 1e3)}K`
  return `${sign}₹${Math.round(v).toLocaleString('en-IN')}`
}

export function compactCount(n: number): string {
  const v = Math.abs(n)
  if (v >= 1e5) return `${(Math.round(n / 1e4) / 10).toString()}L`
  if (v >= 1e4) return `${(Math.round(n / 1e2) / 10).toString()}K`
  return Number.isInteger(n) ? n.toLocaleString('en-IN') : (Math.round(n * 10) / 10).toString()
}

export const plural = (n: number, one: string, many = `${one}s`) => `${formatCount(n)} ${n === 1 ? one : many}`

/** 0, 1, 2, 5 x 10^k steps. Always starts at 0; whole numbers for counts. */
export function niceTicks(max: number, count = 5, whole = false): number[] {
  if (!(max > 0)) return whole ? [0, 1] : [0]
  const raw = max / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw - 1e-9 && (!whole || Number.isInteger(s))) ?? Math.ceil(raw)
  const s = whole ? Math.max(1, Math.ceil(step)) : step
  const out: number[] = []
  for (let v = 0; v < max + s - 1e-9; v += s) out.push(Math.round(v * 1e6) / 1e6)
  return out
}

// ── Bucket labels. Days arrive as YYYY-MM-DD calendar days (IST). ──────────
const utc = (day: string) => new Date(`${day}T00:00:00Z`)
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', ...o })
const dM = fmt({ day: 'numeric', month: 'short' })
const dMy = fmt({ day: 'numeric', month: 'short', year: 'numeric' })
const wdM = fmt({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const my = fmt({ month: 'short', year: '2-digit' })
const mY = fmt({ month: 'long', year: 'numeric' })

export function dayLabel(day: string): string { return dMy.format(utc(day)) }

export function spanLabel(from: string, to: string): string {
  if (from === to) return dMy.format(utc(from))
  if (from.slice(0, 7) === to.slice(0, 7)) return `${Number(from.slice(8))} to ${dMy.format(utc(to))}`
  const sameYear = from.slice(0, 4) === to.slice(0, 4)
  return `${(sameYear ? dM : dMy).format(utc(from))} to ${dMy.format(utc(to))}`
}

/** Under the axis. */
export function tickLabel(b: { from: string; key?: string }, granularity: string): string {
  if (granularity === 'year') return b.from.slice(0, 4)
  if (granularity === 'month') return my.format(utc(b.from))
  return dM.format(utc(b.from))
}

/** In the tooltip and the table. */
export function bucketLabel(b: { from: string; to: string; partial?: boolean }, granularity: string): string {
  if (granularity === 'day') return wdM.format(utc(b.from))
  if (granularity === 'week') return spanLabel(b.from, b.to)
  if (granularity === 'month') return b.partial ? spanLabel(b.from, b.to) : mY.format(utc(b.from))
  return b.partial ? spanLabel(b.from, b.to) : b.from.slice(0, 4)
}

export const PER: Record<string, string> = { day: 'per day', week: 'per week', month: 'per month', year: 'per year' }

/** Percent change, or null when there is nothing to compare with. */
export function change(now: number, before: number | null | undefined): number | null {
  if (before === null || before === undefined) return null
  if (before === 0) return now === 0 ? 0 : null
  return ((now - before) / before) * 100
}

// Times are always IST, whatever the admin's computer is set to.
const istDayFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })
const istTimeFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const safe = (f: Intl.DateTimeFormat, v: string | null | undefined) => {
  if (!v) return 'Not set'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? 'Not set' : f.format(d)
}
export const istDay = (v: string | null | undefined) => safe(istDayFmt, v)
export const istDayTime = (v: string | null | undefined) => safe(istTimeFmt, v)

/** Money on a figure card: exact up to ₹9,99,999, then ₹12.3L or ₹3.4Cr (the exact amount goes in a title). */
export function figureINR(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Math.abs(n) >= 1_000_000 ? compactINR(n) : formatINR(n, { whole: true })
}

/** Signed money change: +₹1.2L, -₹45K. */
export function signedINR(n: number): string {
  if (!n) return '₹0'
  return `${n > 0 ? '+' : '-'}${compactINR(Math.abs(n))}`
}

/** Percent with one decimal below 10. */
export function percent(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const v = Math.abs(n) >= 10 ? Math.round(n) : Math.round(n * 10) / 10
  return `${v}%`
}

// ── Day of the week and hour, IST ─────────────────────────────────────────
export const DOW_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const DOW_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
/** 0 -> "12 am", 13 -> "1 pm". */
export function hourName(h: number): string {
  const x = ((h % 24) + 24) % 24
  return `${x % 12 === 0 ? 12 : x % 12} ${x < 12 ? 'am' : 'pm'}`
}
/** "8 pm to 9 pm", "6 pm to 9 pm" for a span of hours (both included). */
export function hourSpan(a: number, b = a): string {
  return `${hourName(a)} to ${hourName(b + 1)}`
}
/** "Nov 2026" from "2026-11". */
export function monthLabel(ym: string): string {
  const d = new Date(`${ym}-01T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? ym : new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', month: 'short', year: 'numeric' }).format(d)
}
