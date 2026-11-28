import { Link } from 'react-router-dom'
import { FileCheck2 } from 'lucide-react'
import { ColumnDef } from '@/components/common/DataTable'
import { Transaction } from '@/services/payments.service'
import { StatusPill } from '@/components/common/detail'
import { AmountCell, DateCell, ItemCell, StatusCell, StudentCell } from './components/cells'
import { GATEWAY_LABEL, TYPE_LABEL, istDay } from './components/labels'

/** Added 27 Nov 2026: a tester's INR 1 order, and a row a tester reset ended. */
type TestFlags = { is_test?: boolean; ended_by_tester_reset?: boolean }
const flags = (tx: Transaction) => tx as Transaction & TestFlags

export function usePurchasesColumns(type: string): ColumnDef<Transaction>[] {
  const oneType = type !== 'all'
  const columns: (ColumnDef<Transaction> | false)[] = [
    {
      id: 'user',
      header: 'User',
      cell: (tx) => <StudentCell user={tx.user} from="Purchases" />,
    },
    {
      id: 'package',
      header: type === 'package' ? 'Package' : 'Item',
      cell: (tx) => (
        <div className="flex items-start gap-2">
          <ItemCell tx={tx} />
          {flags(tx).is_test && <StatusPill tone="warning" className="shrink-0">Test</StatusPill>}
        </div>
      ),
    },
    !oneType && {
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
      cell: (tx) => (flags(tx).ended_by_tester_reset
        ? <StatusPill tone="neutral">Ended by reset</StatusPill>
        : <StatusCell tx={tx} />),
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
      id: 'zohoId',
      header: 'Zoho ID',
      width: 'w-32',
      cell: (tx) => (
        <span className="block max-w-[130px] truncate font-mono text-xs text-muted-foreground" title={tx.zoho_payment_id || undefined}>
          {tx.zoho_payment_id || '—'}
        </span>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      width: 'w-28',
      cell: (tx) => <DateCell iso={tx.at || tx.createdAt} />,
    },
    (type === 'package' || type === 'all') && {
      id: 'access',
      header: 'Access until',
      headerClassName: 'whitespace-nowrap',
      width: 'w-28',
      cell: (tx) => {
        if (tx.purchase_type !== 'package' || tx.payment_status !== 'completed' || tx.is_revoked) return <span className="text-xs text-muted-foreground">—</span>
        const ended = !!tx.expires_at && new Date(tx.expires_at) <= new Date()
        return <span className={`whitespace-nowrap text-xs ${ended || !tx.is_active ? 'text-muted-foreground' : 'text-foreground'}`}>{istDay(tx.expires_at) || '—'}{ended ? ' (ended)' : ''}</span>
      },
    },
    {
      id: 'delivery',
      header: '',
      width: 'w-28',
      cell: (tx) =>
        tx.payment_status === 'completed' && !tx.bundled && (tx.purchase_type === 'package' || tx.purchase_type === 'ebook') ? (
          <Link
            to={`/commerce/delivery-notes?purchase_type=${tx.purchase_type}&purchase_id=${tx.transaction_id}`}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-1 text-xs font-medium text-primary hover:bg-accent pointer-coarse:-my-2 pointer-coarse:min-h-10"
          >
            <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />Delivery note
          </Link>
        ) : null,
    },
  ]
  return columns.filter((c): c is ColumnDef<Transaction> => !!c)
}
