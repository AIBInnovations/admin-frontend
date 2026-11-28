import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { istToday, rangeFromParams, rangeLabel, rangeToParams, shiftDay, type DateRange } from '@/components/common/DateRangeFilter'
import type { Granularity, PackageKind, ReportQuery, SaleType } from '@/services/analytics.service'
import { TYPE_ORDER } from '@/components/charts/palette'
import { DOW_NAMES, dayLabel, hourSpan, spanLabel } from '@/components/charts/format'

const ID = /^[0-9a-f]{24}$/i
const TIER = /^(\d{1,5}|none|name:.{1,100})$/
const GRANULARITIES: Granularity[] = ['auto', 'day', 'week', 'month', 'year']
const KINDS: PackageKind[] = ['theory', 'practical', 'combo', 'other']
const STATE = /^[\p{L}][\p{L} .&()'-]{0,59}$/u
const DOW = /^[1-7]$/
const HOUR = /^(\d{1,2})(?:-(\d{1,2}))?$/

/** '18-20' -> [18, 20]; anything not a real span -> null. */
export function parseHours(v: string | null | undefined): [number, number] | null {
  const m = HOUR.exec(v || '')
  if (!m) return null
  const a = Number(m[1]); const b = m[2] === undefined ? a : Number(m[2])
  return a <= 23 && b <= 23 && a <= b ? [a, b] : null
}

/** The four ranges this page has always offered. */
export const QUICK_RANGES = [
  { id: '7d', name: 'Past week' },
  { id: '30d', name: 'Past month' },
  { id: '365d', name: 'Past year' },
  { id: 'all', name: 'All time' },
]

export function quickRange(id: string): DateRange {
  if (id === 'all') return { from: '', to: '', preset: 'all' }
  const days = id === '365d' ? 364 : id === '7d' ? 6 : 29
  return { from: shiftDay(istToday(), -days), to: istToday(), preset: id }
}

export function readRange(params: URLSearchParams, fallback: string): DateRange {
  if (!params.get('from') && params.get('range') === '365d') return quickRange('365d')
  return rangeFromParams(params, fallback)
}

export function describeRange(r: DateRange): string {
  return QUICK_RANGES.find((q) => q.id === r.preset)?.name ?? rangeLabel(r)
}

/** The range inside a sentence: "past year", but "1 Jan 2020 – 31 Jan 2020" keeps its capitals. */
export function rangeInSentence(r: DateRange): string {
  const preset = QUICK_RANGES.find((q) => q.id === r.preset)
  return preset ? preset.name.toLowerCase() : rangeLabel(r)
}

export interface AnalyticsFilters {
  type: SaleType | ''
  subject: string
  package: string
  tier: string
  kind: PackageKind | ''
  /** Cross-filters, set by clicking a chart (where buyers are, when they buy). */
  state: string
  dow: string
  hour: string
}
export type FilterKey = 'type' | 'subject' | 'package' | 'tier' | 'kind'
export type CrossKey = 'state' | 'dow' | 'hour'

const SALES_FILTERS: FilterKey[] = ['subject', 'package', 'tier', 'kind', 'type']
/**
 * The filters each Analytics tab shows, and whether it shows the cross-filter
 * chips. A tab's reports use exactly these: a filter left in the URL by another
 * tab never changes numbers on a tab that does not show it.
 */
export const TAB_SCOPE: Record<'overview' | 'sales' | 'students' | 'feedback' | 'retention' | 'refunds' | 'compare' | 'videos', { filters: FilterKey[]; cross: boolean }> = {
  overview: { filters: SALES_FILTERS, cross: true },
  sales: { filters: SALES_FILTERS, cross: true },
  students: { filters: [], cross: false },
  feedback: { filters: ['subject'], cross: false },
  retention: { filters: ['subject', 'package', 'tier', 'kind'], cross: true },
  refunds: { filters: SALES_FILTERS, cross: true },
  compare: { filters: SALES_FILTERS, cross: true },
  // Round 7: a package's videos (or all), and who watches. A subject narrows the package list.
  videos: { filters: ['subject', 'package'], cross: false },
}

/**
 * The URL changes for one filter. A plan belongs to a package and a package to
 * a subject, a package type and a product type: a choice that no longer fits
 * the package goes with it, so the picker never shows "Deleted package" and
 * the reports never come back empty for a stale pick.
 */
export function filterChanges(key: FilterKey | CrossKey, value: string): Record<string, string | null> {
  // vpage and video: the Videos tab's page and opened video belong to the old choice
  const changes: Record<string, string | null> = { [key]: value || null, page: null, vpage: null, video: null }
  if (key === 'subject' || key === 'kind' || (key === 'type' && value && value !== 'package')) { changes.package = null; changes.tier = null }
  if (key === 'package') changes.tier = null
  return changes
}

/** A query with only the filters a tab shows (see TAB_SCOPE). */
export function scopeQuery(query: ReportQuery, filters: AnalyticsFilters, tab: keyof typeof TAB_SCOPE): ReportQuery {
  const { filters: shown, cross } = TAB_SCOPE[tab]
  const has = (k: FilterKey) => shown.includes(k)
  return {
    ...query,
    type: has('type') ? filters.type : '', subject_id: has('subject') ? filters.subject : '', package_id: has('package') ? filters.package : '',
    tier: has('tier') ? filters.tier : '', package_type: has('kind') ? filters.kind : '',
    state: cross ? filters.state : '', dow: cross ? filters.dow : '', hour: cross ? filters.hour : '',
  }
}

/** Everything the page shows is in the URL, so Back, refresh and sharing work. */
export function useAnalyticsState(fallbackRange = '30d') {
  const [params, setParams] = useSearchParams()

  const range = useMemo(() => readRange(params, fallbackRange), [params, fallbackRange])
  const compare = params.get('compare') !== '0'
  const by = params.get('by') as Granularity | null
  const granularity: Granularity = by && GRANULARITIES.includes(by) ? by : 'auto'
  const id = (key: string, extra?: string) => { const v = params.get(key) || ''; return ID.test(v) || (extra && v === extra) ? v : '' }
  const filters: AnalyticsFilters = {
    type: TYPE_ORDER.includes(params.get('type') as SaleType) ? (params.get('type') as SaleType) : '',
    subject: id('subject', 'none'),
    package: id('package'),
    tier: TIER.test(params.get('tier') || '') ? params.get('tier')! : '',
    kind: KINDS.includes(params.get('kind') as PackageKind) ? (params.get('kind') as PackageKind) : '',
    state: STATE.test(params.get('state') || '') ? params.get('state')! : '',
    dow: DOW.test(params.get('dow') || '') ? params.get('dow')! : '',
    hour: parseHours(params.get('hour')) ? params.get('hour')! : '',
  }

  /** Changes part of the URL. `push` leaves a Back step (drilling in, tabs, ranges). */
  const update = useCallback((changes: Record<string, string | null | undefined>, opts: { push?: boolean } = {}) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(changes)) { if (v) next.set(k, v); else next.delete(k) }
      return next
    }, { replace: !opts.push, preventScrollReset: true })
  }, [setParams])

  const setRange = useCallback((r: DateRange) => setParams((prev) => {
    const next = rangeToParams(r, prev)
    next.delete('page')
    return next
  }, { preventScrollReset: true }), [setParams])

  const setFilter = useCallback((key: FilterKey | CrossKey, value: string) => update(filterChanges(key, value), { push: true }), [update])

  const clearFilters = useCallback(() => update({ type: null, subject: null, package: null, tier: null, kind: null, state: null, dow: null, hour: null, page: null }, { push: true }), [update])
  const clearCross = useCallback(() => update({ state: null, dow: null, hour: null, page: null }, { push: true }), [update])

  const activeFilters = Object.values(filters).filter(Boolean).length
  /**
   * The Purchases list cannot filter by a state, weekday, hour or package type,
   * so with any of those on, a link there would show more than is counted.
   */
  const linkable = !filters.state && !filters.dow && !filters.hour && !filters.kind

  const query: ReportQuery = {
    from: range.from, to: range.to,
    compare: compare && range.from ? 'previous' : 'none',
    granularity,
    type: filters.type, subject_id: filters.subject, package_id: filters.package, tier: filters.tier, package_type: filters.kind,
    state: filters.state, dow: filters.dow, hour: filters.hour,
  }

  /** The query for a tab: the range, and only the filters that tab shows. */
  const scopedQuery = (tab: keyof typeof TAB_SCOPE): ReportQuery => scopeQuery(query, filters, tab)

  /** The same view with some parts changed, as a link. */
  const href = (changes: Record<string, string | null>, path = '') => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) { if (v) next.set(k, v); else next.delete(k) }
    const s = next.toString()
    return `${path}${s ? `?${s}` : path ? '' : '?'}`
  }

  return { params, range, compare, granularity, filters, activeFilters, linkable, query, scopedQuery, update, setRange, setFilter, clearFilters, clearCross, href }
}

/** The cross-filters in words: "Billed in Karnataka", "Tuesdays, 8 pm to 9 pm". */
export function crossLabels(f: Pick<AnalyticsFilters, 'state' | 'dow' | 'hour'>): { key: CrossKey; label: string }[] {
  const out: { key: CrossKey; label: string }[] = []
  if (f.state) out.push({ key: 'state', label: f.state === 'none' ? 'No billing state recorded' : `Billed in ${f.state}` })
  const hours = parseHours(f.hour)
  if (f.dow && hours) out.push({ key: 'dow', label: `${DOW_NAMES[Number(f.dow) - 1]}s, ${hourSpan(hours[0], hours[1])}` })
  else if (f.dow) out.push({ key: 'dow', label: `${DOW_NAMES[Number(f.dow) - 1]}s` })
  else if (hours) out.push({ key: 'hour', label: `Bought ${hourSpan(hours[0], hours[1])}` })
  return out
}

export type AnalyticsState = ReturnType<typeof useAnalyticsState>

/** "compared with 1 to 30 Oct 2026" */
export function versusText(previous: { from: string | null; to: string | null } | null | undefined): string | null {
  if (!previous?.from || !previous.to) return null
  return previous.from === previous.to ? dayLabel(previous.from) : spanLabel(previous.from, previous.to)
}

interface SalesLink {
  from?: string | null
  to?: string | null
  type?: string
  subject?: string | null
  package?: string | null
  tier?: string
  item?: string | null
  coupon?: string
  status?: string
}

/** The Purchases list showing exactly the rows behind a number. */
export function purchasesHref(l: SalesLink): string {
  const p = new URLSearchParams()
  p.set('status', l.status ?? 'completed')
  if (!l.status) p.set('granted', 'no')
  if (l.from && l.to) { p.set('from', l.from); p.set('to', l.to) } else p.set('range', 'all')
  // Purchases opens on packages when no type is given; a figure over every product type needs them all
  if (l.package) p.set('type', 'package')
  else if (l.type) p.set('type', l.type)
  else p.set('type', 'all')
  if (l.subject && l.subject !== 'none') p.set('subject_id', l.subject)
  if (l.package) p.set('package_id', l.package)
  if (l.tier && l.tier !== 'none') p.set('tier', l.tier.replace(/^name:/, ''))
  if (l.item) p.set('item_id', l.item)
  if (l.coupon) p.set('coupon', l.coupon)
  return `/commerce/purchases?${p}`
}

export const purchaseHref = (type: string, id: string) => `/commerce/purchases/${type}/${id}`

/** A video's own page in the Explorer, or the list, whichever this admin may open. */
export function videoHref(v: { video_id: string; subject_id: string | null; package_id: string | null; series_id: string | null; module_id: string | null }, can: (permission: string) => boolean): string | null {
  if (can('subjects.read') && v.subject_id && v.package_id && v.series_id && v.module_id) {
    return `/content/explorer/subjects/${v.subject_id}/packages/${v.package_id}/series/${v.series_id}/modules/${v.module_id}/videos/${v.video_id}`
  }
  return can('videos.read') ? '/content/videos' : null
}
