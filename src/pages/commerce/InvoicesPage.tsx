import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useServerSearch } from '@/hooks/useServerSearch'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'
import { invoicesService, Invoice } from '@/services/invoices.service'
import { useInvoicesColumns } from './InvoicesPage.columns'

export function InvoicesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const { inputValue: searchQuery, setInputValue: setSearchQuery, debouncedSearch } = useServerSearch('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const { nextFetchId, isStale } = useLatestFetch()

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await invoicesService.getAll({
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        payment_status: statusFilter !== 'all' ? statusFilter : undefined,
        purchase_type: typeFilter !== 'all' ? typeFilter : undefined,
      })
      if (isStale(fetchId)) return

      if (response.success && response.data) {
        setInvoices(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load invoices')
      }
    } catch (error: any) {
      if (isStale(fetchId)) return
      toast.error(error.message || 'Failed to load invoices')
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, debouncedSearch, statusFilter, typeFilter, nextFetchId, isStale])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (statusFilter !== 'all') params.status = statusFilter
    if (typeFilter !== 'all') params.type = typeFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [statusFilter, typeFilter, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [debouncedSearch, statusFilter, typeFilter])

  // Handlers
  const handleDownload = async (invoice: Invoice) => {
    if (invoice.invoice_url) {
      window.open(invoice.invoice_url, '_blank')
    } else {
      try {
        const response = await invoicesService.getDownloadUrl(invoice._id)
        if (response.success && response.data?.download_url) {
          window.open(response.data.download_url, '_blank')
        } else {
          toast.error(response.message || 'Failed to get download link')
        }
      } catch (error: any) {
        toast.error(error.message || 'Failed to get download link')
      }
    }
  }

  const handleRegenerate = async (invoice: Invoice) => {
    try {
      const response = await invoicesService.regenerate(invoice._id)
      if (response.success) {
        toast.success('Invoice regenerated successfully')
        fetchInvoices()
      } else {
        toast.error(response.message || 'Failed to regenerate invoice')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate invoice')
    }
  }

  // Filters
  const filters: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All Status', value: 'all' },
        { label: 'Paid', value: 'paid' },
        { label: 'Unpaid', value: 'unpaid' },
        { label: 'Partially Paid', value: 'partially_paid' },
        { label: 'Void', value: 'void' },
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
  ]

  const columns = useInvoicesColumns({
    onDownload: handleDownload,
    onRegenerate: handleRegenerate,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="View and manage all payment invoices and GST records"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Commerce' },
          { label: 'Invoices' },
        ]}
      />

      <SearchWithFilters
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by invoice number, email, phone or name..."
        filters={filters}
        activeFilters={{ status: statusFilter, type: typeFilter }}
        onFiltersChange={(f) => {
          if (f.status !== undefined) setStatusFilter(f.status)
          if (f.type !== undefined) setTypeFilter(f.type)
        }}
      />

      <DataTable
        data={invoices}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: FileText,
          title: debouncedSearch || statusFilter !== 'all' || typeFilter !== 'all'
            ? 'No invoices found matching your filters'
            : 'No invoices yet',
          description: !debouncedSearch && statusFilter === 'all' && typeFilter === 'all'
            ? 'Invoices are generated automatically when payments are completed'
            : undefined,
        }}
        getRowKey={(inv) => inv._id}
      />
    </div>
  )
}
