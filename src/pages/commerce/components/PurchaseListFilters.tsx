import { useEffect, useMemo, useState } from 'react'
import { DateRangeFilter, rangeFromParams, rangeToParams } from '@/components/common/DateRangeFilter'
import { formatDuration } from '@/lib/format'
import { paymentsService, type PurchaseFilterOptions, type PurchaseFilters, type PurchaseTotals } from '@/services/payments.service'
import { ClearFilters, FilterCombo, FilterSelect, MoreFilters, Totals } from './filters'
import { money } from './labels'
import type { useListUrl } from './useListUrl'

const GRANTED = [
  { label: 'Paid for', value: 'no' },
  { label: 'Given by an admin', value: 'yes' },
  { label: 'Included with a combo', value: 'combo' },
]
const DISPUTES = [
  { label: 'Any dispute', value: 'any' },
  { label: 'Dispute open', value: 'open' },
  { label: 'Dispute won', value: 'won' },
  { label: 'Dispute lost', value: 'lost' },
]
const KEYS = ['subject_id', 'package_id', 'tier', 'coupon', 'granted', 'dispute'] as const

let cached: PurchaseFilterOptions | null = null

/** What the purchase and payment lists send to the server. */
export function purchaseQuery(params: URLSearchParams, defaults: { type?: string; test?: 'include' | 'only' } = {}): PurchaseFilters {
  const range = rangeFromParams(params, 'all')
  const type = params.get('type') || defaults.type || ''
  return {
    search: params.get('search') || undefined,
    type: type && type !== 'all' ? type : undefined,
    status: params.get('status') || undefined,
    gateway: params.get('gateway') || undefined,
    from: range.from || undefined,
    to: range.to || undefined,
    user_id: params.get('user_id') || undefined,
    item_id: params.get('item_id') || undefined,
    ...Object.fromEntries(KEYS.map((k) => [k, params.get(k) || undefined])),
    // Testers' INR 1 orders: the server hides them unless asked (27 Nov 2026)
    test: (['include', 'only'] as const).find((v) => v === params.get('test')) ?? (params.get('test') === 'hide' ? undefined : defaults.test),
  }
}

/** Anything beyond the page's own default view? */
export function hasPurchaseFilters(params: URLSearchParams): boolean {
  const range = rangeFromParams(params, 'all')
  return range.preset !== 'all' || ['search', 'type', 'status', 'gateway', 'user_id', 'item_id', ...KEYS].some((k) => params.get(k))
}

/** The filters beyond status, type and gateway, shared by Purchases and Payments. */
export function PurchaseListFilters({ url }: { url: ReturnType<typeof useListUrl> }) {
  const { params, update, replaceAll } = url
  const [options, setOptions] = useState<PurchaseFilterOptions | null>(cached)

  useEffect(() => {
    if (cached) return
    let off = false
    paymentsService.getFilterOptions().then((r) => { if (!off && r.data) { cached = r.data; setOptions(r.data) } }).catch(() => { /* the list still works without these choices */ })
    return () => { off = true }
  }, [])

  const subject = params.get('subject_id') || ''
  const packageId = params.get('package_id') || ''
  const packages = useMemo(() => (options?.packages || []).filter((p) => !subject || p.subject_id === subject), [options, subject])
  const durations = useMemo(() => {
    const source = packageId ? packages.filter((p) => p._id === packageId) : packages
    return [...new Set(source.flatMap((p) => p.durations))].sort((a, b) => a - b)
  }, [packages, packageId])
  const tier = params.get('tier') || ''
  const tierOptions = durations.map((d) => ({ label: formatDuration(d), value: String(d) }))
  if (tier && !tierOptions.some((t) => t.value === tier)) tierOptions.push({ label: /^\d+$/.test(tier) ? formatDuration(Number(tier)) : tier, value: tier })

  const range = rangeFromParams(params, 'all')
  const count = KEYS.filter((k) => params.get(k)).length + (range.preset !== 'all' ? 1 : 0) + (params.get('user_id') ? 1 : 0) + (params.get('item_id') ? 1 : 0)

  return (
    <MoreFilters count={count} action={hasPurchaseFilters(params) ? <ClearFilters onClick={() => { url.setSearchInput(''); replaceAll(new URLSearchParams()) }} /> : undefined}>
      <div className="min-w-0">
        <span className="mb-1 block text-xs text-muted-foreground">Date</span>
        <DateRangeFilter value={range} onChange={(r) => { const next = rangeToParams(r, params); if (r.preset === 'all') next.delete('range'); next.delete('page'); replaceAll(next) }} className="w-full" />
      </div>
      <FilterCombo label="Subject" all="All subjects" value={subject} options={(options?.subjects || []).map((s) => ({ label: s.name, value: s._id }))} onChange={(v) => update({ subject_id: v, package_id: null, tier: null })} />
      <FilterCombo label="Package" all="All packages" value={packageId} options={packages.map((p) => ({ label: p.name, value: p._id }))} onChange={(v) => update({ package_id: v, tier: null })} />
      <FilterSelect label="Plan length" all="All plans" value={tier} options={tierOptions} onChange={(v) => update({ tier: v })} />
      <FilterCombo label="Coupon" all="With or without a coupon" value={params.get('coupon') || ''} options={[{ label: 'Any coupon', value: 'any' }, ...(options?.coupons || []).map((x) => ({ label: x, value: x }))]} onChange={(v) => update({ coupon: v })} />
      <FilterSelect label="Access" all="Paid, given or included" value={params.get('granted') || ''} options={GRANTED} onChange={(v) => update({ granted: v })} />
      <FilterSelect label="Dispute" all="With or without a dispute" value={params.get('dispute') || ''} options={DISPUTES} onChange={(v) => update({ dispute: v })} />
    </MoreFilters>
  )
}

export function PurchaseTotalsBar({ totals, loading }: { totals: PurchaseTotals | null; loading: boolean }) {
  const t = totals
  return (
    <Totals
      loading={loading && !!t}
      items={[
        { label: 'Sales', value: t ? t.sales.toLocaleString('en-IN') : '—', hint: !t ? '' : t.count !== t.sales ? `of ${t.count.toLocaleString('en-IN')} record${t.count === 1 ? '' : 's'}` : undefined },
        { label: 'Collected', value: t ? money(t.collected) : '—', hint: 'From these sales, GST included' },
        { label: 'Refunded', value: t ? t.refunded.toLocaleString('en-IN') : '—', hint: !t ? '' : t.refunded_amount > 0 ? money(t.refunded_amount) : undefined },
        { label: 'Pending or failed', value: t ? (t.pending + t.failed).toLocaleString('en-IN') : '—', hint: t ? `${t.pending.toLocaleString('en-IN')} pending, ${t.failed.toLocaleString('en-IN')} failed` : '' },
      ]}
    />
  )
}
