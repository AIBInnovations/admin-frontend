import { Badge } from '@/components/ui/badge'
import { ColumnDef } from '@/components/common/DataTable'
import { Transaction } from '@/services/payments.service'

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  failed: 'bg-red-500/10 text-red-600 border-red-200',
  refunded: 'bg-purple-500/10 text-purple-600 border-purple-200',
}

const typeColors: Record<string, string> = {
  package: 'bg-blue-500/10 text-blue-600 border-blue-200',
  session: 'bg-violet-500/10 text-violet-600 border-violet-200',
  book: 'bg-orange-500/10 text-orange-600 border-orange-200',
}

export function usePaymentsColumns(): ColumnDef<Transaction>[] {
  return [
    {
      id: 'user',
      header: 'User',
      cell: (tx) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{tx.user?.name || '—'}</p>
          <p className="text-xs text-muted-foreground truncate">{tx.user?.email || tx.user?.phone_number || '—'}</p>
        </div>
      ),
    },
    {
      id: 'item',
      header: 'Item',
      cell: (tx) => (
        <span className="text-sm truncate max-w-[200px] block">{tx.item_name}</span>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      width: 'w-24',
      cell: (tx) => (
        <Badge className={`text-[10px] capitalize ${typeColors[tx.purchase_type] || ''}`}>
          {tx.purchase_type}
        </Badge>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      width: 'w-24',
      cell: (tx) => (
        <span className="text-sm font-medium">
          {tx.currency === 'INR' ? '₹' : tx.currency}{tx.amount.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-28',
      cell: (tx) => (
        <Badge className={`text-[10px] capitalize ${statusColors[tx.payment_status] || ''}`}>
          {tx.payment_status}
        </Badge>
      ),
    },
    {
      id: 'gateway',
      header: 'Gateway',
      width: 'w-28',
      cell: (tx) => (
        <span className="text-xs text-muted-foreground">{tx.payment_gateway?.replace('_', ' ')}</span>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      width: 'w-28',
      cell: (tx) => (
        <span className="text-xs text-muted-foreground">
          {new Date(tx.purchased_at || tx.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
      ),
    },
  ]
}
