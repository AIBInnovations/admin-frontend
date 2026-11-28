import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { StatusPill } from '@/components/common/detail'
import { formatINR } from '@/lib/format'
import { Invoice } from '@/services/invoices.service'
import { MoreVertical, Download, Mail, RefreshCw } from 'lucide-react'
import { INVOICE_STATUS, TYPE_LABEL, istDay } from './components/labels'
import { StudentLink } from '@/components/students/StudentLink'

interface InvoicesColumnsProps {
  onDownload: (invoice: Invoice) => void
  /** Left out when the admin may not change invoices. */
  onRegenerate?: (invoice: Invoice) => void
  onEmail?: (invoice: Invoice) => void
  busyId: string | null
}

export function useInvoicesColumns({
  onDownload,
  onRegenerate,
  onEmail,
  busyId,
}: InvoicesColumnsProps): ColumnDef<Invoice>[] {
  return [
    {
      id: 'invoice',
      header: 'Invoice',
      cell: (inv) => (
        <div className="min-w-[160px] max-w-[280px]">
          <p className="truncate font-mono text-sm font-medium" title={inv.invoice_number}>{inv.invoice_number}</p>
          <p className="truncate text-xs text-muted-foreground">
            <StudentLink student={typeof inv.user_id === 'string' ? { _id: inv.user_id } : inv.user_id} fallback="Student" from="Invoices" className="text-xs" />
          </p>
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      width: 'w-24',
      cell: (inv) => <span className="text-sm">{TYPE_LABEL[inv.purchase_type] || inv.purchase_type}</span>,
    },
    {
      id: 'amount',
      header: 'Amount',
      width: 'w-32',
      cell: (inv) => (
        <div className="whitespace-nowrap tabular-nums">
          <p className="text-sm font-medium">{formatINR(inv.amount)}</p>
          {inv.gst_amount > 0 && (
            <p className="text-xs text-muted-foreground">incl. {formatINR(inv.gst_amount)} GST</p>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-28',
      cell: (inv) => {
        const s = INVOICE_STATUS[inv.payment_status]
        return <StatusPill tone={s?.tone}>{s?.label || inv.payment_status}</StatusPill>
      },
    },
    {
      id: 'date',
      header: 'Date',
      width: 'w-28',
      cell: (inv) => <span className="whitespace-nowrap text-xs text-muted-foreground">{istDay(inv.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (inv) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${inv.invoice_number}`} disabled={busyId === inv._id}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onDownload(inv)}>
              <Download className="mr-2 h-4 w-4" />Download PDF
            </DropdownMenuItem>
            {onRegenerate && (
              <DropdownMenuItem onClick={() => onRegenerate(inv)}>
                <RefreshCw className="mr-2 h-4 w-4" />Regenerate
              </DropdownMenuItem>
            )}
            {onEmail && (
              <DropdownMenuItem onClick={() => onEmail(inv)}>
                <Mail className="mr-2 h-4 w-4" />Email again
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
