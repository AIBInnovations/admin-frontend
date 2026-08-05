import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { Coupon } from '@/services/coupons.service'
import { MoreVertical, Pencil, Trash2, Power, Ticket } from 'lucide-react'

interface CouponsColumnsProps {
  onEdit: (coupon: Coupon) => void
  onToggle: (coupon: Coupon) => void
  onDelete: (coupon: Coupon) => void
}

export function useCouponsColumns({ onEdit, onToggle, onDelete }: CouponsColumnsProps): ColumnDef<Coupon>[] {
  return [
    {
      id: 'code',
      header: 'Coupon',
      cell: (c) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-muted shrink-0">
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-mono font-semibold truncate">{c.code}</p>
            {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
          </div>
        </div>
      ),
    },
    {
      id: 'discount',
      header: 'Discount',
      width: 'w-28',
      cell: (c) => (
        <div className="text-sm">
          <span className="font-medium">
            {c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value}`}
          </span>
          {c.discount_type === 'percentage' && c.max_discount_cap ? (
            <p className="text-xs text-muted-foreground">up to ₹{c.max_discount_cap}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'applies_to',
      header: 'Applies To',
      width: 'w-40',
      cell: (c) => {
        if (c.applies_to === 'all') return <Badge className="text-[10px] bg-gray-500/10 text-gray-600 border-gray-200">All products</Badge>
        if (c.applies_to === 'type') {
          return (
            <div className="flex flex-wrap gap-1">
              {(c.applicable_types || []).map((t) => (
                <Badge key={t} className="text-[10px] capitalize bg-blue-500/10 text-blue-600 border-blue-200">{t}</Badge>
              ))}
            </div>
          )
        }
        return <Badge className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-200">{(c.applicable_products || []).length} product(s)</Badge>
      },
    },
    {
      id: 'usage',
      header: 'Usage',
      width: 'w-28',
      cell: (c) => (
        <div className="text-xs">
          <span className="font-mono">{c.redemption_count}{c.max_redemptions != null ? ` / ${c.max_redemptions}` : ''}</span>
          {c.per_user_limit != null && <p className="text-muted-foreground">{c.per_user_limit}/user</p>}
          {c.min_order_value > 0 && <p className="text-muted-foreground">min ₹{c.min_order_value}</p>}
        </div>
      ),
    },
    {
      id: 'expiry',
      header: 'Expiry',
      width: 'w-28',
      cell: (c) => (
        <span className="text-xs text-muted-foreground">
          {c.expiry_at ? new Date(c.expiry_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No expiry'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-24',
      cell: (c) => (
        <Badge className={`text-[10px] ${c.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-red-500/10 text-red-600 border-red-200'}`}>
          {c.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (c) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(c)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggle(c)}><Power className="mr-2 h-4 w-4" />{c.is_active ? 'Deactivate' : 'Activate'}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(c)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
