import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { BookOrder } from '@/services/bookOrders.service'
import { MoreVertical, Eye, Truck } from 'lucide-react'

const orderStatusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  confirmed: 'bg-blue-500/10 text-blue-600 border-blue-200',
  processing: 'bg-violet-500/10 text-violet-600 border-violet-200',
  shipped: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  delivered: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  cancelled: 'bg-red-500/10 text-red-600 border-red-200',
}

interface BookOrdersColumnsProps {
  onViewDetails: (order: BookOrder) => void
  onUpdateShipping: (order: BookOrder) => void
}

export function useBookOrdersColumns({
  onViewDetails,
  onUpdateShipping,
}: BookOrdersColumnsProps): ColumnDef<BookOrder>[] {
  return [
    {
      id: 'order',
      header: 'Order',
      cell: (order) => (
        <div className="min-w-0">
          <p className="text-sm font-medium font-mono">{order.order_number}</p>
          <p className="text-xs text-muted-foreground">{order.recipient_name}</p>
        </div>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      cell: (order) => (
        <div className="min-w-0">
          <p className="text-sm truncate">{order.items[0]?.title || '—'}</p>
          {order.items.length > 1 && (
            <p className="text-xs text-muted-foreground">+{order.items.length - 1} more</p>
          )}
        </div>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      width: 'w-24',
      cell: (order) => (
        <span className="text-sm font-medium">₹{order.total_amount.toLocaleString('en-IN')}</span>
      ),
    },
    {
      id: 'orderStatus',
      header: 'Order Status',
      width: 'w-28',
      cell: (order) => (
        <Badge className={`text-[10px] capitalize ${orderStatusColors[order.order_status] || ''}`}>
          {order.order_status}
        </Badge>
      ),
    },
    {
      id: 'tracking',
      header: 'Tracking',
      width: 'w-28',
      cell: (order) => (
        order.tracking_number ? (
          <div className="min-w-0">
            <p className="text-xs font-mono truncate">{order.tracking_number}</p>
            <p className="text-[10px] text-muted-foreground">{order.courier_name}</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )
      ),
    },
    {
      id: 'date',
      header: 'Date',
      width: 'w-28',
      cell: (order) => (
        <span className="text-xs text-muted-foreground">
          {new Date(order.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (order) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails(order)}>
              <Eye className="mr-2 h-4 w-4" />View Details
            </DropdownMenuItem>
            {(order.order_status === 'processing' || order.order_status === 'confirmed') && (
              <DropdownMenuItem onClick={() => onUpdateShipping(order)}>
                <Truck className="mr-2 h-4 w-4" />Update Shipping
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
