import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DateRangeFilter, rangeFromParams, rangeToParams } from '@/components/common/DateRangeFilter'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { apiErrorMessage } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { BookCopy } from 'lucide-react'
import { formatINR } from '@/lib/format'
import { bookOrdersService, BookOrder, BookOrderListResult } from '@/services/bookOrders.service'
import { useBookOrdersColumns } from './BookOrdersPage.columns'
import { ClearFilters, Totals } from './components/filters'
import { useListUrl } from './components/useListUrl'

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
      { label: 'Refunded', value: 'refunded' },
    ],
    placeholder: 'Filter by payment',
    defaultValue: 'all',
  },
]

export function BookOrdersPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const url = useListUrl()
  const { params, page, setPage, update, search } = url
  const status = params.get('status') || 'all'
  const payment = params.get('payment') || 'all'
  const range = rangeFromParams(params, 'all')

  const [data, setData] = useState<BookOrderListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { nextFetchId, isStale } = useLatestFetch()

  const load = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await bookOrdersService.getAll({
        page,
        limit: 20,
        search: search || undefined,
        order_status: status !== 'all' ? status : undefined,
        payment_status: payment !== 'all' ? payment : undefined,
        from: range.from || undefined,
        to: range.to || undefined,
      })
      if (isStale(fetchId)) return
      const result = response.data ?? null
      const last = result?.pagination.totalPages || 0
      if (page > 1 && last > 0 && page > last) { setPage(last); return }
      setData(result)
      setError(null)
    } catch (e) {
      if (!isStale(fetchId)) setError(apiErrorMessage(e, 'The book orders could not be loaded.'))
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [page, search, status, payment, range.from, range.to, setPage, nextFetchId, isStale])

  useEffect(() => { load() }, [load])

  const open = (order: BookOrder, hash = '') => navigate(`/commerce/book-orders/${order._id}${hash}`, {
    state: { back: { label: 'Book Orders', href: `/commerce/book-orders${params.toString() ? `?${params}` : ''}` } },
  })
  const columns = useBookOrdersColumns({
    onViewDetails: (o) => open(o),
    onUpdateShipping: hasPermission('book_orders.update') ? (o) => open(o, '#shipping') : undefined,
  })

  const filtered = !!search || status !== 'all' || payment !== 'all' || range.preset !== 'all'
  const clear = () => { url.setSearchInput(''); url.replaceAll(new URLSearchParams()) }
  const t = data?.totals

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
        value={url.searchInput}
        onChange={url.setSearchInput}
        placeholder="Search by book title, recipient name, phone, or email..."
        filters={filters}
        activeFilters={{ status, payment }}
        onFiltersChange={(f) => update({ status: f.status === 'all' ? null : f.status, payment: f.payment === 'all' ? null : f.payment })}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter value={range} onChange={(r) => { const next = rangeToParams(r, params); if (r.preset === 'all') next.delete('range'); next.delete('page'); url.replaceAll(next) }} />
            {filtered && <ClearFilters onClick={clear} />}
          </div>
        }
      />

      <Totals
        loading={loading && !!t}
        items={[
          { label: 'Orders', value: t ? t.count.toLocaleString('en-IN') : '—' },
          { label: 'Paid orders', value: t ? t.paid_orders.toLocaleString('en-IN') : '—' },
          { label: 'Revenue', value: t ? formatINR(t.revenue) : '—', hint: 'Paid orders only' },
          { label: 'Average paid order', value: t ? (t.paid_orders ? formatINR(Math.round(t.revenue / t.paid_orders)) : '—') : '—' },
        ]}
      />

      {error && data && (
        <p role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error} Showing what was loaded before.
          <Button size="sm" variant="outline" onClick={load}>Try again</Button>
        </p>
      )}

      <DataTable
        data={data?.entities ?? []}
        columns={columns}
        isLoading={loading && !data}
        error={error}
        onRetry={load}
        onRowClick={(o) => open(o)}
        pagination={{
          currentPage: page,
          totalPages: data?.pagination.totalPages || 1,
          totalCount: data?.pagination.total || 0,
          onPageChange: setPage,
        }}
        emptyState={{
          icon: BookCopy,
          title: filtered ? 'No orders found matching your filters' : 'No book orders yet',
          description: filtered ? undefined : 'Book orders will appear here when users purchase physical books',
          action: filtered ? <Button variant="outline" size="sm" onClick={clear}>Clear filters</Button> : undefined,
        }}
        getRowKey={(order) => order._id}
      />
    </div>
  )
}
