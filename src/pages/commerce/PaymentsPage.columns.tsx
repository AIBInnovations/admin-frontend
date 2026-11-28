import { ColumnDef } from '@/components/common/DataTable'
import { Transaction } from '@/services/payments.service'
import { StatusPill } from '@/components/common/detail'
import { AmountCell, DateCell, ItemCell, StatusCell, StudentCell } from './components/cells'
import { GATEWAY_LABEL, TYPE_LABEL } from './components/labels'

export function usePaymentsColumns(): ColumnDef<Transaction>[] {
  return [
    {
      id: 'user',
      header: 'User',
      cell: (tx) => <StudentCell user={tx.user} from="Payments" />,
    },
    {
      id: 'item',
      header: 'Item',
      cell: (tx) => (
        <div className="flex items-start gap-2">
          <ItemCell tx={tx} />
          {(tx as Transaction & { is_test?: boolean }).is_test && <StatusPill tone="warning" className="shrink-0">Test</StatusPill>}
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      width: 'w-24',
      cell: (tx) => <span className="text-sm">{TYPE_LABEL[tx.purchase_type]}</span>,
    },
    {
      id: 'amount',
      header: 'Amount',
      width: 'w-24',
      cell: (tx) => <AmountCell tx={tx} />,
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-28',
      cell: (tx) => <StatusCell tx={tx} />,
    },
    {
      id: 'gateway',
      header: 'Gateway',
      width: 'w-28',
      cell: (tx) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">{GATEWAY_LABEL[tx.payment_gateway] || '—'}</span>
      ),
    },
    {
      id: 'ids',
      header: 'Payment and session',
      cell: (tx) => (
        <div className="max-w-[170px] font-mono text-xs text-muted-foreground">
          <p className="truncate" title={tx.zoho_payment_id || undefined}>{tx.zoho_payment_id || 'No payment id'}</p>
          <p className="truncate" title={tx.zoho_payment_session_id || undefined}>{tx.zoho_payment_session_id || '—'}</p>
        </div>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      width: 'w-28',
      cell: (tx) => <DateCell iso={tx.at || tx.createdAt} />,
    },
  ]
}
