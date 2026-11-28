/** Release times are picked and shown in India time, whatever the browser is set to. */
const IST = '+05:30'
const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** ISO -> "2026-11-30T18:30" for a datetime-local input, in IST. */
export function isoToLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = Object.fromEntries(parts.formatToParts(d).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

/** "2026-11-30T18:30" read as IST -> ISO, or null. */
export function localInputToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(`${local.length === 16 ? `${local}:00` : local}${IST}`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
