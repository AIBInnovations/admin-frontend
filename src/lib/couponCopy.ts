// Plain-language descriptions of a coupon, shared by the list, the editor
// preview and the detail page so all three say the same thing.
import { formatDuration, formatINR, formatDay } from '@/lib/format'
import type { CouponProductType, CouponProductTier } from '@/services/coupons.service'

const TYPE_PLURAL: Record<CouponProductType, string> = {
  package: 'packages',
  session: 'live sessions',
  workshop: 'workshops',
  ebook: 'e-books',
  book: 'physical books',
  form: 'forms',
}

export interface ScopeTarget {
  product_type: CouponProductType
  product_id: string
  tier_ids?: string[]
  label?: string | null
  product_name?: string | null
  tiers?: CouponProductTier[]
}

export interface CouponLike {
  discount_type: 'percentage' | 'flat'
  discount_value: number | null | undefined
  max_discount_cap?: number | null
  applies_to: 'all' | 'type' | 'products' | 'subject'
  applicable_types?: CouponProductType[]
  applicable_subjects?: { _id: string; name: string | null }[]
  applicable_products?: ScopeTarget[]
  min_order_value?: number | null
  max_redemptions?: number | null
  per_user_limit?: number | null
  expiry_at?: string | null
  customer_scope?: 'all' | 'specific'
  applicable_users?: unknown[]
}

export function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] || ''
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function discountHeadline(c: Pick<CouponLike, 'discount_type' | 'discount_value' | 'max_discount_cap'>): string {
  const v = Number(c.discount_value)
  if (!c.discount_value || Number.isNaN(v)) return c.discount_type === 'percentage' ? '—%' : '₹—'
  return c.discount_type === 'percentage' ? `${v}%` : formatINR(v, { whole: v % 1 === 0 })
}

export function discountDetail(c: Pick<CouponLike, 'discount_type' | 'max_discount_cap'>): string {
  if (c.discount_type === 'percentage') {
    return c.max_discount_cap ? `off, up to ${formatINR(c.max_discount_cap, { whole: true })}` : 'off'
  }
  return 'off'
}

/** "12 months" / "6 and 12 months" / "all lengths" for one package target. */
export function tierPhrase(t: ScopeTarget): string | null {
  if (t.product_type !== 'package') return null
  const ids = t.tier_ids || []
  if (ids.length === 0) return (t.tiers && t.tiers.length > 0) ? 'all lengths' : null
  if (!t.tiers) return `${ids.length} length${ids.length === 1 ? '' : 's'}`
  const chosen = t.tiers.filter((x) => ids.includes(x._id)).map((x) => formatDuration(x.duration_days))
  // A tier id that no longer exists on the package (tier deleted later)
  const unknown = ids.length - chosen.length
  if (unknown > 0) chosen.push(`${unknown} removed length${unknown === 1 ? '' : 's'}`)
  return joinList(chosen)
}

export function targetName(t: ScopeTarget): string {
  return t.product_name || t.label || 'Unnamed product'
}

/**
 * One line per targeted subscription. Each package tier is its own line
 * ("TECOM Theory Package · 6 months subscription"), matching how the owner
 * thinks about them; other products are one line each.
 */
export function targetLines(c: CouponLike): string[] {
  const out: string[] = []
  for (const t of c.applicable_products || []) {
    const name = targetName(t)
    if (t.product_type !== 'package' || !t.tiers || t.tiers.length === 0) {
      const tp = tierPhrase(t)
      out.push(tp ? `${name} · ${tp}` : name)
      continue
    }
    const ids = t.tier_ids || []
    if (ids.length === 0) {
      out.push(`${name} · every subscription length`)
      continue
    }
    for (const id of ids) {
      const tier = t.tiers.find((x) => x._id === id)
      out.push(tier ? `${name} · ${formatDuration(tier.duration_days)} subscription` : `${name} · a removed length`)
    }
  }
  return out
}

/** The short "who gets it" sentence. */
export function scopeSummary(c: CouponLike): string {
  if (c.applies_to === 'all') return 'Every product'
  if (c.applies_to === 'subject') {
    const names = (c.applicable_subjects || []).map((s) => s.name || 'a deleted subject')
    return names.length ? `Every ${joinList(names)} product` : 'No subjects chosen yet'
  }
  if (c.applies_to === 'type') {
    const types = (c.applicable_types || []).map((t) => TYPE_PLURAL[t])
    return types.length ? `All ${joinList(types)}` : 'No product types chosen yet'
  }
  const lines = targetLines(c)
  if (lines.length === 0) return 'No products chosen yet'
  if (lines.length === 1) return lines[0]
  return `${lines[0]} and ${lines.length - 1} more`
}

/** Conditions in the order a student would hit them at checkout. */
export function conditionLines(c: CouponLike): string[] {
  const out: string[] = []
  if (c.min_order_value && c.min_order_value > 0) out.push(`Orders of ${formatINR(c.min_order_value, { whole: true })} or more`)
  if (c.customer_scope === 'specific') {
    const n = (c.applicable_users || []).length
    out.push(n ? `Only ${n} chosen student${n === 1 ? '' : 's'}` : 'Only chosen students')
  }
  if (c.per_user_limit != null) out.push(`${c.per_user_limit} use${c.per_user_limit === 1 ? '' : 's'} per student`)
  if (c.max_redemptions != null) out.push(`${c.max_redemptions} uses in total`)
  out.push(c.expiry_at ? `Valid until ${formatDay(c.expiry_at)}` : 'No end date')
  return out
}
