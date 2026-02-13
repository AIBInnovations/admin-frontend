import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { Invoice } from '@/services/invoices.service'
import { MoreVertical, Download, RefreshCw } from 'lucide-react'

const statusColors: Record<string, string> = {
  paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  unpaid: 'bg-amber-500/10 text-amber-600 border-amber-200',
  partially_paid: 'bg-blue-500/10 text-blue-600 border-blue-200',
  void: 'bg-red-500/10 text-red-600 border-red-200',
}

const typeColors: Record<string, string> = {
  package: 'bg-blue-500/10 text-blue-600 border-blue-200',
  session: 'bg-violet-500/10 text-violet-600 border-violet-200',
  book: 'bg-orange-500/10 text-orange-600 border-orange-200',
}

interface InvoicesColumnsProps {
  onDownload: (invoice: Invoice) => void
  onRegenerate: (invoice: Invoice) => void
}

export function useInvoicesColumns({
  onDownload,
  onRegenerate,
}: InvoicesColumnsProps): ColumnDef<Invoice>[] {
  return [
    {
      id: 'invoice',
      header: 'Invoice',
      cell: (inv) => (
        <div className="min-w-0">
          <p className="text-sm font-medium font-mono">{inv.invoice_number}</p>
          <p className="text-xs text-muted-foreground">
            {typeof inv.user_id === 'object' ? inv.user_id.name : '—'}
          </p>
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      width: 'w-24',
      cell: (inv) => (
        <Badge className={`text-[10px] capitalize ${typeColors[inv.purchase_type] || ''}`}>
          {inv.purchase_type}
        </Badge>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      width: 'w-28',
      cell: (inv) => (
        <div>
          <p className="text-sm font-medium">₹{inv.amount.toLocaleString('en-IN')}</p>
          {inv.gst_amount > 0 && (
            <p className="text-[10px] text-muted-foreground">+₹{inv.gst_amount.toLocaleString('en-IN')} GST</p>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-28',
      cell: (inv) => (
        <Badge className={`text-[10px] capitalize ${statusColors[inv.payment_status] || ''}`}>
          {inv.payment_status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      width: 'w-28',
      cell: (inv) => (
        <span className="text-xs text-muted-foreground">
          {new Date(inv.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (inv) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {inv.invoice_url && (
              <DropdownMenuItem onClick={() => onDownload(inv)}>
                <Download className="mr-2 h-4 w-4" />Download PDF
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onRegenerate(inv)}>
              <RefreshCw className="mr-2 h-4 w-4" />Regenerate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
