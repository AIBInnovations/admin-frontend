// Weekly live sessions (round 6). Mirrors backend/src/utils/sessionSchedule.js
// for the editor's live preview and the clash check; the server derives and
// validates the stored times itself. India time is a fixed +05:30.

export interface SessionRepeat {
  weekly: true
  /** 0 = Sunday ... 6 = Saturday, India time */
  days: number[]
  /** 'HH:mm' India time */
  start_time: string
  /** 'HH:mm' India time; earlier than start_time = ends the next day */
  end_time: string
  /** A class may run this long past end_time (0 to 120) */
  overtime_minutes: number
  /** 'YYYY-MM-DD', first date a class may start on */
  starts_on: string
  /** 'YYYY-MM-DD', last date a class may start on */
  ends_on: string
}

export interface WeeklyClass { number: number; start: Date; end: Date; closes: Date }

const MIN = 60_000
const DAY = 24 * 60 * MIN
const IST = 330 * MIN
export const MAX_CLASS_MINUTES = 12 * 60
export const MAX_OVERTIME = 120
export const MAX_RANGE_DAYS = 366
export const MAX_SESSION_MINUTES = 12 * 60

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** Chips and labels read Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (n: number) => String(n).padStart(2, '0')

export function parseTime(v: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec((v || '').trim())
  if (!m) return null
  const h = Number(m[1]); const mi = Number(m[2])
  return h > 23 || mi > 59 ? null : h * 60 + mi
}

export function parseDay(v: string | null | undefined): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((v || '').trim())
  if (!m) return null
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(t)
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) return null
  return Math.round(t / DAY)
}

export const dayString = (n: number) => new Date(n * DAY).toISOString().slice(0, 10)
const weekdayOfDay = (n: number) => new Date(n * DAY).getUTCDay()

/** India-time parts of an instant. */
export function istParts(d: Date | string) {
  const t = new Date(new Date(d).getTime() + IST)
  return { year: t.getUTCFullYear(), month: t.getUTCMonth(), day: t.getUTCDate(), weekday: t.getUTCDay(), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() }
}

/** Minutes of one class; 0 when start equals end. */
export function classLength(start: number, end: number): number {
  if (start === end) return 0
  return end > start ? end - start : end + 24 * 60 - start
}

/** "7:00 PM" */
export function clock(minutes: number): string {
  const t = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(t / 60)
  return `${h % 12 || 12}:${pad(t % 60)} ${h < 12 ? 'AM' : 'PM'}`
}

/** "Wed 18 Nov" (with the year when it is not this year, or when asked). */
export function shortDate(d: Date | string, withYear = false): string {
  const p = istParts(d)
  const year = withYear || p.year !== istParts(new Date()).year ? ` ${p.year}` : ''
  return `${DAY_SHORT[p.weekday]} ${p.day} ${MONTHS[p.month]}${year}`
}

export function joinNames(names: string[], word = 'and'): string {
  if (names.length <= 1) return names[0] || ''
  return `${names.slice(0, -1).join(', ')} ${word} ${names[names.length - 1]}`
}

function compile(r: Partial<SessionRepeat> | null | undefined) {
  if (!r || r.weekly !== true) return null
  const days = [...new Set((r.days || []).map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  const start = parseTime(r.start_time); const end = parseTime(r.end_time)
  const first = parseDay(r.starts_on); const last = parseDay(r.ends_on)
  if (!days.length || start === null || end === null || first === null || last === null || last < first) return null
  const length = classLength(start, end)
  if (!length) return null
  const ot = Number(r.overtime_minutes)
  return { days: new Set(days), dayList: days, start, end, length, overtime: Number.isInteger(ot) && ot >= 0 && ot <= MAX_OVERTIME ? ot : 0, first, last }
}

/** Every class of the series (capped at 400, a range is at most 366 days). */
export function listClasses(r: Partial<SessionRepeat> | null | undefined): WeeklyClass[] {
  const c = compile(r)
  if (!c || c.last - c.first > MAX_RANGE_DAYS) return []
  const out: WeeklyClass[] = []
  for (let n = c.first; n <= c.last && out.length < 400; n += 1) {
    if (!c.days.has(weekdayOfDay(n))) continue
    const start = new Date(n * DAY + c.start * MIN - IST)
    const end = new Date(start.getTime() + c.length * MIN)
    out.push({ number: out.length + 1, start, end, closes: new Date(end.getTime() + c.overtime * MIN) })
  }
  return out
}

/** "Every Wednesday, 7:00 PM to 9:00 PM" (null when incomplete). */
export function scheduleLabel(r: Partial<SessionRepeat> | null | undefined): string | null {
  const c = compile(r)
  if (!c) return null
  const days = WEEK_ORDER.filter((d) => c.days.has(d))
  const text = days.length === 7 ? 'day' : joinNames(days.map((d) => DAY_NAMES[d]))
  return `Every ${text}, ${clock(c.start)} to ${clock(c.end)}${c.end <= c.start ? ' (next day)' : ''}`
}

/** "May run until 10:00 PM", or null without overtime. */
export function overtimeLabel(r: Partial<SessionRepeat> | null | undefined): string | null {
  const c = compile(r)
  if (!c || !c.overtime) return null
  const until = c.start + c.length + c.overtime
  return `May run until ${clock(until)}${until >= 1440 ? ' (next day)' : ''}`
}

/** "9 classes, Wed 18 Nov to Wed 13 Jan, 7:00 PM to 9:00 PM" */
export function previewText(r: Partial<SessionRepeat> | null | undefined): string | null {
  const classes = listClasses(r)
  const c = compile(r)
  if (!c || !classes.length) return null
  const n = classes.length
  const span = n === 1 ? shortDate(classes[0].start) : `${shortDate(classes[0].start)} to ${shortDate(classes[n - 1].start)}`
  return `${n} ${n === 1 ? 'class' : 'classes'}, ${span}, ${clock(c.start)} to ${clock(c.end)}${c.end <= c.start ? ' (next day)' : ''}`
}

/** The class running now (or in its overtime), else the next; null when the series is over. */
export function currentOrNext(r: Partial<SessionRepeat> | null | undefined, now = Date.now()): WeeklyClass | null {
  return listClasses(r).find((c) => c.closes.getTime() > now) ?? null
}

/** Client-side check of the repeat inputs, field by field (the server checks again). */
export function repeatProblems(r: Partial<SessionRepeat>): Partial<Record<'days' | 'start_time' | 'end_time' | 'overtime_minutes' | 'starts_on' | 'ends_on', string>> {
  const out: ReturnType<typeof repeatProblems> = {}
  if (!r.days || !r.days.length) out.days = 'Choose at least one day'
  const s = parseTime(r.start_time); const e = parseTime(r.end_time)
  if (s === null) out.start_time = 'Class start time is required'
  if (e === null) out.end_time = 'Class end time is required'
  if (s !== null && e !== null) {
    const len = classLength(s, e)
    if (!len) out.end_time = 'The class must end at a different time than it starts'
    else if (len > MAX_CLASS_MINUTES) out.end_time = 'One class can be at most 12 hours. An end time earlier than the start ends the next day.'
  }
  const ot = Number(r.overtime_minutes)
  if (r.overtime_minutes !== undefined && r.overtime_minutes !== null && (!Number.isInteger(ot) || ot < 0 || ot > MAX_OVERTIME)) {
    out.overtime_minutes = `Enter 0 to ${MAX_OVERTIME} minutes`
  }
  const a = parseDay(r.starts_on); const b = parseDay(r.ends_on)
  if (a === null) out.starts_on = 'First date is required'
  if (b === null) out.ends_on = 'Last date is required'
  if (a !== null && b !== null) {
    if (b < a) out.ends_on = 'The last date must be on or after the first date'
    else if (b - a > MAX_RANGE_DAYS) out.ends_on = `A weekly series can run for at most ${MAX_RANGE_DAYS} days`
    else if (!out.days && !out.start_time && !out.end_time && !listClasses({ ...r, weekly: true } as SessionRepeat).length) {
      out.days = 'None of the chosen days falls between the first and last date'
    }
  }
  return out
}

/** Busy intervals of a session for the clash check: each class, or the stored span. */
export function busyIntervals(s: { repeat?: SessionRepeat | null; scheduled_start_time: string; scheduled_end_time: string }): Array<[number, number]> {
  if (s.repeat?.weekly) return listClasses(s.repeat).map((c) => [c.start.getTime(), c.end.getTime()])
  return [[new Date(s.scheduled_start_time).getTime(), new Date(s.scheduled_end_time).getTime()]]
}

/** Whether two sorted interval lists overlap anywhere. */
export function overlaps(a: Array<[number, number]>, b: Array<[number, number]>): boolean {
  let i = 0; let j = 0
  while (i < a.length && j < b.length) {
    if (a[i][0] < b[j][1] && b[j][0] < a[i][1]) return true
    if (a[i][1] <= b[j][1]) i += 1
    else j += 1
  }
  return false
}
