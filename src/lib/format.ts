// Shared display formatters. Everything goes through Intl so numbers, money
// and dates read the same on every page (en-IN grouping: 1,23,456).

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 2 })
const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const count = new Intl.NumberFormat('en-IN')
// PGME runs on India time: an expiry or a payment reads the same wherever the
// admin's laptop thinks it is.
const IST = 'Asia/Kolkata'
const day = new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' })
const dayTime = new Intl.DateTimeFormat('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export function formatINR(n: number | null | undefined, opts: { whole?: boolean } = {}): string {
  if (n == null || Number.isNaN(Number(n))) return '—'
  const v = Number(n)
  // Whole rupees print without paise (₹7,670); anything else gets both digits (₹2,399.80)
  return (opts.whole || Number.isInteger(v) ? inrWhole : inr).format(v)
}

export function formatCount(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return count.format(Number(n))
}

export function formatDay(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : day.format(d)
}

export function formatDayTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : dayTime.format(d)
}

/**
 * Human length of a subscription tier. Packages store days; people think in
 * months. 180 → "6 months", 365 → "12 months", 30 → "1 month", 45 → "45 days".
 * Uses 30-day months (how PGME tiers are set up: 180 days = 6 months); any
 * length that is not a whole number of those or of years is shown in days.
 */
export function formatDuration(days: number | null | undefined): string {
  if (!days || days <= 0) return '—'
  if (days % 365 === 0) {
    const m = (days / 365) * 12
    return `${m} months`
  }
  if (days % 30 === 0) {
    const m = days / 30
    return `${m} month${m === 1 ? '' : 's'}`
  }
  return `${days} days`
}

// ── IST calendar days ─────────────────────────────────────────────────
// PGME runs on India time. A date picker gives "2026-11-30"; stored as-is
// that is midnight UTC = 05:30 IST, so a coupon "valid until 30 Nov" would
// stop working at 5:30 in the morning of the 30th. These two helpers make a
// picked day mean the whole day in IST.

const istDayParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })

/** ISO timestamp → "YYYY-MM-DD" as the calendar day in IST (for <input type="date">). */
export function toIstDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : istDayParts.format(d)
}

/** "YYYY-MM-DD" → the last millisecond of that day in IST, as an ISO string. */
export function endOfIstDay(dateInput: string): string {
  return new Date(`${dateInput}T23:59:59.999+05:30`).toISOString()
}

/**
 * What a package purchase is called in admin lists. The owner treats every
 * tier as its own subscription ("6 months itself is a different entity"), so
 * a package purchase reads "TECOM Theory Package · 6 months subscription".
 * Falls back to the tier's name when the length is unknown (older rows), and
 * to the bare item name for anything that is not a tiered package.
 */
export function subscriptionLabel(
  itemName: string | null | undefined,
  tier?: { tier_duration_days?: number | null; tier_name?: string | null } | null,
): string {
  const base = itemName || 'Unknown item'
  if (tier?.tier_duration_days) return `${base} · ${formatDuration(tier.tier_duration_days)} subscription`
  if (tier?.tier_name) return `${base} · ${tier.tier_name}`
  return base
}
