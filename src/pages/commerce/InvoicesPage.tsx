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
  Search, Download, MoreVertical, FileText, IndianRupee, AlertTriangle,
  FileDown, Send, ExternalLink, CheckCircle,
} from 'lucide-react'
import { mockInvoices } from '@/lib/mock-data'

export function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = mockInvoices.filter((inv) => {
    const matchesSearch =
      !search ||
      inv.user_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.item_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' || inv.payment_status === statusFilter
    const matchesType =
      typeFilter === 'all' || inv.purchase_type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const totalInvoices = mockInvoices.length
  const paidAmount = mockInvoices
    .filter((inv) => inv.payment_status === 'paid')
    .reduce((sum, inv) => sum + inv.amount + inv.gst_amount, 0)
  const unpaidAmount = mockInvoices
    .filter((inv) => inv.payment_status === 'unpaid')
    .reduce((sum, inv) => sum + inv.amount + inv.gst_amount, 0)

  const typeBadge = (type: string) => {
    switch (type) {
      case 'package':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20">
            Package
          </Badge>
        )
      case 'book':
        return (
          <Badge className="bg-purple-500/10 text-purple-600 border-purple-200 hover:bg-purple-500/20">
            Book
          </Badge>
        )
      case 'session':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20">
            Session
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const paymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20">
            Paid
          </Badge>
        )
      case 'unpaid':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20">
            Unpaid
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="View and manage all payment invoices and GST records"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Commerce' },
          { label: 'Invoices' },
        ]}
        action={
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />Export All
          </Button>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0000C8]/10">
              <FileText className="h-5 w-5 text-[#0000C8]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalInvoices}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Total Invoices</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{`₹${paidAmount.toLocaleString('en-IN')}`}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Paid Amount</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{`₹${unpaidAmount.toLocaleString('en-IN')}`}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Unpaid Amount</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <Input
            placeholder="Search invoice #, user, item..."
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
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="package">Package</SelectItem>
            <SelectItem value="book">Book</SelectItem>
            <SelectItem value="session">Session</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[hsl(var(--border))]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>GST</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Zoho ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((invoice) => (
              <TableRow key={invoice._id}>
                <TableCell className="text-sm font-mono font-medium">
                  {invoice.invoice_number}
                </TableCell>
                <TableCell className="text-sm">{invoice.user_name}</TableCell>
                <TableCell className="text-sm">{invoice.item_name}</TableCell>
                <TableCell>{typeBadge(invoice.purchase_type)}</TableCell>
                <TableCell className="text-sm">
                  {`₹${invoice.amount.toLocaleString('en-IN')}`}
                </TableCell>
                <TableCell className="text-sm text-[hsl(var(--muted-foreground))]">
                  {`₹${invoice.gst_amount.toLocaleString('en-IN')}`}
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {`₹${(invoice.amount + invoice.gst_amount).toLocaleString('en-IN')}`}
                </TableCell>
                <TableCell>{paymentBadge(invoice.payment_status)}</TableCell>
                <TableCell className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                  {invoice.zoho_invoice_id || '—'}
                </TableCell>
                <TableCell className="text-xs text-[hsl(var(--muted-foreground))]">
                  {new Date(invoice.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
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
                        <FileDown className="mr-2 h-4 w-4" />Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Send className="mr-2 h-4 w-4" />Send to Customer
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ExternalLink className="mr-2 h-4 w-4" />View in Zoho
                      </DropdownMenuItem>
                      {invoice.payment_status === 'unpaid' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-emerald-600">
                            <CheckCircle className="mr-2 h-4 w-4" />Mark as Paid
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Showing {filtered.length} of {totalInvoices} invoices
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  )
}
