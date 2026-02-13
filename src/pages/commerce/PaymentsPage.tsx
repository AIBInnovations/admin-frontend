import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all')
  const [gatewayFilter, setGatewayFilter] = useState(searchParams.get('gateway') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      const response = await paymentsService.getTransactions({
        page: currentPage,
        limit: 20,
        payment_status: statusFilter !== 'all' ? statusFilter : undefined,
        purchase_type: typeFilter !== 'all' ? typeFilter : undefined,
        payment_gateway: gatewayFilter !== 'all' ? gatewayFilter : undefined,
      })

      if (response.success && response.data) {
        setTransactions(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load transactions')
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, statusFilter, typeFilter, gatewayFilter])

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, typeFilter, gatewayFilter])

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
        value=""
        onChange={() => {}}
        placeholder="Filter transactions..."
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
          title: statusFilter !== 'all' || typeFilter !== 'all' || gatewayFilter !== 'all'
            ? 'No transactions found matching your filters'
            : 'No transactions yet',
          description: statusFilter === 'all' && typeFilter === 'all' && gatewayFilter === 'all'
            ? 'Transactions will appear here when users make purchases'
            : undefined,
        }}
        getRowKey={(tx) => tx.transaction_id}
      />
    </div>
  )
}
