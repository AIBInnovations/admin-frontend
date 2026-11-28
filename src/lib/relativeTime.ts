/**
 * Lightweight relative-time helpers for expiry display. Native Date only
 * (no date lib in this project). Differences are computed in whole calendar
 * days so "expires in 1 day" / "expired 3 days ago" line up with the date shown.
 */

export type ExpiryStatus = 'expired' | 'soon' | 'ok' | 'lifetime'

export interface ExpiryInfo {
  /** Absolute date, e.g. "23 May 2026". */
  absolute: string
  /** Human relative phrase, e.g. "expired 3 days ago" / "expires in 5 days". */
  relative: string
  /** Bucket for colouring: expired (past), soon (<= 7 days), ok (> 7 days), lifetime (no expiry). */
  status: ExpiryStatus
  /** Signed calendar-day difference from today (negative = past). NaN for lifetime. */
  days: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const SOON_THRESHOLD_DAYS = 7

const startOfDay = (d: Date): number => {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy.getTime()
}

/** Absolute date string in the admin's standard format (en-IN, "23 May 2026"). */
export function formatDate(iso: string | Date): string {
  const date = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatExpiry(iso: string | Date | null | undefined): ExpiryInfo {
  // No expiry => lifetime access (ebooks).
  if (iso === null || iso === undefined || iso === '') {
    return { absolute: 'Lifetime', relative: 'Lifetime access', status: 'lifetime', days: NaN }
  }
  const date = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return { absolute: '—', relative: 'No expiry date', status: 'lifetime', days: NaN }
  }

  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / DAY_MS)

  let relative: string
  if (days === 0) relative = 'expires today'
  else if (days === 1) relative = 'expires tomorrow'
  else if (days > 1) relative = `expires in ${days} days`
  else if (days === -1) relative = 'expired yesterday'
  else relative = `expired ${Math.abs(days)} days ago`

  const status: ExpiryStatus = days < 0 ? 'expired' : days <= SOON_THRESHOLD_DAYS ? 'soon' : 'ok'

  return { absolute: formatDate(date), relative, status, days }
}

/** Tailwind classes for an expiry-status badge (matches StatusBadge palette). */
export const EXPIRY_BADGE_CLASS: Record<ExpiryStatus, string> = {
  expired: 'bg-red-100 text-red-700',
  soon: 'bg-amber-100 text-amber-700',
  ok: 'bg-emerald-100 text-emerald-700',
  lifetime: 'bg-teal-100 text-teal-700',
}

const rtf = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' })

/** "2 hours ago", "yesterday", "in 3 days". For moments, not expiry days. */
export function relativeTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return '—'
  const abs = Math.abs(ms)
  if (abs < 60_000) return 'just now'
  if (abs < 3_600_000) return rtf.format(Math.round(ms / 60_000), 'minute')
  if (abs < 86_400_000) return rtf.format(Math.round(ms / 3_600_000), 'hour')
  if (abs < 30 * 86_400_000) return rtf.format(Math.round(ms / 86_400_000), 'day')
  return formatDate(iso)
}
