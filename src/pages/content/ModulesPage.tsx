import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useServerSearch } from '@/hooks/useServerSearch'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { ModuleFormModal } from '@/components/modules/ModuleFormModal'
import { Plus, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { modulesService, Module, ModuleFormData } from '@/services/modules.service'
import { seriesService, Series } from '@/services/series.service'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
import { useModulesColumns } from './ModulesPage.columns'
import { ContentMovePicker, type PickItem } from '@/components/modules/ContentMovePicker'

export function ModulesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('modules.create')
  const canEdit = hasPermission('modules.update')

  // State
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const { inputValue: search, setInputValue: setSearch, debouncedSearch } = useServerSearch(searchParams.get('search') || '')
  const [seriesFilter, setSeriesFilter] = useState(searchParams.get('series') || 'all')
  const [activeFilter, setActiveFilter] = useState(searchParams.get('status') || 'all')
  const [publishFilter, setPublishFilter] = useState(searchParams.get('publish_status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Dropdown data
  const [seriesList, setSeriesList] = useState<Series[]>([])

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  // "Move to series..." picker (full page)
  const [moving, setMoving] = useState<PickItem[] | null>(null)
  const [publishModal, setPublishModal] = useState<{
    entityId: string;
    action: 'publish' | 'unpublish';
  } | null>(null)

  // Fetch series for filter dropdown
  useEffect(() => {
    seriesService.getAll({ limit: 100 }).then((res) => {
      if (res.success && res.data) setSeriesList(res.data.entities)
    })
  }, [])

  const { nextFetchId, isStale } = useLatestFetch()

  // Fetch modules
  const fetchModules = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    setLoadError(null)
    try {
      const response = await modulesService.getAll({
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        series_id: seriesFilter !== 'all' ? seriesFilter : undefined,
        is_active: activeFilter === 'all' ? null : activeFilter === 'active',
        publish_status: publishFilter === 'all' ? null : publishFilter,
      })
      if (isStale(fetchId)) return

      if (response.success && response.data) {
        setModules(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
        // The last row of the last page is gone: show the page before it
        const pages = response.data.pagination?.totalPages || 1
        if (currentPage > pages) setCurrentPage(pages)
      } else {
        setLoadError(response.message || 'The modules could not be loaded.')
      }
    } catch (error: any) {
      if (isStale(fetchId)) return
      const message = error.status === 403 ? 'You do not have access to modules.' : error.message || 'The modules could not be loaded.'
      setLoadError(message)
      toast.error(message)
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, debouncedSearch, seriesFilter, activeFilter, publishFilter, nextFetchId, isStale])

  useEffect(() => { fetchModules() }, [fetchModules])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (debouncedSearch) params.search = debouncedSearch
    if (seriesFilter !== 'all') params.series = seriesFilter
    if (activeFilter !== 'all') params.status = activeFilter
    if (publishFilter !== 'all') params.publish_status = publishFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params, { replace: true })
  }, [debouncedSearch, seriesFilter, activeFilter, publishFilter, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [debouncedSearch, seriesFilter, activeFilter, publishFilter])

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedModule(null)
    setFormModalOpen(true)
  }

  const handleEdit = (mod: Module) => {
    setModalMode('edit')
    setSelectedModule(mod)
    setFormModalOpen(true)
  }

  const handleFormSubmit = async (data: ModuleFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await modulesService.create(data)
        if (response.success) {
          toast.success('Module created successfully')
          fetchModules()
        } else {
          toast.error(response.message || 'Failed to create module')
          throw new Error(response.message || 'Failed to create module')
        }
      } else if (selectedModule) {
        const response = await modulesService.update(selectedModule._id, data)
        if (response.success) {
          toast.success('Module updated successfully')
          fetchModules()
        } else {
          toast.error(response.message || 'Failed to update module')
          throw new Error(response.message || 'Failed to update module')
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save module')
      throw error
    }
  }

  const handlePublishAction = useCallback((mod: Module, action: 'publish' | 'unpublish') => {
    setPublishModal({ entityId: mod._id, action });
  }, []);

  const handleToggleActive = async (mod: Module) => {
    try {
      const response = await modulesService.toggleActive(mod._id, !mod.is_active)
      if (response.success) {
        toast.success(`Module ${!mod.is_active ? 'activated' : 'deactivated'} successfully`)
        fetchModules()
      } else {
        toast.error(response.message || 'Failed to update status')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status')
    }
  }

  const handleRecalculate = async (mod: Module) => {
    try {
      const response = await modulesService.recalculateStats(mod._id)
      if (response.success) {
        toast.success('Module statistics recalculated')
        fetchModules()
      } else {
        toast.error(response.message || 'Failed to recalculate statistics')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to recalculate statistics')
    }
  }

  // Filters
  const filters: FilterConfig[] = [
    {
      key: 'series',
      label: 'Series',
      type: 'select',
      searchable: true,
      options: [
        { label: 'All Series', value: 'all' },
        ...seriesList.map((s) => ({ label: s.name, value: s._id })),
      ],
      placeholder: 'Filter by series',
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

  const columns = useModulesColumns({
    canEdit,
    onEdit: handleEdit,
    onToggleActive: handleToggleActive,
    onRecalculate: handleRecalculate,
    onPublishAction: handlePublishAction,
    onMove: canEdit ? (mod) => setMoving([{ id: mod._id, name: mod.name, parentId: mod.series_id && typeof mod.series_id === 'object' ? mod.series_id._id : (mod.series_id as unknown as string) ?? null }]) : undefined,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modules"
        description="Manage learning modules within series"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Modules' }]}
        action={canCreate && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Module
          </Button>
        )}
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search modules..."
        filters={filters}
        activeFilters={{ series: seriesFilter, status: activeFilter, publish_status: publishFilter }}
        onFiltersChange={(f) => {
          if (f.series !== undefined) setSeriesFilter(f.series)
          if (f.status !== undefined) setActiveFilter(f.status)
          if (f.publish_status !== undefined) setPublishFilter(f.publish_status)
        }}
      />

      <DataTable
        data={modules}
        columns={columns}
        isLoading={loading}
        error={loadError}
        onRetry={fetchModules}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: Layers,
          title: debouncedSearch || seriesFilter !== 'all' || activeFilter !== 'all' || publishFilter !== 'all'
            ? 'No modules found matching your filters'
            : 'No modules yet',
          description: !debouncedSearch && seriesFilter === 'all' && activeFilter === 'all' && publishFilter === 'all'
            ? 'Get started by creating your first module'
            : undefined,
          action: canCreate && !debouncedSearch && seriesFilter === 'all' && activeFilter === 'all' && publishFilter === 'all' ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Create your first module
            </Button>
          ) : undefined,
        }}
        getRowKey={(mod) => mod._id}
        onRowClick={canEdit ? handleEdit : undefined}
      />

      <ModuleFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        module={selectedModule}
        mode={modalMode}
      />

      {moving && (
        <ContentMovePicker
          kind="module-move"
          items={moving}
          onClose={() => setMoving(null)}
          onDone={() => { setMoving(null); fetchModules() }}
        />
      )}

      {publishModal && (
        <PublishConfirmModal
          open={!!publishModal}
          onOpenChange={(open) => { if (!open) setPublishModal(null); }}
          entityType="module"
          entityId={publishModal.entityId}
          action={publishModal.action}
          onSuccess={() => {
            setPublishModal(null);
            fetchModules();
          }}
        />
      )}

    </div>
  )
}
