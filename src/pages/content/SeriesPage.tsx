import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { SeriesFormModal } from '@/components/series/SeriesFormModal'
import { Plus, Layers } from 'lucide-react'
import { toast } from 'sonner'
import type { DeleteImpactResponse } from '@/types/api.types'
import { seriesService, Series, SeriesFormData } from '@/services/series.service'
import { packagesService, Package } from '@/services/packages.service'
import { useSeriesColumns } from './SeriesPage.columns'

export function SeriesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [packageFilter, setPackageFilter] = useState(searchParams.get('package') || 'all')
  const [activeFilter, setActiveFilter] = useState(searchParams.get('status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Dropdown data
  const [packages, setPackages] = useState<Package[]>([])

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null)
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpactResponse | null>(null)
  const [loadingDeleteImpact, setLoadingDeleteImpact] = useState(false)

  // Fetch packages for filter dropdown
  useEffect(() => {
    packagesService.getAll({ limit: 100 }).then((res) => {
      if (res.success && res.data) setPackages(res.data.entities)
    })
  }, [])

  // Fetch series
  const fetchSeries = useCallback(async () => {
    try {
      setLoading(true)
      const response = await seriesService.getAll({
        page: currentPage,
        limit: 20,
        package_id: packageFilter !== 'all' ? packageFilter : undefined,
        is_active: activeFilter === 'all' ? null : activeFilter === 'active',
      })

      if (response.success && response.data) {
        setSeriesList(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load series')
        setSeriesList([])
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load series')
      setSeriesList([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, packageFilter, activeFilter])

  useEffect(() => { fetchSeries() }, [fetchSeries])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (packageFilter !== 'all') params.package = packageFilter
    if (activeFilter !== 'all') params.status = activeFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [packageFilter, activeFilter, currentPage, setSearchParams])

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [packageFilter, activeFilter])

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

  const handleDeleteClick = async (series: Series) => {
    setSelectedSeries(series)
    setDeleteModalOpen(true)
    setLoadingDeleteImpact(true)
    setDeleteImpact(null)
    try {
      const response = await seriesService.getDeleteImpact(series._id)
      if (response.success && response.data) {
        setDeleteImpact(response.data)
      } else {
        toast.error(response.message || 'Failed to check delete impact')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to check delete impact')
      setDeleteImpact(null)
    } finally {
      setLoadingDeleteImpact(false)
    }
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

  const handleDeleteConfirm = async () => {
    if (!selectedSeries) return
    try {
      const response = await seriesService.delete(selectedSeries._id)
      if (response.success) {
        toast.success('Series deleted successfully')
        fetchSeries()
      } else {
        toast.error(response.message || 'Failed to delete series')
        throw new Error(response.message || 'Failed to delete series')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete series')
      throw error
    }
  }

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
  ]

  const columns = useSeriesColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
    onToggleActive: handleToggleActive,
  })

  // Client-side filtering
  const filteredSeries = search ? seriesList.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())) : seriesList

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
        activeFilters={{ package: packageFilter, status: activeFilter }}
        onFiltersChange={(f) => {
          if (f.package !== undefined) setPackageFilter(f.package)
          if (f.status !== undefined) setActiveFilter(f.status)
        }}
      />

      <DataTable
        data={filteredSeries}
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
          title: search || packageFilter !== 'all' || activeFilter !== 'all'
            ? 'No series found matching your filters'
            : 'No series yet',
          description: search === '' && packageFilter === 'all' && activeFilter === 'all'
            ? 'Get started by creating your first series'
            : undefined,
          action: search === '' && packageFilter === 'all' && activeFilter === 'all' ? (
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

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeleteImpact(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete Series"
        itemName={selectedSeries?.name}
        isLoadingImpact={loadingDeleteImpact}
        blocked={deleteImpact?.blocked}
        warning={deleteImpact?.dependencies?.length ? {
          message: deleteImpact.blocked
            ? 'Cannot delete. Remove the following dependencies first:'
            : 'The following associated data will be affected:',
          details: deleteImpact.dependencies.map(d => ({
            label: d.label,
            count: d.count,
            blocking: d.blocking,
          })),
        } : undefined}
      />
    </div>
  )
}
