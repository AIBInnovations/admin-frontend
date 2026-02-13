import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { BannerFormModal } from '@/components/banners/BannerFormModal'
import { Plus, Image } from 'lucide-react'
import { toast } from 'sonner'
import { bannersService, Banner, BannerFormData } from '@/services/banners.service'
import { useBannersColumns } from './BannersPage.columns'

export function BannersPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null)

  // Client-side search filter
  const filteredBanners = search
    ? banners.filter((b) => b.title.toLowerCase().includes(search.toLowerCase()))
    : banners

  // Fetch banners
  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true)
      const response = await bannersService.getAll({
        page: currentPage,
        limit: 20,
        is_active: statusFilter === 'all' ? null : statusFilter === 'active',
      })

      if (response.success && response.data) {
        setBanners(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load banners')
      setBanners([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, statusFilter])

  useEffect(() => { fetchBanners() }, [fetchBanners])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (statusFilter !== 'all') params.status = statusFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [search, statusFilter, currentPage, setSearchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedBanner(null)
    setFormModalOpen(true)
  }

  const handleEdit = (banner: Banner) => {
    setModalMode('edit')
    setSelectedBanner(banner)
    setFormModalOpen(true)
  }

  const handleDeleteClick = (banner: Banner) => {
    setSelectedBanner(banner)
    setDeleteModalOpen(true)
  }

  const handleFormSubmit = async (data: BannerFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await bannersService.create(data)
        if (response.success) {
          toast.success('Banner created successfully')
          fetchBanners()
        }
      } else if (selectedBanner) {
        const response = await bannersService.update(selectedBanner._id, data)
        if (response.success) {
          toast.success('Banner updated successfully')
          fetchBanners()
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save banner')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedBanner) return
    try {
      const response = await bannersService.delete(selectedBanner._id)
      if (response.success) {
        toast.success('Banner deleted successfully')
        fetchBanners()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete banner')
      throw error
    }
  }

  // Filters
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

  const columns = useBannersColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banners"
        description="Manage homepage banners and promotions"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Banners' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Banner
          </Button>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search banners..."
        filters={filters}
        activeFilters={{ status: statusFilter }}
        onFiltersChange={(f) => {
          if (f.status !== undefined) setStatusFilter(f.status)
        }}
      />

      <DataTable
        data={filteredBanners}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: Image,
          title: search || statusFilter !== 'all'
            ? 'No banners found matching your filters'
            : 'No banners yet',
          description: !search && statusFilter === 'all'
            ? 'Get started by adding your first banner'
            : undefined,
          action: !search && statusFilter === 'all' ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Add your first banner
            </Button>
          ) : undefined,
        }}
        getRowKey={(banner) => banner._id}
      />

      <BannerFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        banner={selectedBanner}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Banner"
        itemName={selectedBanner?.title}
      />
    </div>
  )
}
