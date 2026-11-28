import { MoreVertical, Eye, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { StatusPill } from '@/components/common/detail'
import { StatusToggle } from '@/components/common/StatusToggle'
import type { ColumnDef } from '@/components/common/DataTable'
import { dayIST, plural } from '@/components/users/lib'
import { formatDuration, formatINR } from '@/lib/format'
import type { Package } from '@/services/packages.service'
import { ProductCodeText } from '@/components/common/ProductCode'

interface PackagesColumnsProps {
  onNavigate: (pkg: Package) => void
  /** Missing when the admin may not change packages. */
  onEdit?: (pkg: Package) => void
  onToggleActive?: (pkg: Package) => void
  togglingId?: string | null
  onPublishAction?: (pkg: Package, action: 'publish' | 'unpublish') => void
}

const refName = (v: unknown, deleted: string) => (v && typeof v === 'object' && 'name' in v ? String((v as { name: unknown }).name) : deleted)

export function usePackagesColumns({ onNavigate, onEdit, onToggleActive, togglingId, onPublishAction }: PackagesColumnsProps): ColumnDef<Package>[] {
  return [
    {
      id: 'package',
      header: 'Package',
      cell: (pkg) => {
        const bundled = (pkg.bundled_package_ids || []).filter(Boolean)
        const names = bundled.map((b) => b.name).join(', ')
        return (
          <div className="flex min-w-[240px] items-center gap-3">
            <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">{pkg.name.charAt(0).toUpperCase()}</div>
            <div className="min-w-0 max-w-[380px]">
              <p className="break-words text-sm font-medium">{pkg.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <ProductCodeText code={pkg.product_code} />
                <span>{refName(pkg.package_type_id, 'Deleted type')}</span>
                {bundled.length > 0 && <span className="max-w-[260px] truncate rounded-full bg-accent px-2 py-px font-medium text-accent-foreground" title={`Bundles: ${names}`}>Combo: {names}</span>}
              </div>
            </div>
          </div>
        )
      },
    },
    { id: 'subject', header: 'Subject', cell: (pkg) => <span className="text-sm">{refName(pkg.subject_id, 'Deleted subject')}</span> },
    {
      id: 'price',
      header: 'Price',
      cell: (pkg) => {
        const tiers = pkg.tiers || []
        if (tiers.length > 0) {
          return (
            <div className="whitespace-nowrap tabular-nums">
              <p className="text-sm font-semibold">From {formatINR(Math.min(...tiers.map((t) => t.price)))}</p>
              <p className="text-xs text-muted-foreground">{plural(tiers.length, 'tier')}{pkg.is_on_sale && pkg.sale_discount_percent ? <span className="font-medium text-success"> · {pkg.sale_discount_percent}% off</span> : null}</p>
            </div>
          )
        }
        const onSale = pkg.is_on_sale && pkg.sale_price != null
        return (
          <div className="whitespace-nowrap tabular-nums">
            <p className={onSale ? 'text-sm font-semibold text-success' : 'text-sm font-semibold'}>{formatINR(onSale ? pkg.sale_price : pkg.price)}</p>
            {onSale ? <p className="text-xs text-muted-foreground"><s>{formatINR(pkg.original_price ?? pkg.price)}</s> on sale</p> : pkg.original_price ? <p className="text-xs text-muted-foreground"><s>{formatINR(pkg.original_price)}</s></p> : null}
          </div>
        )
      },
    },
    {
      id: 'duration',
      header: 'Duration',
      width: 'w-28',
      cell: (pkg) => {
        const days = [...new Set((pkg.tiers || []).map((t) => t.duration_days))].sort((a, b) => a - b)
        return <span className="whitespace-nowrap text-sm">{days.length === 0 ? formatDuration(pkg.duration_days) : days.map(formatDuration).join(', ')}</span>
      },
    },
    {
      id: 'publish_status',
      header: 'Publish',
      width: 'w-28',
      cell: (pkg) => <StatusPill tone={pkg.publish_status === 'published' ? 'success' : 'warning'}>{pkg.publish_status === 'published' ? 'Published' : 'Draft'}</StatusPill>,
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-32',
      cell: (pkg) => onToggleActive
        ? <div data-no-row-click><StatusToggle checked={pkg.is_active} label={pkg.name} onCheckedChange={() => onToggleActive(pkg)} disabled={togglingId === pkg._id} size="sm" /></div>
        : <StatusPill tone={pkg.is_active ? 'success' : 'neutral'}>{pkg.is_active ? 'Active' : 'Inactive'}</StatusPill>,
    },
    { id: 'created', header: 'Created', width: 'w-32', cell: (pkg) => <span className="whitespace-nowrap text-xs text-muted-foreground">{dayIST(pkg.createdAt)}</span> },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (pkg) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${pkg.name}`}><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onNavigate(pkg)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
            {onEdit && <DropdownMenuItem onClick={() => onEdit(pkg)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>}
            {onPublishAction && (
              <DropdownMenuItem onClick={() => onPublishAction(pkg, pkg.publish_status === 'draft' ? 'publish' : 'unpublish')}>
                {pkg.publish_status === 'draft' ? 'Publish' : 'Unpublish'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
