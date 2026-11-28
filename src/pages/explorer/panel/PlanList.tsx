import { formatDuration, formatINR } from '@/lib/format'
import { FolderLink } from '../components/FolderLink'
import type { AnyPackage, ExplorerTier } from '../types'
import { PanelSectionTitle } from './fields'

interface Plan { key: string; days: number; name: string | null; price: number; original: number | null; sale: number | null; zoho: boolean }

function plansOf(pkg: AnyPackage): Plan[] {
  const tiers = [...((pkg.tiers ?? []) as ExplorerTier[])].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
  if (tiers.length === 0) {
    return [{
      key: pkg._id, days: pkg.duration_days, name: null, price: pkg.price, original: pkg.original_price,
      sale: pkg.is_on_sale && pkg.sale_price != null ? pkg.sale_price : null, zoho: !!pkg.zoho_item_id,
    }]
  }
  const percent = pkg.is_on_sale ? pkg.sale_discount_percent || 0 : 0
  return tiers.map((t, i) => ({
    key: t._id ?? `${i}`, days: t.duration_days, name: t.name, price: t.price, original: t.original_price ?? null,
    sale: percent > 0 ? Math.round(t.price * (1 - percent / 100)) : null, zoho: !!t.zoho_item_id,
  }))
}

/** Every length of a package is sold on its own, so each is its own line. */
export function PlanList({ pkg, linked, canEdit }: { pkg: AnyPackage; linked: boolean; canEdit: boolean }) {
  const plans = plansOf(pkg)
  return (
    <section aria-label="Plans" data-lead="" className="group space-y-3">
      <PanelSectionTitle>Plans ({plans.length})</PanelSectionTitle>
      <ol className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {plans.map((p, i) => {
          const was = p.sale != null ? p.price : p.original && p.original > p.price ? p.original : null
          return (
            <li key={p.key} className="flex items-start gap-3 px-3 py-2.5">
              <span className="w-5 shrink-0 pt-px text-right text-[13px] tabular-nums text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{formatDuration(p.days)}</p>
                {p.name && p.name.trim().toLowerCase() !== formatDuration(p.days).toLowerCase() && <p className="break-words text-xs text-muted-foreground">{p.name}</p>}
                <p className={`text-xs ${p.zoho ? 'text-muted-foreground' : 'text-warning'}`}>{p.zoho ? 'Zoho item linked' : 'Zoho item not created yet'}</p>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <p className="text-sm font-semibold text-foreground">{formatINR(p.sale ?? p.price)}</p>
                {was != null && <p className="text-xs text-muted-foreground"><span className="sr-only">Was </span><s>{formatINR(was)}</s>{p.sale != null && ' on sale'}</p>}
              </div>
            </li>
          )
        })}
      </ol>
      {linked && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          <FolderLink href={`/content/packages/${pkg._id}`} className="font-medium text-primary underline-offset-2 hover:underline">{canEdit ? `Change ${plans.length === 1 ? 'the plan' : 'plans'} on the package page` : 'Open the package page'}</FolderLink>
          <FolderLink href="/content/packages?view=subscriptions" className="font-medium text-primary underline-offset-2 hover:underline">All subscriptions</FolderLink>
        </p>
      )}
    </section>
  )
}
