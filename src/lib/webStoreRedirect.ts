/**
 * Presentation helpers for the Web Store Redirect rules.
 *
 * A rule stores only a base URL and a raw version range, which reads as
 * `2.0.4 → ∞` and a pair of near-identical Vercel hostnames. Neither tells a
 * non-technical admin what the rule actually does, so both are translated
 * here. Nothing in this file changes what gets sent to the API.
 */

export type StoreKind = 'full' | 'content_only' | 'custom'

/**
 * The content-only store hides every price, Buy button and payment flow —
 * it's what iOS reader-mode builds are allowed to link to. The full store is
 * the ordinary shop. Only the URL distinguishes them, so recognise the ones
 * we run by host.
 */
const KNOWN_STORES: Record<string, Exclude<StoreKind, 'custom'>> = {
  'store-frontend-pmy4o729m-pgmes-projects.vercel.app': 'content_only',
  'store-frontend-ivory.vercel.app': 'full',
  'pgmeessentials.com': 'full',
  'www.pgmeessentials.com': 'full',
  'store.pgme.in': 'full',
}

export function getStoreHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export function getStoreKind(url: string): StoreKind {
  return KNOWN_STORES[getStoreHost(url)] ?? 'custom'
}

export const STORE_KIND_LABEL: Record<StoreKind, string> = {
  content_only: 'Content Only',
  full: 'Full Store',
  custom: 'Other Store',
}

export const STORE_KIND_HINT: Record<StoreKind, string> = {
  content_only: 'Browsing only — no prices, no buying, no payment',
  full: 'Complete store — prices, buying and payment',
  custom: 'Not one of our known store links',
}

export const STORE_KIND_BADGE: Record<StoreKind, string> = {
  content_only: 'bg-amber-500/10 text-amber-600 border-amber-200',
  full: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  custom: 'bg-slate-500/10 text-slate-600 border-slate-200',
}

/** Offered as ready-made choices in the rule form. */
export const STORE_PRESETS: { kind: Exclude<StoreKind, 'custom'>; url: string }[] = [
  { kind: 'content_only', url: 'https://store-frontend-pmy4o729m-pgmes-projects.vercel.app' },
  { kind: 'full', url: 'https://store-frontend-ivory.vercel.app' },
]

/**
 * "0", "0.0" and "0.0.0" all mean "no lower bound" — the API needs a version
 * string there, but showing it to an admin as a real boundary is misleading.
 */
const NO_LOWER_BOUND = new Set(['', '0', '0.0', '0.0.0'])

export const UNBOUNDED_MIN = '0.0.0'

export function hasLowerBound(min: string | null | undefined): boolean {
  return !NO_LOWER_BOUND.has((min ?? '').trim())
}

export function hasUpperBound(max: string | null | undefined): boolean {
  return (max ?? '').trim() !== ''
}

/** Plain-English replacement for `min → max`, `>=`, `<=` and `∞`. */
export function describeVersionRange(min: string, max: string | null): string {
  const lower = hasLowerBound(min)
  const upper = hasUpperBound(max)
  if (lower && upper) return `App version ${min} up to ${max}`
  if (lower) return `App version ${min} and newer`
  if (upper) return `App version ${max} and older`
  return 'Every app version'
}

export type VersionRangeMode = 'newer' | 'older' | 'between' | 'all'

export const VERSION_RANGE_MODE_LABEL: Record<VersionRangeMode, string> = {
  newer: 'This version and newer',
  older: 'This version and older',
  between: 'Between two versions',
  all: 'Every app version',
}

export function getVersionRangeMode(min: string, max: string | null): VersionRangeMode {
  const lower = hasLowerBound(min)
  const upper = hasUpperBound(max)
  if (lower && upper) return 'between'
  if (lower) return 'newer'
  if (upper) return 'older'
  return 'all'
}
