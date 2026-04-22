import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useServerSearch } from '@/hooks/useServerSearch'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { IndianRupee } from 'lucide-react'
import { toast } from 'sonner'
import { paymentsService, Transaction } from '@/services/payments.service'
import { usePaymentsColumns } from './PaymentsPage.columns'

export function PaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const { inputValue: searchQuery, setInputValue: setSearchQuery, debouncedSearch } = useServerSearch('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all')
  const [gatewayFilter, setGatewayFilter] = useState(searchParams.get('gateway') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const { nextFetchId, isStale } = useLatestFetch()

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await paymentsService.getTransactions({
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        payment_status: statusFilter !== 'all' ? statusFilter : undefined,
        purchase_type: typeFilter !== 'all' ? typeFilter : undefined,
        payment_gateway: gatewayFilter !== 'all' ? gatewayFilter : undefined,
      })
      if (isStale(fetchId)) return

      if (response.success && response.data) {
        setTransactions(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load transactions')
      }
    } catch (error: any) {
      if (isStale(fetchId)) return
      toast.error(error.message || 'Failed to load transactions')
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, debouncedSearch, statusFilter, typeFilter, gatewayFilter, nextFetchId, isStale])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (statusFilter !== 'all') params.status = statusFilter
    if (typeFilter !== 'all') params.type = typeFilter
    if (gatewayFilter !== 'all') params.gateway = gatewayFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [statusFilter, typeFilter, gatewayFilter, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [debouncedSearch, statusFilter, typeFilter, gatewayFilter])

  // Filters
  const filters: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All Status', value: 'all' },
        { label: 'Completed', value: 'completed' },
        { label: 'Pending', value: 'pending' },
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
      ],
      placeholder: 'Filter by status',
      defaultValue: 'all',
    },
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { label: 'All Types', value: 'all' },
        { label: 'Package', value: 'package' },
        { label: 'Session', value: 'session' },
        { label: 'Book', value: 'book' },
        { label: 'eBook', value: 'ebook' },
        { label: 'Form', value: 'form' },
      ],
      placeholder: 'Filter by type',
      defaultValue: 'all',
    },
    {
      key: 'gateway',
      label: 'Gateway',
      type: 'select',
      options: [
        { label: 'All Gateways', value: 'all' },
        { label: 'Zoho Payments', value: 'zoho_payments' },
        { label: 'Razorpay', value: 'razorpay' },
      ],
      placeholder: 'Filter by gateway',
      defaultValue: 'all',
    },
  ]

  const columns = usePaymentsColumns()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track all payment transactions across the platform"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Commerce' },
          { label: 'Payments' },
        ]}
      />

      <SearchWithFilters
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by transaction ID, user name, or email..."
        filters={filters}
        activeFilters={{ status: statusFilter, type: typeFilter, gateway: gatewayFilter }}
        onFiltersChange={(f) => {
          if (f.status !== undefined) setStatusFilter(f.status)
          if (f.type !== undefined) setTypeFilter(f.type)
          if (f.gateway !== undefined) setGatewayFilter(f.gateway)
        }}
      />

      <DataTable
        data={transactions}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: IndianRupee,
          title: debouncedSearch || statusFilter !== 'all' || typeFilter !== 'all' || gatewayFilter !== 'all'
            ? 'No transactions found matching your filters'
            : 'No transactions yet',
          description: !debouncedSearch && statusFilter === 'all' && typeFilter === 'all' && gatewayFilter === 'all'
            ? 'Transactions will appear here when users make purchases'
            : undefined,
        }}
        getRowKey={(tx) => tx.transaction_id}
      />
    </div>
  )
}
