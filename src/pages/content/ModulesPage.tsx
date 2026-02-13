import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { ModuleFormModal } from '@/components/modules/ModuleFormModal'
import { Plus, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { modulesService, Module, ModuleFormData } from '@/services/modules.service'
import { seriesService, Series } from '@/services/series.service'
import { useModulesColumns } from './ModulesPage.columns'

export function ModulesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [seriesFilter, setSeriesFilter] = useState(searchParams.get('series') || 'all')
  const [activeFilter, setActiveFilter] = useState(searchParams.get('status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Dropdown data
  const [seriesList, setSeriesList] = useState<Series[]>([])

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)

  // Fetch series for filter dropdown
  useEffect(() => {
    seriesService.getAll({ limit: 100 }).then((res) => {
      if (res.success && res.data) setSeriesList(res.data.entities)
    })
  }, [])

  // Fetch modules
  const fetchModules = useCallback(async () => {
    try {
      setLoading(true)
      const response = await modulesService.getAll({
        page: currentPage,
        limit: 20,
        series_id: seriesFilter !== 'all' ? seriesFilter : undefined,
        is_active: activeFilter === 'all' ? null : activeFilter === 'active',
      })

      if (response.success && response.data) {
        setModules(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load modules')
      setModules([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, seriesFilter, activeFilter])

  useEffect(() => { fetchModules() }, [fetchModules])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (seriesFilter !== 'all') params.series = seriesFilter
    if (activeFilter !== 'all') params.status = activeFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [seriesFilter, activeFilter, currentPage, setSearchParams])

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [seriesFilter, activeFilter])

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

  const handleDeleteClick = (mod: Module) => {
    setSelectedModule(mod)
    setDeleteModalOpen(true)
  }

  const handleFormSubmit = async (data: ModuleFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await modulesService.create(data)
        if (response.success) {
          toast.success('Module created successfully')
          fetchModules()
        }
      } else if (selectedModule) {
        const response = await modulesService.update(selectedModule._id, data)
        if (response.success) {
          toast.success('Module updated successfully')
          fetchModules()
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save module')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedModule) return
    try {
      const response = await modulesService.delete(selectedModule._id)
      if (response.success) {
        toast.success('Module deleted successfully')
        fetchModules()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete module')
      throw error
    }
  }

  const handleToggleActive = async (mod: Module) => {
    try {
      const response = await modulesService.toggleActive(mod._id, !mod.is_active)
      if (response.success) {
        toast.success(`Module ${!mod.is_active ? 'activated' : 'deactivated'} successfully`)
        fetchModules()
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
  ]

  const columns = useModulesColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
    onToggleActive: handleToggleActive,
    onRecalculate: handleRecalculate,
  })

  // Client-side filtering
  const filteredModules = search
    ? modules.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : modules

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modules"
        description="Manage learning modules within series"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Modules' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Module
          </Button>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search modules..."
        filters={filters}
        activeFilters={{ series: seriesFilter, status: activeFilter }}
        onFiltersChange={(f) => {
          if (f.series !== undefined) setSeriesFilter(f.series)
          if (f.status !== undefined) setActiveFilter(f.status)
        }}
      />

      <DataTable
        data={filteredModules}
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
          title: seriesFilter !== 'all' || activeFilter !== 'all' || search
            ? 'No modules found matching your filters'
            : 'No modules yet',
          description: seriesFilter === 'all' && activeFilter === 'all' && !search
            ? 'Get started by creating your first module'
            : undefined,
          action: seriesFilter === 'all' && activeFilter === 'all' && !search ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Create your first module
            </Button>
          ) : undefined,
        }}
        getRowKey={(mod) => mod._id}
      />

      <ModuleFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        module={selectedModule}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Module"
        itemName={selectedModule?.name}
      />
    </div>
  )
}
