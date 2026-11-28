import { useNavigate } from 'react-router-dom'
import { Package as PackageIcon } from 'lucide-react'
import { ErrorState } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatDuration, formatINR } from '@/lib/format'
import type { Package } from '@/services/packages.service'

interface Props {
  packages: Package[]
  loading: boolean
  /** Serial numbers continue across pages: (page - 1) * pageSize + 1 */
  firstSerial: number
  error?: string | null
  onRetry?: () => void
  onClearFilters?: () => void
}

interface Row {
  key: string
  pkg: Package
  title: string
  tierName: string | null
  price: number
  originalPrice: number | null
  salePrice: number | null
  /** Zoho Books item linked to this subscription (null = not created yet). */
  zohoLinked: boolean
}

/**
 * The catalogue as the owner described it (23 Nov): every subscription is
 * its own line. "TECOM Theory Package · 6 months subscription" is serial 1,
 * "TECOM Theory Package · 12 months subscription" is serial 2. A package
 * without tiers is one line.
 */
function toRows(packages: Package[]): Row[] {
  const rows: Row[] = []
  for (const pkg of packages) {
    const tiers = [...(pkg.tiers || [])].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    const salePct = pkg.is_on_sale ? pkg.sale_discount_percent || 0 : 0
    if (tiers.length === 0) {
      rows.push({
        key: pkg._id,
        pkg,
        title: `${pkg.name} · ${formatDuration(pkg.duration_days)} subscription`,
        tierName: null,
        price: pkg.price,
        originalPrice: pkg.original_price,
        salePrice: pkg.is_on_sale && pkg.sale_price != null ? pkg.sale_price : null,
        zohoLinked: !!(pkg as Package & { zoho_item_id?: string | null }).zoho_item_id,
      })
      continue
    }
    for (const t of tiers) {
      rows.push({
        key: `${pkg._id}:${t._id || t.name}`,
        pkg,
        title: `${pkg.name} · ${formatDuration(t.duration_days)} subscription`,
        tierName: t.name,
        price: t.price,
        originalPrice: t.original_price ?? null,
        salePrice: salePct > 0 ? Math.round(t.price * (1 - salePct / 100)) : null,
        zohoLinked: !!(t as typeof t & { zoho_item_id?: string | null }).zoho_item_id,
      })
    }
  }
  return rows
}

export function PackageSubscriptionsTable({ packages, loading, firstSerial, error, onRetry, onClearFilters }: Props) {
  const navigate = useNavigate()
  const rows = toRows(packages)

  if (loading && rows.length === 0) {
    return (
      <div role="status" aria-label="Loading subscriptions" className="divide-y divide-border rounded-xl border bg-card shadow-card">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4"><Skeleton className="h-4 w-6" /><Skeleton className="h-4 w-1/3" /><Skeleton className="ml-auto h-4 w-20" /><Skeleton className="h-4 w-16" /></div>
        ))}
      </div>
    )
  }
  if (error) return <ErrorState title="The subscriptions could not be loaded" message={error} onRetry={onRetry} />
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card px-5 py-12 text-center">
        <PackageIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">{onClearFilters ? 'No subscriptions match these filters' : 'No subscriptions yet'}</p>
        <p className="text-sm text-muted-foreground">{onClearFilters ? 'Change or clear the filters.' : 'Add a package with subscription lengths.'}</p>
        {onClearFilters && <Button size="sm" variant="outline" className="mt-1" onClick={onClearFilters}>Clear filters</Button>}
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card shadow-card transition-opacity', loading && 'opacity-60')} aria-busy={loading}>
      <div className="pg-scroll-x overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="w-14 px-4 py-2.5 font-medium">#</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Subscription</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Subject</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Type</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Price</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Zoho item</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr
                key={r.key}
                tabIndex={0}
                onClick={() => navigate(`/content/packages/${r.pkg._id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/content/packages/${r.pkg._id}`) }}
                className="cursor-pointer transition-colors hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground" data-numeric>{firstSerial + i}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{r.title}</p>
                  {r.tierName && <p className="text-xs text-muted-foreground">Plan name: {r.tierName}</p>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.pkg.subject_id?.name || 'Deleted subject'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.pkg.package_type_id?.name || 'Deleted type'}
                  {(r.pkg.bundled_package_ids || []).length > 0 && !/combo/i.test(r.pkg.package_type_id?.name || '') && <span className="ml-1.5 rounded-full bg-accent px-2 py-px text-xs font-medium text-accent-foreground">Combo</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono" data-numeric>
                  {r.salePrice != null ? (
                    <>
                      <span className="font-semibold">{formatINR(r.salePrice)}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground line-through">{formatINR(r.price)}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">{formatINR(r.price)}</span>
                      {r.originalPrice && r.originalPrice > r.price ? <span className="ml-1.5 text-xs text-muted-foreground line-through">{formatINR(r.originalPrice)}</span> : null}
                    </>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', r.pkg.is_active && r.pkg.publish_status === 'published' ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground')}>
                    {r.pkg.publish_status !== 'published' ? 'Draft' : r.pkg.is_active ? 'On sale' : 'Inactive'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">
                  {r.zohoLinked ? <span className="font-medium text-success">Linked</span> : <span className="text-warning" title="Created automatically on the next save of this package, or at the first checkout">Not created yet</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
