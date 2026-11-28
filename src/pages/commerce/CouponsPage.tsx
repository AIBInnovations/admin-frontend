import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useServerSearch } from '@/hooks/useServerSearch'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { Plus, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { couponsService, Coupon } from '@/services/coupons.service'
import { useAuth } from '@/contexts/AuthContext'
import { apiErrorMessage } from '@/components/common/detail'
import { useCouponsColumns } from './CouponsPage.columns'

export function CouponsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('coupons.create')

  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { inputValue: search, setInputValue: setSearch, debouncedSearch } = useServerSearch(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selected, setSelected] = useState<Coupon | null>(null)

  const { nextFetchId, isStale } = useLatestFetch()

  const fetchCoupons = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await couponsService.getAll({
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        is_active: statusFilter === 'all' ? null : statusFilter === 'active',
      })
      if (isStale(fetchId)) return
      if (response.success && response.data) {
        setCoupons(response.data.entities || [])
        setLoadError(null)
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        setLoadError(response.message || 'The coupons could not be loaded.')
      }
    } catch (error) {
      if (isStale(fetchId)) return
      setLoadError(apiErrorMessage(error, 'The coupons could not be loaded.'))
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, debouncedSearch, statusFilter, nextFetchId, isStale])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  useEffect(() => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (statusFilter !== 'all') params.status = statusFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params, { replace: true })
  }, [search, statusFilter, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [debouncedSearch, statusFilter])

  // Create and edit are full pages (no pop-ups), so they can be linked,
  // bookmarked and opened in a new tab.
  const handleCreate = () => navigate('/commerce/coupons/new')
  const handleEdit = (c: Coupon) => navigate(`/commerce/coupons/${c._id}/edit`)
  const handleDeleteClick = (c: Coupon) => { setSelected(c); setDeleteModalOpen(true) }

  const handleToggle = async (c: Coupon) => {
    try {
      const res = await couponsService.toggleActiveStatus(c._id)
      if (res.success) { toast.success(c.is_active ? `${c.code} paused` : `${c.code} is live`); fetchCoupons() }
      else toast.error(res.message || 'Failed to update status')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selected) return
    try {
      const res = await couponsService.delete(selected._id)
      if (res.success) { toast.success(`${selected.code} deleted`); fetchCoupons() }
      else { toast.error(res.message || 'Failed to delete coupon'); throw new Error(res.message) }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete coupon')
      throw error
    }
  }

  const filters: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
      placeholder: 'Filter by status',
      defaultValue: 'all',
    },
  ]

  const columns = useCouponsColumns({ onEdit: handleEdit, onToggle: handleToggle, onDelete: handleDeleteClick })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coupons"
        description="Discount codes students apply at checkout. Open a coupon to see who used it."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Commerce' }, { label: 'Coupons' }]}
        action={canCreate ? (
          <Button asChild>
            <Link to="/commerce/coupons/new"><Plus className="mr-2 h-4 w-4" aria-hidden="true" />New coupon</Link>
          </Button>
        ) : undefined}
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search by code…"
        filters={filters}
        activeFilters={{ status: statusFilter }}
        onFiltersChange={(f) => { if (f.status !== undefined) setStatusFilter(f.status) }}
      />

      <DataTable
        data={coupons}
        columns={columns}
        isLoading={loading}
        error={loadError}
        onRetry={fetchCoupons}
        pagination={{ currentPage, totalPages, totalCount, onPageChange: setCurrentPage }}
        emptyState={{
          icon: Ticket,
          title: debouncedSearch || statusFilter !== 'all' ? 'No coupons found matching your filters' : 'No coupons yet',
          description: !debouncedSearch && statusFilter === 'all' ? 'Create a code, choose the packages and lengths it covers, and share it with students.' : undefined,
          action: !debouncedSearch && statusFilter === 'all' && canCreate ? (
            <Button onClick={handleCreate} variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" aria-hidden="true" />New coupon</Button>
          ) : undefined,
        }}
        getRowKey={(c) => c._id}
        onRowClick={(c) => navigate(`/commerce/coupons/${c._id}`)}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete coupon"
        itemName={selected?.code}
      />
    </div>
  )
}
