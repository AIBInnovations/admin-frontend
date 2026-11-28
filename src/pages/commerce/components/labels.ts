import { formatDuration, formatINR } from '@/lib/format'
import type { Tone } from '@/components/common/detail'
import type { PurchaseType } from '@/services/payments.service'
import type { CaseKind, CaseStatus } from '@/services/paymentCases.service'

// Purchases are evidence, so every time is shown in IST wherever the admin is.
const day = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })
const dayTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const valid = (iso: string | null | undefined) => !!iso && !Number.isNaN(Date.parse(iso))

export const istDay = (iso: string | null | undefined) => (valid(iso) ? day.format(new Date(iso!)) : '')
export const istDayTime = (iso: string | null | undefined) => (valid(iso) ? dayTime.format(new Date(iso!)) : '')

export const TYPE_LABEL: Record<PurchaseType, string> = {
  package: 'Package', session: 'Session', workshop: 'Workshop', book: 'Book', ebook: 'eBook', form: 'Form',
}

export const TYPE_OPTIONS = [
  { label: 'Package', value: 'package' },
  { label: 'Session', value: 'session' },
  { label: 'Workshop', value: 'workshop' },
  { label: 'Book', value: 'book' },
  { label: 'eBook', value: 'ebook' },
  { label: 'Form', value: 'form' },
]

export const PAYMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  completed: { label: 'Completed', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  failed: { label: 'Failed', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'info' },
  revoked: { label: 'Revoked', tone: 'neutral' },
}

export const INVOICE_STATUS: Record<string, { label: string; tone: Tone }> = {
  paid: { label: 'Paid', tone: 'success' },
  unpaid: { label: 'Unpaid', tone: 'warning' },
  partially_paid: { label: 'Partially paid', tone: 'info' },
  void: { label: 'Void', tone: 'danger' },
}

export const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'info' },
  processing: { label: 'Processing', tone: 'info' },
  shipped: { label: 'Shipped', tone: 'info' },
  delivered: { label: 'Delivered', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
}

export const ACCESS_STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'success' },
  upcoming: { label: 'Starts later', tone: 'info' },
  expired: { label: 'Ended', tone: 'neutral' },
  ended: { label: 'Event over', tone: 'neutral' },
  revoked: { label: 'Revoked', tone: 'danger' },
  refunded: { label: 'Ended by refund', tone: 'danger' },
  replaced: { label: 'Replaced by an upgrade', tone: 'neutral' },
  inactive: { label: 'Not active', tone: 'neutral' },
  waiting_payment: { label: 'Waiting for payment', tone: 'warning' },
  payment_failed: { label: 'Payment failed', tone: 'danger' },
  held: { label: 'Paid, held for review', tone: 'warning' },
  submitted: { label: 'Form submitted', tone: 'success' },
  ...ORDER_STATUS,
}

export const DISPUTE: Record<'open' | 'won' | 'lost', { label: string; tone: Tone }> = {
  open: { label: 'Dispute open', tone: 'warning' },
  won: { label: 'Dispute won', tone: 'success' },
  lost: { label: 'Dispute lost', tone: 'danger' },
}

export const CASE_KIND: Record<CaseKind, { label: string; explain: string }> = {
  dispute: { label: 'Dispute', explain: 'The student asked their bank to take the payment back.' },
  refund: { label: 'Refund', explain: 'Money returned to the student, or about to be.' },
  coupon_limit: { label: 'Coupon over limit', explain: 'The student paid the discounted price after the coupon had already been used. They have no access yet: approve it, or refund the payment.' },
  duplicate_payment: { label: 'Paid twice', explain: 'The student paid again for something they already own. Refund this payment.' },
  payment_reused: { label: 'Payment used twice', explain: 'This payment already activated another purchase, so this one was not activated.' },
  unmatched_payment: { label: 'Unmatched payment', explain: 'Money was received but no purchase was found for it.' },
}

export const CASE_STATUS: Record<CaseStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'warning' },
  in_progress: { label: 'In progress', tone: 'info' },
  won: { label: 'Won', tone: 'success' },
  lost: { label: 'Lost', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'success' },
  dismissed: { label: 'Dismissed', tone: 'neutral' },
}

export const GATEWAY_LABEL: Record<string, string> = { zoho_payments: 'Zoho Payments', razorpay: 'Razorpay' }

/** "6 months", or the plan's own name when its length is unknown. */
export function planLabel(tier: { duration_days: number | null; name: string | null }): string | null {
  if (tier.duration_days) return `${formatDuration(tier.duration_days)} subscription`
  return tier.name
}

/** Days until a date, as IST calendar days. Negative = past. */
export function daysUntil(iso: string): number {
  const ist = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })
  return Math.round((Date.parse(`${ist.format(new Date(iso))}T00:00:00Z`) - Date.parse(`${ist.format(new Date())}T00:00:00Z`)) / 86400000)
}

/** "Due in 3 days", "Due today", "2 days overdue". */
export function dueLabel(iso: string): { label: string; tone: Tone } {
  const n = daysUntil(iso)
  if (n < 0) return { label: `${-n} day${n === -1 ? '' : 's'} overdue`, tone: 'danger' }
  if (n === 0) return { label: 'Due today', tone: 'danger' }
  return { label: `Due in ${n} day${n === 1 ? '' : 's'}`, tone: n <= 3 ? 'warning' : 'neutral' }
}

export const money = (n: number | null | undefined, currency = 'INR') => (currency === 'INR' ? formatINR(n) : n == null ? '—' : `${currency} ${n.toLocaleString('en-IN')}`)

/** FactGrid in two columns. A `wide` fact spans both (it is three wide by default). */
export const TWO_COLS = 'xl:grid-cols-2 xl:[&>[class*=col-span]]:col-span-2'
