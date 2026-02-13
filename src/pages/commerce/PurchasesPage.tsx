import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { Package } from 'lucide-react'
import { toast } from 'sonner'
import { paymentsService, Transaction } from '@/services/payments.service'
import { usePurchasesColumns } from './PurchasesPage.columns'

export function PurchasesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [purchases, setPurchases] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [gatewayFilter, setGatewayFilter] = useState(searchParams.get('gateway') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch purchases (package transactions only)
  const fetchPurchases = useCallback(async () => {
    try {
      setLoading(true)
      const response = await paymentsService.getTransactions({
        page: currentPage,
        limit: 20,
        purchase_type: 'package',
        payment_status: statusFilter !== 'all' ? statusFilter : undefined,
        payment_gateway: gatewayFilter !== 'all' ? gatewayFilter : undefined,
      })

      if (response.success && response.data) {
        setPurchases(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load purchases')
      setPurchases([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, statusFilter, gatewayFilter])

  useEffect(() => { fetchPurchases() }, [fetchPurchases])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (statusFilter !== 'all') params.status = statusFilter
    if (gatewayFilter !== 'all') params.gateway = gatewayFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [statusFilter, gatewayFilter, currentPage, setSearchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, gatewayFilter])

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

  const columns = usePurchasesColumns()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        description="View and manage all package purchases and subscriptions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Commerce' },
          { label: 'Purchases' },
        ]}
      />

      <SearchWithFilters
        value=""
        onChange={() => {}}
        placeholder="Filter purchases..."
        filters={filters}
        activeFilters={{ status: statusFilter, gateway: gatewayFilter }}
        onFiltersChange={(f) => {
          if (f.status !== undefined) setStatusFilter(f.status)
          if (f.gateway !== undefined) setGatewayFilter(f.gateway)
        }}
      />

      <DataTable
        data={purchases}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: Package,
          title: statusFilter !== 'all' || gatewayFilter !== 'all'
            ? 'No purchases found matching your filters'
            : 'No purchases yet',
          description: statusFilter === 'all' && gatewayFilter === 'all'
            ? 'Package purchases will appear here when users subscribe'
            : undefined,
        }}
        getRowKey={(tx) => tx.transaction_id}
      />
    </div>
  )
}
