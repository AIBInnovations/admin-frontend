import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { Coupon } from '@/services/coupons.service'
import { MoreVertical, Pencil, Trash2, Power, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { formatCount, formatDay } from '@/lib/format'
import { discountDetail, discountHeadline, scopeSummary, targetLines } from '@/lib/couponCopy'
import { CouponStatePill, couponState } from '@/components/coupons/CouponTicket'

interface CouponsColumnsProps {
  onEdit: (coupon: Coupon) => void
  onToggle: (coupon: Coupon) => void
  onDelete: (coupon: Coupon) => void
}

export function useCouponsColumns({ onEdit, onToggle, onDelete }: CouponsColumnsProps): ColumnDef<Coupon>[] {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('coupons.update')
  const canDelete = hasPermission('coupons.delete')

  return [
    {
      id: 'code',
      header: 'Code',
      cell: (c) => (
        <div className="min-w-0">
          <p translate="no" className="truncate font-mono text-sm font-semibold tracking-[0.04em]">{c.code}</p>
          {c.description && <p className="max-w-[260px] truncate text-xs text-muted-foreground">{c.description}</p>}
        </div>
      ),
    },
    {
      id: 'discount',
      header: 'Discount',
      width: 'w-32',
      cell: (c) => (
        <div className="whitespace-nowrap">
          <span className="font-mono text-sm font-semibold" data-numeric>{discountHeadline(c)}</span>
          <span className="ml-1 text-xs text-muted-foreground">{discountDetail(c)}</span>
        </div>
      ),
    },
    {
      id: 'applies_to',
      header: 'Applies to',
      cell: (c) => {
        // Names come from the admin API. A backend older than tier targeting
        // sends bare IDs; show a count then, and the detail page resolves them.
        const named = (c.applicable_products || []).every((p) => !!p.product_name)
        const text = c.applies_to !== 'products' || named
          ? scopeSummary(c)
          : `${(c.applicable_products || []).length} chosen product${(c.applicable_products || []).length === 1 ? '' : 's'}`
        return (
          <p className="max-w-[340px] truncate text-sm" title={c.applies_to === 'products' && named ? targetLines(c).join('\n') : undefined}>
            {text}
          </p>
        )
      },
    },
    {
      id: 'usage',
      header: 'Used',
      width: 'w-32',
      cell: (c) => {
        const used = c.redemption_count || 0
        const cap = c.max_redemptions
        return (
          <div className="w-24">
            <p className="font-mono text-xs" data-numeric>
              {formatCount(used)}{cap != null ? <span className="text-muted-foreground"> / {formatCount(cap)}</span> : null}
            </p>
            {cap != null && cap > 0 && (
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (used / cap) * 100)}%` }} />
              </div>
            )}
          </div>
        )
      },
    },
    {
      id: 'expiry',
      header: 'Last day',
      width: 'w-32',
      cell: (c) => <span className="whitespace-nowrap text-xs text-muted-foreground">{c.expiry_at ? formatDay(c.expiry_at) : 'No end date'}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-32',
      cell: (c) => (
        <div className="flex flex-wrap items-center gap-1">
          <CouponStatePill state={couponState(c)} />
          {c.is_visible && <span className="text-[11px] text-muted-foreground" title="Suggested at checkout">Suggested</span>}
          {c.customer_scope === 'specific' && (
            <span
              className="rounded bg-warning-soft px-1.5 py-px text-[11px] font-medium text-warning"
              title={`Only for: ${(c.applicable_users || []).map((u) => u.name || u.email).join(', ')}`}
            >
              {(c.applicable_users || []).length} student{(c.applicable_users || []).length === 1 ? '' : 's'} only
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (c) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${c.code}`}><MoreVertical className="h-4 w-4" aria-hidden="true" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/commerce/coupons/${c._id}`)}><Eye className="mr-2 h-4 w-4" />Open</DropdownMenuItem>
            {canEdit && <DropdownMenuItem onClick={() => onEdit(c)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>}
            {canEdit && <DropdownMenuItem onClick={() => onToggle(c)}><Power className="mr-2 h-4 w-4" />{c.is_active ? 'Pause' : 'Make live'}</DropdownMenuItem>}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(c)} className="text-danger focus:text-danger"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
