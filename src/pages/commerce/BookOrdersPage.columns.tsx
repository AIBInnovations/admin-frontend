import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { StatusPill } from '@/components/common/detail'
import { formatINR } from '@/lib/format'
import { BookOrder } from '@/services/bookOrders.service'
import { MoreVertical, Eye, Truck } from 'lucide-react'
import { ORDER_STATUS, PAYMENT_STATUS, istDay } from './components/labels'
import { StudentLink } from '@/components/students/StudentLink'

interface BookOrdersColumnsProps {
  onViewDetails: (order: BookOrder) => void
  /** Left out when the admin may not change orders. */
  onUpdateShipping?: (order: BookOrder) => void
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
        <div className="min-w-[170px] max-w-[260px]">
          <p className="truncate font-mono text-sm font-medium">{order.order_number || 'No number'}</p>
          <p className="truncate text-xs"><StudentLink student={typeof order.user_id === 'string' ? { _id: order.user_id } : order.user_id} fallback="Student" from="Book orders" className="text-xs" /></p>
          {typeof order.user_id === 'object' && order.user_id && order.recipient_name && order.recipient_name.trim() !== (order.user_id.name || '').trim() && (
            <p className="truncate text-xs text-muted-foreground" title={order.recipient_name}>Ship to {order.recipient_name}</p>
          )}
        </div>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      cell: (order) => (
        <div className="min-w-[150px] max-w-[260px]">
          <p className="truncate text-sm" title={order.items[0]?.title}>{order.items[0]?.title || '—'}</p>
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
        <span className="whitespace-nowrap text-sm font-medium tabular-nums">{formatINR(order.total_amount)}</span>
      ),
    },
    {
      id: 'orderStatus',
      header: 'Order Status',
      width: 'w-28',
      cell: (order) => {
        const s = ORDER_STATUS[order.order_status]
        return <StatusPill tone={s?.tone}>{s?.label || order.order_status}</StatusPill>
      },
    },
    {
      id: 'payment',
      header: 'Payment',
      width: 'w-28',
      cell: (order) => {
        const s = PAYMENT_STATUS[order.payment_status]
        return <StatusPill tone={s?.tone}>{s?.label || order.payment_status}</StatusPill>
      },
    },
    {
      id: 'tracking',
      header: 'Tracking',
      width: 'w-28',
      cell: (order) => (
        order.tracking_number ? (
          <div className="max-w-[150px]">
            <p className="truncate font-mono text-xs">{order.tracking_number}</p>
            <p className="truncate text-xs text-muted-foreground">{order.courier_name}</p>
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
      cell: (order) => <span className="whitespace-nowrap text-xs text-muted-foreground">{istDay(order.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (order) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${order.order_number}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails(order)}>
              <Eye className="mr-2 h-4 w-4" />View Details
            </DropdownMenuItem>
            {onUpdateShipping && (order.order_status === 'processing' || order.order_status === 'confirmed' || order.order_status === 'shipped') && (
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
