import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search, Download, MoreVertical, IndianRupee, CreditCard, Smartphone,
  Building2, Wallet, Eye, RotateCcw, Copy, CheckCircle2, Clock,
  XCircle, RefreshCw,
} from 'lucide-react'
import { mockPayments } from '@/lib/mock-data'

const methodIcons: Record<string, typeof CreditCard> = {
  upi: Smartphone,
  card: CreditCard,
  netbanking: Building2,
  wallet: Wallet,
}

const methodLabels: Record<string, string> = {
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net Banking',
  wallet: 'Wallet',
}

const statusConfig: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  success: { label: 'Success', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20', icon: CheckCircle2 },
  pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20', icon: Clock },
  failed: { label: 'Failed', className: 'bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20', icon: XCircle },
  refunded: { label: 'Refunded', className: 'bg-purple-500/10 text-purple-600 border-purple-200 hover:bg-purple-500/20', icon: RefreshCw },
}

const typeColors: Record<string, string> = {
  package: 'bg-blue-500/10 text-blue-600 border-blue-200',
  book: 'bg-purple-500/10 text-purple-600 border-purple-200',
  session: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
}

export function PaymentsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')

  const filtered = mockPayments.filter((p) => {
    const matchesSearch =
      !search ||
      p.user_name.toLowerCase().includes(search.toLowerCase()) ||
      p.transaction_id.toLowerCase().includes(search.toLowerCase()) ||
      p.item_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.payment_id && p.payment_id.toLowerCase().includes(search.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    const matchesMethod = methodFilter === 'all' || p.method === methodFilter
    return matchesSearch && matchesStatus && matchesMethod
  })

  const totalAmount = mockPayments.filter((p) => p.status === 'success').reduce((s, p) => s + p.amount, 0)
  const successCount = mockPayments.filter((p) => p.status === 'success').length
  const pendingCount = mockPayments.filter((p) => p.status === 'pending').length
  const failedCount = mockPayments.filter((p) => p.status === 'failed').length
  const refundedAmount = mockPayments.filter((p) => p.status === 'refunded').reduce((s, p) => s + p.amount, 0)

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Track all payment transactions across the platform"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Commerce' },
          { label: 'Payments' },
        ]}
        action={
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />Export
          </Button>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0000C8]/10">
              <IndianRupee className="h-5 w-5 text-[#0000C8]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{`₹${totalAmount.toLocaleString('en-IN')}`}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Total Collected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{successCount}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Successful</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingCount + failedCount}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Pending / Failed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <RefreshCw className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{`₹${refundedAmount.toLocaleString('en-IN')}`}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Refunded</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <Input
            placeholder="Search user, transaction ID, item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="netbanking">Net Banking</SelectItem>
            <SelectItem value="wallet">Wallet</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[hsl(var(--border))]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((payment) => {
              const MethodIcon = methodIcons[payment.method] || CreditCard
              const status = statusConfig[payment.status]
              const StatusIcon = status.icon
              return (
                <TableRow key={payment._id}>
                  <TableCell>
                    <span className="font-mono text-xs">{payment.transaction_id}</span>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{payment.user_name}</TableCell>
                  <TableCell className="max-w-[160px] truncate text-sm">{payment.item_name}</TableCell>
                  <TableCell>
                    <Badge className={`${typeColors[payment.purchase_type]} text-[10px] capitalize`}>
                      {payment.purchase_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-semibold">
                    {`₹${payment.amount.toLocaleString('en-IN')}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <MethodIcon className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-xs">{methodLabels[payment.method]}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-[hsl(var(--muted-foreground))]">
                    {payment.method === 'upi' && payment.upi_id ? payment.upi_id : null}
                    {payment.method === 'card' && payment.card_last4 ? `•••• ${payment.card_last4}` : null}
                    {payment.method === 'netbanking' && payment.bank_name ? payment.bank_name : null}
                    {payment.method === 'wallet' ? 'Wallet' : null}
                    {!payment.upi_id && !payment.card_last4 && !payment.bank_name && payment.method !== 'wallet' ? '—' : null}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${status.className} text-[10px]`}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[hsl(var(--muted-foreground))]">
                    {new Date(payment.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                    <br />
                    <span className="text-[10px]">
                      {new Date(payment.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />Copy Transaction ID
                        </DropdownMenuItem>
                        {payment.payment_id && (
                          <DropdownMenuItem>
                            <Building2 className="mr-2 h-4 w-4" />View in Zoho
                          </DropdownMenuItem>
                        )}
                        {payment.status === 'success' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <RotateCcw className="mr-2 h-4 w-4" />Initiate Refund
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Showing {filtered.length} of {mockPayments.length} transactions
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  )
}
