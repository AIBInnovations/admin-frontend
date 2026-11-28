import type { LiveSession, Enrollee } from '@/services/liveSessions.service'

/**
 * Who can join a live session (backend: LiveSession.access_mode and
 * services/sessionAccess.service.js). "Visible to" only decides who sees it.
 */
export type AccessMode = 'everyone' | 'subscribers_free' | 'subscribers_only'

export interface AccessPackage {
  _id: string
  name: string | null
  package_type: string | null
  subject: string | null
  is_active?: boolean
  publish_status?: string | null
  deleted?: boolean
}

export interface AccessSummary {
  confirmed: number
  by_type: Record<string, number>
  not_eligible: number
}

/** The admin API's session, with the additive access fields. */
export type GatedSession = LiveSession & {
  workshop_id?: string | null
  access_mode?: AccessMode
  access_package_ids?: string[]
  access_packages?: AccessPackage[]
  access_rule_text?: string
  access_summary?: AccessSummary | null
}

export type GatedEnrollee = Omit<Enrollee, 'enrollment_type'> & {
  enrollment_type: Enrollee['enrollment_type'] | 'subscription'
  access_package_name?: string | null
}

export const ACCESS_MODES: AccessMode[] = ['everyone', 'subscribers_free', 'subscribers_only']

export const modeOf = (s: Partial<GatedSession> | null | undefined): AccessMode =>
  s && ACCESS_MODES.includes(s.access_mode as AccessMode) ? (s.access_mode as AccessMode) : 'everyone'

export const packageIdsOf = (s: Partial<GatedSession> | null | undefined): string[] =>
  (s?.access_package_ids || []).map((p) => (typeof p === 'object' && p ? (p as { _id: string })._id : String(p)))

/** Short list marker; null for Everyone. */
export const ACCESS_MARKER: Record<AccessMode, string | null> = {
  everyone: null,
  subscribers_free: 'Free for subscribers',
  subscribers_only: 'Subscribers only',
}

const rupees = (n: number | null | undefined) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

/** "A", "A and B", "A, B and C". */
export function joinNames(names: string[]): string {
  const list = names.filter(Boolean)
  if (list.length <= 1) return list[0] || ''
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

/** The rule in one sentence, as students will experience it. Mirrors the backend's describeRule. */
export function accessSentence(mode: AccessMode, packageNames: string[], price: number | null | undefined, isFree: boolean): string {
  const names = joinNames(packageNames)
  if (mode === 'subscribers_free') {
    return `${names || 'Package'} subscribers join free. Everyone else pays ${price && price > 0 ? rupees(price) : 'the session price'}.`
  }
  if (mode === 'subscribers_only') {
    return `Only ${names || 'package'} subscribers can register and join. Nobody can buy a seat.`
  }
  return !isFree && price && price > 0 ? `Everyone can join after paying ${rupees(price)}.` : 'Everyone can join for free.'
}

/** Label for one enrollment's type in the attendee list. */
export function enrollmentTypeLabel(e: Pick<GatedEnrollee, 'enrollment_type' | 'access_package_name'>): string {
  if (e.enrollment_type === 'subscription') {
    return e.access_package_name ? `Included with ${e.access_package_name}` : 'Included with a subscription'
  }
  // Existing types keep their existing labels ("Paid", "Free", "Admin override")
  return (e.enrollment_type || 'Not set').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}
