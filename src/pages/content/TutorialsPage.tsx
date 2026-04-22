import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useServerSearch } from '@/hooks/useServerSearch'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { TutorialFormModal } from '@/components/tutorials/TutorialFormModal'
import { Plus, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { tutorialsService, Tutorial, TutorialFormData } from '@/services/tutorials.service'
import { useTutorialsColumns } from './TutorialsPage.columns'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function TutorialsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [loading, setLoading] = useState(true)
  const { inputValue: search, setInputValue: setSearch, debouncedSearch } = useServerSearch(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [publishFilter, setPublishFilter] = useState(searchParams.get('publish_status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { nextFetchId, isStale } = useLatestFetch()

  // Fetch tutorials
  const fetchTutorials = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await tutorialsService.getAll({
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        is_active: statusFilter === 'all' ? null : statusFilter === 'active',
        publish_status: publishFilter === 'all' ? null : publishFilter,
      })
      if (isStale(fetchId)) return

      if (response.success && response.data) {
        setTutorials(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load tutorials')
      }
    } catch (error: any) {
      if (isStale(fetchId)) return
      toast.error(error.message || 'Failed to load tutorials')
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, debouncedSearch, statusFilter, publishFilter, nextFetchId, isStale])

  useEffect(() => { fetchTutorials() }, [fetchTutorials])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (statusFilter !== 'all') params.status = statusFilter
    if (publishFilter !== 'all') params.publish_status = publishFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [search, statusFilter, publishFilter, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [debouncedSearch, statusFilter, publishFilter])

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedTutorial(null)
    setFormModalOpen(true)
  }

  const handleEdit = (tutorial: Tutorial) => {
    setModalMode('edit')
    setSelectedTutorial(tutorial)
    setFormModalOpen(true)
  }

  const handleDeleteClick = (tutorial: Tutorial) => {
    setSelectedTutorial(tutorial)
    setDeleteDialogOpen(true)
  }

  const handleFormSubmit = async (data: TutorialFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await tutorialsService.create(data)
        if (response.success) {
          toast.success('Tutorial created successfully')
          setFormModalOpen(false)
          fetchTutorials()
        } else {
          throw new Error(response.message || 'Failed to create tutorial')
        }
      } else if (selectedTutorial) {
        const response = await tutorialsService.update(selectedTutorial._id, data)
        if (response.success) {
          toast.success('Tutorial updated successfully')
          setFormModalOpen(false)
          fetchTutorials()
        } else {
          throw new Error(response.message || 'Failed to update tutorial')
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save tutorial')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedTutorial) return
    try {
      const response = await tutorialsService.delete(selectedTutorial._id)
      if (response.success) {
        toast.success('Tutorial deleted successfully')
        fetchTutorials()
      } else {
        toast.error(response.message || 'Failed to delete tutorial')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete tutorial')
    } finally {
      setDeleteDialogOpen(false)
      setSelectedTutorial(null)
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

  const columns = useTutorialsColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutorials"
        description="Manage free tutorial links (videos & PDFs) shown to all app users"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Tutorials' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Tutorial
          </Button>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search tutorials..."
        filters={filters}
        activeFilters={{ status: statusFilter, publish_status: publishFilter }}
        onFiltersChange={(f) => {
          if (f.status !== undefined) setStatusFilter(f.status)
          if (f.publish_status !== undefined) setPublishFilter(f.publish_status)
        }}
      />

      <DataTable
        data={tutorials}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: GraduationCap,
          title: debouncedSearch || statusFilter !== 'all' || publishFilter !== 'all'
            ? 'No tutorials found matching your filters'
            : 'No tutorials yet',
          description: !debouncedSearch && statusFilter === 'all' && publishFilter === 'all'
            ? 'Get started by adding your first free tutorial'
            : undefined,
          action: !debouncedSearch && statusFilter === 'all' && publishFilter === 'all' ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Add your first tutorial
            </Button>
          ) : undefined,
        }}
        getRowKey={(tutorial) => tutorial._id}
      />

      <TutorialFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        tutorial={selectedTutorial}
        mode={modalMode}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tutorial</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTutorial?.title}"? This will deactivate the tutorial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
