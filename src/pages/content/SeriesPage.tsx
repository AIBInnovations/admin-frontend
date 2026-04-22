import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useServerSearch } from '@/hooks/useServerSearch'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { SeriesFormModal } from '@/components/series/SeriesFormModal'
import { Plus, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { seriesService, Series, SeriesFormData } from '@/services/series.service'
import { packagesService, Package } from '@/services/packages.service'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
import { useSeriesColumns } from './SeriesPage.columns'

export function SeriesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const { inputValue: search, setInputValue: setSearch, debouncedSearch } = useServerSearch('')
  const [packageFilter, setPackageFilter] = useState(searchParams.get('package') || 'all')
  const [activeFilter, setActiveFilter] = useState(searchParams.get('status') || 'all')
  const [publishFilter, setPublishFilter] = useState(searchParams.get('publish_status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Dropdown data
  const [packages, setPackages] = useState<Package[]>([])

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null)
  const [publishModal, setPublishModal] = useState<{
    entityId: string;
    action: 'publish' | 'unpublish';
  } | null>(null)

  // Fetch packages for filter dropdown
  useEffect(() => {
    packagesService.getAll({ limit: 100 }).then((res) => {
      if (res.success && res.data) setPackages(res.data.entities)
    })
  }, [])

  const { nextFetchId, isStale } = useLatestFetch()

  // Fetch series
  const fetchSeries = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await seriesService.getAll({
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        package_id: packageFilter !== 'all' ? packageFilter : undefined,
        is_active: activeFilter === 'all' ? null : activeFilter === 'active',
        publish_status: publishFilter === 'all' ? null : publishFilter,
      })
      if (isStale(fetchId)) return

      if (response.success && response.data) {
        setSeriesList(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load series')
      }
    } catch (error: any) {
      if (isStale(fetchId)) return
      toast.error(error.message || 'Failed to load series')
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, debouncedSearch, packageFilter, activeFilter, publishFilter, nextFetchId, isStale])

  useEffect(() => { fetchSeries() }, [fetchSeries])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (packageFilter !== 'all') params.package = packageFilter
    if (activeFilter !== 'all') params.status = activeFilter
    if (publishFilter !== 'all') params.publish_status = publishFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [packageFilter, activeFilter, publishFilter, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [debouncedSearch, packageFilter, activeFilter, publishFilter])

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedSeries(null)
    setFormModalOpen(true)
  }

  const handleEdit = (series: Series) => {
    setModalMode('edit')
    setSelectedSeries(series)
    setFormModalOpen(true)
  }

  const handleFormSubmit = async (data: SeriesFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await seriesService.create(data)
        if (response.success) {
          toast.success('Series created successfully')
          fetchSeries()
        } else {
          toast.error(response.message || 'Failed to create series')
          throw new Error(response.message || 'Failed to create series')
        }
      } else if (selectedSeries) {
        const response = await seriesService.update(selectedSeries._id, data)
        if (response.success) {
          toast.success('Series updated successfully')
          fetchSeries()
        } else {
          toast.error(response.message || 'Failed to update series')
          throw new Error(response.message || 'Failed to update series')
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save series')
      throw error
    }
  }

  const handlePublishAction = useCallback((series: Series, action: 'publish' | 'unpublish') => {
    setPublishModal({ entityId: series._id, action });
  }, []);

  const handleToggleActive = async (series: Series) => {
    try {
      const response = await seriesService.toggleActive(series._id, !series.is_active)
      if (response.success) {
        toast.success(`Series ${!series.is_active ? 'activated' : 'deactivated'} successfully`)
        fetchSeries()
      } else {
        toast.error(response.message || 'Failed to update status')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status')
    }
  }

  // Filters
  const filters: FilterConfig[] = [
    {
      key: 'package',
      label: 'Package',
      type: 'select',
      searchable: true,
      options: [
        { label: 'All Packages', value: 'all' },
        ...packages.map((p) => ({ label: p.name, value: p._id })),
      ],
      placeholder: 'Filter by package',
      defaultValue: 'all',
    },
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

  const columns = useSeriesColumns({
    onEdit: handleEdit,
    onToggleActive: handleToggleActive,
    onPublishAction: handlePublishAction,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Series"
        description="Manage course series within packages"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Series' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Series
          </Button>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search series..."
        filters={filters}
        activeFilters={{ package: packageFilter, status: activeFilter, publish_status: publishFilter }}
        onFiltersChange={(f) => {
          if (f.package !== undefined) setPackageFilter(f.package)
          if (f.status !== undefined) setActiveFilter(f.status)
          if (f.publish_status !== undefined) setPublishFilter(f.publish_status)
        }}
      />

      <DataTable
        data={seriesList}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: Layers,
          title: debouncedSearch || packageFilter !== 'all' || activeFilter !== 'all' || publishFilter !== 'all'
            ? 'No series found matching your filters'
            : 'No series yet',
          description: !debouncedSearch && packageFilter === 'all' && activeFilter === 'all' && publishFilter === 'all'
            ? 'Get started by creating your first series'
            : undefined,
          action: !debouncedSearch && packageFilter === 'all' && activeFilter === 'all' && publishFilter === 'all' ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Create your first series
            </Button>
          ) : undefined,
        }}
        getRowKey={(series) => series._id}
      />

      <SeriesFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        series={selectedSeries}
        mode={modalMode}
      />

      {publishModal && (
        <PublishConfirmModal
          open={!!publishModal}
          onOpenChange={(open) => { if (!open) setPublishModal(null); }}
          entityType="series"
          entityId={publishModal.entityId}
          action={publishModal.action}
          onSuccess={() => {
            setPublishModal(null);
            fetchSeries();
          }}
        />
      )}

    </div>
  )
}
