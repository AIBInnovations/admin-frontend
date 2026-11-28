import { useEffect, useState, useCallback, useId } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Search, Plus, Check, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration, formatINR } from '@/lib/format'
import { packagesService, Package } from '@/services/packages.service'
import { liveSessionsService } from '@/services/liveSessions.service'
import { workshopsService } from '@/services/workshops.service'
import { booksService } from '@/services/books.service'
import { formsService } from '@/services/forms.service'
import { CouponApplicableProduct, CouponProductTier, CouponProductType } from '@/services/coupons.service'

/** One targeted product in the editor: the stored target plus display data. */
export interface CouponTarget extends CouponApplicableProduct {
  tier_ids: string[]
  label?: string | null
  /** Package only: the package's tiers, sorted the way students see them. */
  tiers?: CouponProductTier[]
  /** Package only: true when the package bundles other packages. */
  isCombo?: boolean
  /** Set when the product could not be loaded (deleted, or no access). */
  missing?: boolean
}

export const TYPE_LABELS: Record<CouponProductType, string> = {
  package: 'Package',
  session: 'Live session',
  workshop: 'Workshop',
  ebook: 'E-book',
  book: 'Physical book',
  form: 'Form',
}

interface SearchResult {
  id: string
  label: string
  sublabel?: string
  tiers?: CouponProductTier[]
  isCombo?: boolean
}

function packageTiers(p: Pick<Package, 'tiers'>): CouponProductTier[] {
  return [...(p.tiers || [])]
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .filter((t) => !!t._id)
    .map((t) => ({ _id: String(t._id), name: t.name, duration_days: t.duration_days, price: t.price }))
}

function packageSublabel(p: Package): string {
  const parts: string[] = []
  if (p.package_type_id?.name) parts.push(p.package_type_id.name)
  if (p.subject_id?.name) parts.push(p.subject_id.name)
  return parts.join(' · ')
}

async function fetchProducts(type: CouponProductType, search: string): Promise<SearchResult[]> {
  const params: Record<string, unknown> = { search: search || undefined, limit: 20 }
  if (type === 'package') {
    const res = await packagesService.getAll(params)
    return (res.data?.entities || []).map((p: Package) => ({
      id: p._id,
      label: p.name,
      sublabel: packageSublabel(p),
      tiers: packageTiers(p),
      isCombo: (p.bundled_package_ids || []).length > 0,
    }))
  }
  if (type === 'session') {
    const res = await liveSessionsService.getAll(params)
    return (res.data?.entities || []).map((s: any) => ({ id: s._id, label: s.title }))
  }
  if (type === 'workshop') {
    const res = await workshopsService.getAll(params)
    return (res.data?.entities || []).map((w: any) => ({
      id: w._id,
      label: w.title,
      sublabel: `${w.day_count} day${w.day_count === 1 ? '' : 's'}`,
    }))
  }
  if (type === 'form') {
    const res = await formsService.getAll(params)
    return (res.data?.entities || []).map((f: any) => ({ id: f._id, label: f.title }))
  }
  // ebook / book both come from the Book collection; filter by the ebook flag
  const res = await booksService.getAll(params)
  const wantEbook = type === 'ebook'
  return (res.data?.entities || [])
    .filter((b: any) => (b.ebook === true) === wantEbook)
    .map((b: any) => ({ id: b._id, label: b.title }))
}

/**
 * Fill in names (and package tiers) for targets that arrived as bare IDs,
 * e.g. a coupon saved before the admin API returned names. One request per
 * unresolved target; coupons target a handful of products, not hundreds.
 */
export async function resolveTarget(t: CouponTarget): Promise<CouponTarget> {
  const needsTiers = t.product_type === 'package' && !t.tiers
  if (t.label && !needsTiers) return t
  try {
    let res: any
    switch (t.product_type) {
      case 'package': {
        res = await packagesService.getById(t.product_id)
        const p = res.data as Package | undefined
        if (!res.success || !p) return { ...t, missing: true }
        return { ...t, label: p.name, tiers: packageTiers(p), isCombo: (p.bundled_package_ids || []).length > 0 }
      }
      case 'session': res = await liveSessionsService.getById(t.product_id); break
      case 'workshop': res = await workshopsService.getById(t.product_id); break
      case 'form': res = await formsService.getById(t.product_id); break
      default: res = await booksService.getById(t.product_id)
    }
    const e = res?.data
    if (!res?.success || !e) return { ...t, missing: true }
    return { ...t, label: e.title || e.name || null }
  } catch {
    return { ...t, missing: true }
  }
}

interface CouponProductPickerProps {
  value: CouponTarget[]
  onChange: (value: CouponTarget[]) => void
  disabled?: boolean
}

/**
 * One selectable line. A tiered package contributes one line per tier,
 * because the owner treats "TECOM Theory Package, 6 months" and
 * "TECOM Theory Package, 12 months" as separate products. Everything else
 * (and a package without tiers) is a single line.
 */
interface PickLine {
  key: string
  productId: string
  title: string
  detail: string
  tier: CouponProductTier | null
  tiers?: CouponProductTier[]
  isCombo?: boolean
}

function subscriptionTitle(name: string, tier: CouponProductTier) {
  return `${name} · ${formatDuration(tier.duration_days)} subscription`
}

function resultLines(r: SearchResult): PickLine[] {
  if (r.tiers && r.tiers.length > 0) {
    return r.tiers.map((t) => ({
      key: `${r.id}:${t._id}`,
      productId: r.id,
      title: subscriptionTitle(r.label, t),
      detail: [t.name, formatINR(t.price, { whole: true }), r.sublabel, r.isCombo && !/combo/i.test(r.sublabel || '') ? 'Combo' : null].filter(Boolean).join(' · '),
      tier: t,
      tiers: r.tiers,
      isCombo: r.isCombo,
    }))
  }
  return [{ key: r.id, productId: r.id, title: r.label, detail: r.sublabel || '', tier: null, tiers: r.tiers, isCombo: r.isCombo }]
}

/** Tier ids a target effectively covers ([] in storage means every tier). */
function coveredTierIds(t: CouponTarget): string[] {
  if (t.tier_ids.length > 0) return t.tier_ids
  return (t.tiers || []).map((x) => x._id)
}

export function CouponProductPicker({ value, onChange, disabled }: CouponProductPickerProps) {
  const [type, setType] = useState<CouponProductType>('package')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const searchId = useId()

  const runSearch = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      setResults(await fetchProducts(type, search))
    } catch {
      setResults([])
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [type, search])

  useEffect(() => {
    const t = setTimeout(runSearch, 300)
    return () => clearTimeout(t)
  }, [runSearch])

  const same = (v: CouponTarget, productType: CouponProductType, productId: string) =>
    v.product_type === productType && v.product_id === productId

  const isSelected = (line: PickLine) => {
    const t = value.find((v) => same(v, type, line.productId))
    if (!t) return false
    if (!line.tier) return true
    return t.tier_ids.length === 0 || t.tier_ids.includes(line.tier._id)
  }

  const add = (line: PickLine, r: SearchResult) => {
    if (isSelected(line)) return
    const existing = value.find((v) => same(v, type, line.productId))
    if (existing && line.tier) {
      onChange(value.map((v) => (v === existing ? { ...v, tier_ids: [...v.tier_ids, line.tier!._id], tiers: v.tiers || line.tiers } : v)))
      return
    }
    onChange([
      ...value,
      { product_type: type, product_id: line.productId, label: r.label, tier_ids: line.tier ? [line.tier._id] : [], tiers: line.tiers, isCombo: line.isCombo },
    ])
  }

  /** Remove one selected line; a package's last tier removes the package. */
  const removeLine = (target: CouponTarget, tierId: string | null) => {
    if (!tierId) {
      onChange(value.filter((v) => v !== target))
      return
    }
    const rest = coveredTierIds(target).filter((id) => id !== tierId)
    onChange(rest.length === 0 ? value.filter((v) => v !== target) : value.map((v) => (v === target ? { ...v, tier_ids: rest } : v)))
  }

  // Flatten the stored targets into the lines the admin sees.
  const chosen: { target: CouponTarget; tier: CouponProductTier | null; key: string }[] = []
  for (const t of value) {
    const tiers = t.product_type === 'package' ? t.tiers || [] : []
    if (tiers.length === 0) {
      chosen.push({ target: t, tier: null, key: `${t.product_type}:${t.product_id}` })
      continue
    }
    const ids = coveredTierIds(t)
    for (const id of ids) {
      const tier = tiers.find((x) => x._id === id)
      chosen.push({
        target: t,
        // A tier id the package no longer has (deleted later) still shows, so it can be removed
        tier: tier || { _id: id, name: 'Removed length', duration_days: 0, price: 0 },
        key: `${t.product_type}:${t.product_id}:${id}`,
      })
    }
  }

  return (
    <div className="space-y-4">
      {chosen.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {chosen.length} selected
          </p>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border bg-card">
            {chosen.map(({ target: v, tier, key }) => {
              const stale = tier && !(v.tiers || []).some((x) => x._id === tier._id)
              const coversFuture = tier && v.tier_ids.length === 0
              return (
                <li key={key} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      {TYPE_LABELS[v.product_type]}
                      {v.isCombo && <span className="ml-2 rounded bg-accent px-1.5 py-px text-[10px] text-accent-foreground">Combo</span>}
                    </p>
                    <p className={cn('mt-0.5 text-sm font-medium', (v.missing || stale) && 'text-danger')}>
                      {v.missing
                        ? 'Product not found. It may have been deleted.'
                        : !v.label
                          ? 'Loading…'
                          : tier && !stale
                            ? subscriptionTitle(v.label, tier)
                            : stale
                              ? `${v.label} · a subscription length that no longer exists`
                              : v.label}
                    </p>
                    {tier && !stale && (
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {tier.name} · {formatINR(tier.price, { whole: true })}
                        {coversFuture && <span className="font-sans"> · saved as “every length”, so lengths added later are included too</span>}
                      </p>
                    )}
                    {v.product_type === 'package' && !v.missing && !tier && v.tiers && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">Single-price package</p>
                    )}
                  </div>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeLine(v, tier ? tier._id : null)}
                      aria-label={`Remove ${tier && v.label ? subscriptionTitle(v.label, tier) : v.label || 'product'}`}
                      className="-mr-1 rounded p-1 text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {value.some((v) => v.product_type === 'package' && !v.isCombo) && (
        <p className="flex gap-2 rounded-md bg-accent/60 px-3 py-2 text-xs text-accent-foreground">
          <Layers className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          A coupon for a package applies only when that exact package and length is bought. A combo that includes it is its own package: add the combo too if it should get this discount.
        </p>
      )}

      {/* Add products */}
      <div className="rounded-lg border border-dashed p-3">
        <label htmlFor={searchId} className="mb-2 block text-xs font-medium text-muted-foreground">Add a product</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={type} onValueChange={(v) => setType(v as CouponProductType)} disabled={disabled}>
            <SelectTrigger className="sm:w-44" aria-label="Product type"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_LABELS) as CouponProductType[]).map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id={searchId}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${TYPE_LABELS[type].toLowerCase()}s…`}
              className="pl-8"
              autoComplete="off"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-md border bg-card" aria-live="polite">
          {loading ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">Searching…</p>
          ) : failed ? (
            <p className="px-3 py-3 text-xs text-danger">Could not load {TYPE_LABELS[type].toLowerCase()}s. Check your connection and try again.</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">{search ? <>No {TYPE_LABELS[type].toLowerCase()}s match “{search}”.</> : <>No {TYPE_LABELS[type].toLowerCase()}s yet.</>}</p>
          ) : (
            <ul className="divide-y divide-border">
              {results.flatMap((r) => resultLines(r).map((line) => {
                const added = isSelected(line)
                return (
                  <li key={line.key}>
                    <button
                      type="button"
                      onClick={() => add(line, r)}
                      disabled={disabled || added}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm" title={line.title}>{line.title}</span>
                        {line.detail && <span className="block truncate text-xs text-muted-foreground" title={line.detail}>{line.detail}</span>}
                      </span>
                      {added ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-primary"><Check className="h-3.5 w-3.5" aria-hidden="true" />Added</span>
                      ) : (
                        <Plus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                )
              }))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
