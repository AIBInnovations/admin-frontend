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
  Search, Download, MoreVertical, BookCopy, PackageCheck, Truck, Clock,
  Eye, RefreshCw, MapPin, Printer,
} from 'lucide-react'
import { mockBookOrders } from '@/lib/mock-data'

export function BookOrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = mockBookOrders.filter((order) => {
    const matchesSearch =
      !search ||
      order.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
      order.order_number.toLowerCase().includes(search.toLowerCase()) ||
      order.items.some((item) => item.title.toLowerCase().includes(search.toLowerCase()))
    const matchesStatus =
      statusFilter === 'all' || order.order_status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalOrders = mockBookOrders.length
  const processingCount = mockBookOrders.filter((o) => o.order_status === 'processing').length
  const shippedCount = mockBookOrders.filter((o) => o.order_status === 'shipped').length
  const deliveredCount = mockBookOrders.filter((o) => o.order_status === 'delivered').length

  const orderStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20">
            Processing
          </Badge>
        )
      case 'shipped':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 hover:bg-blue-500/20">
            Shipped
          </Badge>
        )
      case 'delivered':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20">
            Delivered
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatItems = (items: typeof mockBookOrders[0]['items']) => {
    if (items.length === 0) return '—'
    const first = items[0].title
    if (items.length === 1) return first
    return `${first} + ${items.length - 1} more`
  }

  return (
    <div>
      <PageHeader
        title="Book Orders"
        description="Manage physical book orders, shipping, and delivery tracking"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Commerce' },
          { label: 'Book Orders' },
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
              <BookCopy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalOrders}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{processingCount}</p>
              <p className="text-xs text-muted-foreground">Processing</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{shippedCount}</p>
              <p className="text-xs text-muted-foreground">Shipped</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <PackageCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{deliveredCount}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search order #, customer, book title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Order Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Subtotal</TableHead>
              <TableHead>Shipping</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Order Status</TableHead>
              <TableHead>Tracking</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((order) => (
              <TableRow key={order._id}>
                <TableCell className="text-sm font-mono font-medium">
                  {order.order_number}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{order.recipient_name}</p>
                    <p className="text-xs text-muted-foreground">{order.shipping_phone}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm max-w-[180px] truncate">
                  {formatItems(order.items)}
                </TableCell>
                <TableCell className="text-sm">
                  {`₹${order.subtotal.toLocaleString('en-IN')}`}
                </TableCell>
                <TableCell className="text-sm">
                  {order.shipping_cost === 0 ? (
                    <span className="text-emerald-600 font-medium">Free</span>
                  ) : (
                    `₹${order.shipping_cost.toLocaleString('en-IN')}`
                  )}
                </TableCell>
                <TableCell className="text-sm font-bold">
                  {`₹${order.total_amount.toLocaleString('en-IN')}`}
                </TableCell>
                <TableCell>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20 text-[10px]">
                    {order.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>{orderStatusBadge(order.order_status)}</TableCell>
                <TableCell>
                  {order.tracking_number ? (
                    <div>
                      <p className="text-xs font-mono">{order.tracking_number}</p>
                      <p className="text-[10px] text-muted-foreground">{order.courier_name}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString('en-IN', {
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
                        <Eye className="mr-2 h-4 w-4" />View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <RefreshCw className="mr-2 h-4 w-4" />Update Status
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <MapPin className="mr-2 h-4 w-4" />Add Tracking
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Printer className="mr-2 h-4 w-4" />Print Label
                      </DropdownMenuItem>
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
          Showing {filtered.length} of {totalOrders} orders
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  )
}
