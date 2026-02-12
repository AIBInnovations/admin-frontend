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
  Search, Download, MoreVertical, CreditCard, IndianRupee,
  CheckCircle2, AlertCircle, Eye, FileText, CalendarPlus, RotateCcw,
} from 'lucide-react'
import { mockPurchases } from '@/lib/mock-data'

export function PurchasesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = mockPurchases.filter((p) => {
    const matchesSearch =
      !search ||
      p.user_name.toLowerCase().includes(search.toLowerCase()) ||
      p.package_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.zoho_payment_id && p.zoho_payment_id.toLowerCase().includes(search.toLowerCase()))
    const matchesStatus =
      statusFilter === 'all' || p.payment_status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPurchases = mockPurchases.length
  const totalRevenue = mockPurchases
    .filter((p) => p.payment_status === 'completed')
    .reduce((sum, p) => sum + p.amount_paid, 0)
  const completedCount = mockPurchases.filter((p) => p.payment_status === 'completed').length
  const pendingFailedCount = mockPurchases.filter(
    (p) => p.payment_status === 'pending' || p.payment_status === 'failed'
  ).length

  const statusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20">
            Completed
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20">
            Pending
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20">
            Failed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="View and manage all user purchases and subscriptions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Commerce' },
          { label: 'Purchases' },
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPurchases}</p>
              <p className="text-xs text-muted-foreground">Total Purchases</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{`₹${totalRevenue.toLocaleString('en-IN')}`}</p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingFailedCount}</p>
              <p className="text-xs text-muted-foreground">Pending / Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search user, package, Zoho ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Zoho ID</TableHead>
              <TableHead>Purchased</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((purchase) => (
              <TableRow key={purchase._id}>
                <TableCell className="text-sm font-medium">{purchase.user_name}</TableCell>
                <TableCell className="text-sm">{purchase.package_name}</TableCell>
                <TableCell className="text-sm font-medium">
                  {`₹${purchase.amount_paid.toLocaleString('en-IN')}`}
                </TableCell>
                <TableCell>{statusBadge(purchase.payment_status)}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px]">
                    {purchase.payment_gateway.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {purchase.zoho_payment_id || '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(purchase.purchased_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(purchase.expires_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      purchase.is_active ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
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
                        <FileText className="mr-2 h-4 w-4" />View Invoice
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <CalendarPlus className="mr-2 h-4 w-4" />Extend Subscription
                      </DropdownMenuItem>
                      {purchase.payment_status === 'completed' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <RotateCcw className="mr-2 h-4 w-4" />Refund
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
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {totalPurchases} purchases
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  )
}
