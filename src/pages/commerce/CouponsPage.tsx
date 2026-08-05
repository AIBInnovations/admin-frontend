import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useServerSearch } from '@/hooks/useServerSearch'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { CouponFormModal } from '@/components/coupons/CouponFormModal'
import { Plus, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { couponsService, Coupon, CouponFormData } from '@/services/coupons.service'
import { useCouponsColumns } from './CouponsPage.columns'

export function CouponsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const { inputValue: search, setInputValue: setSearch, debouncedSearch } = useServerSearch(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
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
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load coupons')
      }
    } catch (error: any) {
      if (isStale(fetchId)) return
      toast.error(error.message || 'Failed to load coupons')
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
    setSearchParams(params)
  }, [search, statusFilter, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [debouncedSearch, statusFilter])

  const handleCreate = () => { setModalMode('create'); setSelected(null); setFormModalOpen(true) }
  const handleEdit = (c: Coupon) => { setModalMode('edit'); setSelected(c); setFormModalOpen(true) }
  const handleDeleteClick = (c: Coupon) => { setSelected(c); setDeleteModalOpen(true) }

  const handleToggle = async (c: Coupon) => {
    try {
      const res = await couponsService.toggleActiveStatus(c._id)
      if (res.success) { toast.success(`Coupon ${c.is_active ? 'deactivated' : 'activated'}`); fetchCoupons() }
      else toast.error(res.message || 'Failed to update status')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status')
    }
  }

  const handleFormSubmit = async (data: CouponFormData) => {
    try {
      if (modalMode === 'create') {
        const res = await couponsService.create(data)
        if (res.success) { toast.success('Coupon created'); fetchCoupons() }
        else { toast.error(res.message || 'Failed to create coupon'); throw new Error(res.message) }
      } else if (selected) {
        const res = await couponsService.update(selected._id, data)
        if (res.success) { toast.success('Coupon updated'); fetchCoupons() }
        else { toast.error(res.message || 'Failed to update coupon'); throw new Error(res.message) }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save coupon')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selected) return
    try {
      const res = await couponsService.delete(selected._id)
      if (res.success) { toast.success('Coupon deleted'); fetchCoupons() }
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
        description="Discount codes applied at checkout"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Commerce' }, { label: 'Coupons' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Coupon
          </Button>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search coupons..."
        filters={filters}
        activeFilters={{ status: statusFilter }}
        onFiltersChange={(f) => { if (f.status !== undefined) setStatusFilter(f.status) }}
      />

      <DataTable
        data={coupons}
        columns={columns}
        isLoading={loading}
        pagination={{ currentPage, totalPages, totalCount, onPageChange: setCurrentPage }}
        emptyState={{
          icon: Ticket,
          title: debouncedSearch || statusFilter !== 'all' ? 'No coupons found matching your filters' : 'No coupons yet',
          description: !debouncedSearch && statusFilter === 'all' ? 'Create your first discount code' : undefined,
          action: !debouncedSearch && statusFilter === 'all' ? (
            <Button onClick={handleCreate} variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" />Add your first coupon</Button>
          ) : undefined,
        }}
        getRowKey={(c) => c._id}
      />

      <CouponFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        coupon={selected}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Coupon"
        itemName={selected?.code}
      />
    </div>
  )
}
