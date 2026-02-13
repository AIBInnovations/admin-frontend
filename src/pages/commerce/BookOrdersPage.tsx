import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { BookCopy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { bookOrdersService, BookOrder } from '@/services/bookOrders.service'
import { useBookOrdersColumns } from './BookOrdersPage.columns'

const orderStatusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  confirmed: 'bg-blue-500/10 text-blue-600 border-blue-200',
  processing: 'bg-violet-500/10 text-violet-600 border-violet-200',
  shipped: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  delivered: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  cancelled: 'bg-red-500/10 text-red-600 border-red-200',
}

export function BookOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [orders, setOrders] = useState<BookOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [paymentFilter, setPaymentFilter] = useState(searchParams.get('payment') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Dialogs
  const [detailOrder, setDetailOrder] = useState<BookOrder | null>(null)
  const [shippingOrder, setShippingOrder] = useState<BookOrder | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [courierName, setCourierName] = useState('')
  const [shippingSubmitting, setShippingSubmitting] = useState(false)

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const response = await bookOrdersService.getAll({
        page: currentPage,
        limit: 20,
        order_status: statusFilter !== 'all' ? statusFilter : undefined,
        payment_status: paymentFilter !== 'all' ? paymentFilter : undefined,
      })

      if (response.success && response.data) {
        setOrders(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load book orders')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, statusFilter, paymentFilter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (statusFilter !== 'all') params.status = statusFilter
    if (paymentFilter !== 'all') params.payment = paymentFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [statusFilter, paymentFilter, currentPage, setSearchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, paymentFilter])

  // Handlers
  const handleViewDetails = (order: BookOrder) => {
    setDetailOrder(order)
  }

  const handleUpdateShipping = (order: BookOrder) => {
    setShippingOrder(order)
    setTrackingNumber(order.tracking_number || '')
    setCourierName(order.courier_name || '')
  }

  const handleShippingSubmit = async () => {
    if (!shippingOrder || !trackingNumber.trim() || !courierName.trim()) return
    try {
      setShippingSubmitting(true)
      const response = await bookOrdersService.updateShipping(
        shippingOrder._id, trackingNumber.trim(), courierName.trim(),
      )
      if (response.success) {
        toast.success('Shipping info updated successfully')
        setShippingOrder(null)
        fetchOrders()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update shipping')
    } finally {
      setShippingSubmitting(false)
    }
  }

  // Filters
  const filters: FilterConfig[] = [
    {
      key: 'status',
      label: 'Order Status',
      type: 'select',
      options: [
        { label: 'All Status', value: 'all' },
        { label: 'Pending', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Processing', value: 'processing' },
        { label: 'Shipped', value: 'shipped' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      placeholder: 'Filter by order status',
      defaultValue: 'all',
    },
    {
      key: 'payment',
      label: 'Payment',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Completed', value: 'completed' },
        { label: 'Pending', value: 'pending' },
        { label: 'Failed', value: 'failed' },
      ],
      placeholder: 'Filter by payment',
      defaultValue: 'all',
    },
  ]

  const columns = useBookOrdersColumns({
    onViewDetails: handleViewDetails,
    onUpdateShipping: handleUpdateShipping,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Book Orders"
        description="Manage physical book orders, shipping, and delivery tracking"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Commerce' },
          { label: 'Book Orders' },
        ]}
      />

      <SearchWithFilters
        value=""
        onChange={() => {}}
        placeholder="Filter orders..."
        filters={filters}
        activeFilters={{ status: statusFilter, payment: paymentFilter }}
        onFiltersChange={(f) => {
          if (f.status !== undefined) setStatusFilter(f.status)
          if (f.payment !== undefined) setPaymentFilter(f.payment)
        }}
      />

      <DataTable
        data={orders}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: BookCopy,
          title: statusFilter !== 'all' || paymentFilter !== 'all'
            ? 'No orders found matching your filters'
            : 'No book orders yet',
          description: statusFilter === 'all' && paymentFilter === 'all'
            ? 'Book orders will appear here when users purchase physical books'
            : undefined,
        }}
        getRowKey={(order) => order._id}
      />

      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{detailOrder?.order_number}
            </DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Recipient</p>
                  <p className="font-medium">{detailOrder.recipient_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{detailOrder.shipping_phone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">{detailOrder.shipping_address}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Items</p>
                <div className="space-y-2">
                  {detailOrder.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.title} x{item.quantity}</span>
                      <span className="font-medium">₹{item.price_at_purchase.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{detailOrder.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{detailOrder.shipping_cost === 0 ? 'Free' : `₹${detailOrder.shipping_cost.toLocaleString('en-IN')}`}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1 border-t">
                  <span>Total</span>
                  <span>₹{detailOrder.total_amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="border-t pt-4 flex gap-2">
                <Badge className={`text-[10px] capitalize ${orderStatusColors[detailOrder.order_status] || ''}`}>
                  {detailOrder.order_status}
                </Badge>
                {detailOrder.tracking_number && (
                  <span className="text-xs text-muted-foreground">
                    Tracking: {detailOrder.tracking_number} ({detailOrder.courier_name})
                  </span>
                )}
              </div>

              {/* Status Update */}
              {detailOrder.order_status !== 'delivered' && detailOrder.order_status !== 'cancelled' && (
                <div className="border-t pt-4">
                  <Label className="text-sm">Update Status</Label>
                  <Select
                    value={detailOrder.order_status}
                    onValueChange={async (newStatus) => {
                      try {
                        const response = await bookOrdersService.updateStatus(detailOrder._id, newStatus)
                        if (response.success) {
                          toast.success(`Order status updated to ${newStatus}`)
                          setDetailOrder(null)
                          fetchOrders()
                        }
                      } catch (error: any) {
                        toast.error(error.message || 'Failed to update status')
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOrder(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Shipping Dialog */}
      <Dialog open={!!shippingOrder} onOpenChange={() => setShippingOrder(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Update Shipping</DialogTitle>
            <DialogDescription>
              Add tracking info for order #{shippingOrder?.order_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tracking_number">Tracking Number</Label>
              <Input
                id="tracking_number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                disabled={shippingSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="courier_name">Courier Name</Label>
              <Input
                id="courier_name"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="e.g. Delhivery, BlueDart"
                disabled={shippingSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShippingOrder(null)} disabled={shippingSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleShippingSubmit}
              disabled={shippingSubmitting || !trackingNumber.trim() || !courierName.trim()}
            >
              {shippingSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
              ) : (
                'Update Shipping'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
