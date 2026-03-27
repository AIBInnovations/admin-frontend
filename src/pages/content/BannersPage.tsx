import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { ArchiveModal } from '@/components/modals/ArchiveModal'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
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
  const [publishFilter, setPublishFilter] = useState(searchParams.get('publish_status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null)
  const [publishModal, setPublishModal] = useState<{ entityId: string; action: 'publish' | 'unpublish' } | null>(null)

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
        publish_status: publishFilter === 'all' ? null : publishFilter,
      })

      if (response.success && response.data) {
        setBanners(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load banners')
        setBanners([])
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load banners')
      setBanners([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, statusFilter, publishFilter])

  useEffect(() => { fetchBanners() }, [fetchBanners])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (statusFilter !== 'all') params.status = statusFilter
    if (publishFilter !== 'all') params.publish_status = publishFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [search, statusFilter, publishFilter, currentPage, setSearchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, publishFilter])

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

  const handleArchiveClick = (banner: Banner) => {
    setSelectedBanner(banner)
    setArchiveModalOpen(true)
  }

  const handleFormSubmit = async (data: BannerFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await bannersService.create(data)
        if (response.success) {
          toast.success('Banner created successfully')
          fetchBanners()
        } else {
          toast.error(response.message || 'Failed to create banner')
          throw new Error(response.message || 'Failed to create banner')
        }
      } else if (selectedBanner) {
        const response = await bannersService.update(selectedBanner._id, data)
        if (response.success) {
          toast.success('Banner updated successfully')
          fetchBanners()
        } else {
          toast.error(response.message || 'Failed to update banner')
          throw new Error(response.message || 'Failed to update banner')
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save banner')
      throw error
    }
  }

  const handleArchiveConfirm = async () => {
    if (!selectedBanner) return
    try {
      const response = await bannersService.archive(selectedBanner._id)
      if (response.success) {
        toast.success('Banner archived successfully')
        fetchBanners()
      } else {
        toast.error(response.message || 'Failed to archive banner')
        throw new Error(response.message || 'Failed to archive banner')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive banner')
      throw error
    }
  }

  const handlePublishAction = useCallback((banner: Banner, action: 'publish' | 'unpublish') => {
    setPublishModal({ entityId: banner._id, action })
  }, [])

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
    {
      key: 'publish_status',
      label: 'Publish Status',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Published', value: 'published' },
        { label: 'Draft', value: 'draft' },
      ],
      placeholder: 'Filter by publish status',
      defaultValue: 'all',
    },
  ]

  const columns = useBannersColumns({
    onEdit: handleEdit,
    onArchive: handleArchiveClick,
    onPublishAction: handlePublishAction,
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
        activeFilters={{ status: statusFilter, publish_status: publishFilter }}
        onFiltersChange={(f) => {
          if (f.status !== undefined) setStatusFilter(f.status)
          if (f.publish_status !== undefined) setPublishFilter(f.publish_status)
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
          title: search || statusFilter !== 'all' || publishFilter !== 'all'
            ? 'No banners found matching your filters'
            : 'No banners yet',
          description: !search && statusFilter === 'all' && publishFilter === 'all'
            ? 'Get started by adding your first banner'
            : undefined,
          action: !search && statusFilter === 'all' && publishFilter === 'all' ? (
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

      <ArchiveModal
        open={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        onConfirm={handleArchiveConfirm}
        title="Archive Banner"
        itemName={selectedBanner?.title}
      />

      {publishModal && (
        <PublishConfirmModal
          open={!!publishModal}
          onOpenChange={(open) => { if (!open) setPublishModal(null) }}
          entityType="banner"
          entityId={publishModal.entityId}
          action={publishModal.action}
          onSuccess={() => {
            setPublishModal(null)
            fetchBanners()
          }}
        />
      )}
    </div>
  )
}
