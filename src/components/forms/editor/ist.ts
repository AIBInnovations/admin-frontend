// PGME runs on India time. Every date and time shown or typed in the session,
// workshop and content editors is IST, whatever the admin's computer is set to.

const TZ = 'Asia/Kolkata'

const inputParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
const dayFmt = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' })
const weekFmt = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, weekday: 'short' })
const weekday = (d: Date) => `${weekFmt.format(d)}, ${dayFmt.format(d)}`
const timeFmt = new Intl.DateTimeFormat('en-IN', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true })

function parse(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** ISO timestamp to the values of <input type="date"> and <input type="time">, in IST. */
export function toIstInputs(value: string | Date | null | undefined): { date: string; time: string } {
  const d = parse(value)
  if (!d) return { date: '', time: '' }
  const p = Object.fromEntries(inputParts.formatToParts(d).map((x) => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }
}

/** Date and time inputs, read as IST. Null while either is empty or invalid. */
export function fromIstInputs(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}/.test(time)) return null
  return parse(`${date}T${time.slice(0, 5)}:00+05:30`)
}

/** The date input value `by` days away. */
export function shiftDate(date: string, by: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return ''
  const d = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return ''
  d.setUTCDate(d.getUTCDate() + by)
  return d.toISOString().slice(0, 10)
}

/** "28 Nov 2026" */
export function istDay(value: string | Date | null | undefined): string {
  const d = parse(value)
  return d ? dayFmt.format(d) : 'Not set'
}

/** "7:00 pm" */
export function istTime(value: string | Date | null | undefined): string {
  const d = parse(value)
  return d ? timeFmt.format(d) : 'Not set'
}

/** "28 Nov 2026, 7:00 pm" */
export function istDateTime(value: string | Date | null | undefined): string {
  const d = parse(value)
  return d ? `${dayFmt.format(d)}, ${timeFmt.format(d)}` : 'Not set'
}

/** "Sat, 28 Nov 2026" */
export function istWeekday(value: string | Date | null | undefined): string {
  const d = parse(value)
  return d ? weekday(d) : 'Not set'
}

/** "Sat, 28 Nov 2026, 7:00 pm to 9:00 pm", naming the second day only when it differs. */
export function istSpan(start: string | Date | null | undefined, end: string | Date | null | undefined): string {
  const a = parse(start)
  const b = parse(end)
  if (!a) return 'Not scheduled'
  if (!b) return `${weekday(a)}, ${timeFmt.format(a)}`
  const sameDay = toIstInputs(a).date === toIstInputs(b).date
  return sameDay
    ? `${weekday(a)}, ${timeFmt.format(a)} to ${timeFmt.format(b)}`
    : `${weekday(a)}, ${timeFmt.format(a)} to ${weekday(b)}, ${timeFmt.format(b)}`
}

/** "45 min", "2 h", "1 h 30 min" */
export function minutesLabel(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return 'Not set'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/** "in 3 days", "in 2 h", "started 20 min ago", "ended 4 days ago" */
export function whenLabel(start: string | Date | null | undefined, end: string | Date | null | undefined, now = Date.now()): string {
  const a = parse(start)?.getTime()
  const b = parse(end)?.getTime()
  if (a === undefined) return ''
  const span = (ms: number) => {
    const min = Math.max(1, Math.round(ms / 60000))
    if (min < 60) return `${min} min`
    const h = Math.round(min / 60)
    if (h < 48) return `${h} h`
    const d = Math.round(h / 24)
    return `${d} days`
  }
  if (now < a) return `in ${span(a - now)}`
  if (b !== undefined && now > b) return `ended ${span(now - b)} ago`
  return `started ${span(now - a)} ago`
}

/** A stored date (midnight UTC, or any time) as the calendar day the admin picked. */
export function storedDay(value: string | null | undefined): string {
  if (!value) return ''
  return /T00:00:00(\.000)?Z$/.test(value) ? value.slice(0, 10) : toIstInputs(value).date
}

/** Whether a stored timestamp is the minute shown in the inputs. */
export function sameMinute(a: string | Date | null | undefined, b: Date | null): boolean {
  const x = parse(a)
  return !!x && !!b && Math.floor(x.getTime() / 60000) === Math.floor(b.getTime() / 60000)
}
