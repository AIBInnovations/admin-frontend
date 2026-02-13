import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusToggle } from '@/components/common/StatusToggle'
import { ColumnDef } from '@/components/common/DataTable'
import { Package } from '@/services/packages.service'
import { MoreVertical, Pencil, Trash2, Eye } from 'lucide-react'

function formatDuration(days: number): string {
  if (days >= 365) return `${Math.round(days / 365)} year`
  if (days >= 30) return `${Math.round(days / 30)} months`
  return `${days} days`
}

interface PackagesColumnsProps {
  onNavigate: (pkg: Package) => void
  onEdit: (pkg: Package) => void
  onDelete: (pkg: Package) => void
  onToggleActive: (pkg: Package) => void
}

export function usePackagesColumns({
  onNavigate,
  onEdit,
  onDelete,
  onToggleActive,
}: PackagesColumnsProps): ColumnDef<Package>[] {
  return [
    {
      id: 'package',
      header: 'Package',
      cell: (pkg) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
            {pkg.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium">{pkg.name}</p>
            <Badge variant="outline" className="mt-0.5 text-[10px]">
              {typeof pkg.package_type_id === 'object' ? pkg.package_type_id.name : '—'}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: (pkg) => (
        <span className="text-sm">
          {typeof pkg.subject_id === 'object' ? pkg.subject_id.name : '—'}
        </span>
      ),
    },
    {
      id: 'price',
      header: 'Price',
      cell: (pkg) => (
        <div className="flex flex-col gap-0.5">
          {pkg.is_on_sale ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-emerald-600">
                  ₹{pkg.sale_price?.toLocaleString('en-IN')}
                </span>
                <Badge className="bg-emerald-500/10 text-[10px] text-emerald-700 hover:bg-emerald-500/10">
                  SALE
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground line-through">
                ₹{(pkg.original_price ?? pkg.price).toLocaleString('en-IN')}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold">₹{pkg.price.toLocaleString('en-IN')}</span>
              {pkg.original_price && (
                <span className="text-xs text-muted-foreground line-through">
                  ₹{pkg.original_price.toLocaleString('en-IN')}
                </span>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      id: 'duration',
      header: 'Duration',
      width: 'w-28',
      cell: (pkg) => <span className="text-sm">{formatDuration(pkg.duration_days)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-32',
      cell: (pkg) => (
        <div onClick={(e) => e.stopPropagation()}>
          <StatusToggle
            checked={pkg.is_active}
            onCheckedChange={() => onToggleActive(pkg)}
            size="sm"
          />
        </div>
      ),
    },
    {
      id: 'created',
      header: 'Created',
      width: 'w-32',
      cell: (pkg) => (
        <span className="text-xs text-muted-foreground">
          {new Date(pkg.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (pkg) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onNavigate(pkg)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(pkg)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(pkg)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]
}
