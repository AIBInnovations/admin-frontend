import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
import { HomeSectionFormModal } from '@/components/homeSections/HomeSectionFormModal'
import { Plus, Layers } from 'lucide-react'
import { toast } from 'sonner'
import type { DeleteImpactResponse } from '@/types/api.types'
import {
  homeSectionsService,
  HomeSection,
  HomeSectionFormData,
} from '@/services/homeSections.service'
import { useHomeSectionsColumns } from './HomeSectionsPage.columns'

export function HomeSectionsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [sections, setSections] = useState<HomeSection[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [publishFilter, setPublishFilter] = useState(searchParams.get('publish_status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedSection, setSelectedSection] = useState<HomeSection | null>(null)
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpactResponse | null>(null)
  const [loadingDeleteImpact, setLoadingDeleteImpact] = useState(false)
  const [publishModal, setPublishModal] = useState<{ entityId: string; action: 'publish' | 'unpublish' } | null>(null)

  // Client-side search filter
  const filteredSections = search
    ? sections.filter((s) =>
        (s.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.subtitle || '').toLowerCase().includes(search.toLowerCase())
      )
    : sections

  // Fetch sections
  const fetchSections = useCallback(async () => {
    try {
      setLoading(true)
      const response = await homeSectionsService.getAll({
        page: currentPage,
        limit: 20,
        is_active: statusFilter === 'all' ? null : statusFilter === 'active',
        publish_status: publishFilter === 'all' ? null : publishFilter,
      })

      if (response.success && response.data) {
        setSections(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load home sections')
        setSections([])
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load home sections')
      setSections([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, statusFilter, publishFilter])

  useEffect(() => { fetchSections() }, [fetchSections])

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
    setSelectedSection(null)
    setFormModalOpen(true)
  }

  const handleEdit = (section: HomeSection) => {
    setModalMode('edit')
    setSelectedSection(section)
    setFormModalOpen(true)
  }

  const handleViewItems = (section: HomeSection) => {
    navigate(`/content/home-sections/${section._id}`)
  }

  const handleDeleteClick = async (section: HomeSection) => {
    setSelectedSection(section)
    setDeleteModalOpen(true)
    setLoadingDeleteImpact(true)
    setDeleteImpact(null)
    try {
      const response = await homeSectionsService.getDeleteImpact(section._id)
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

  const handleFormSubmit = async (data: HomeSectionFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await homeSectionsService.create(data)
        if (response.success) {
          toast.success('Home section created successfully')
          fetchSections()
        } else {
          toast.error(response.message || 'Failed to create home section')
          throw new Error(response.message || 'Failed to create home section')
        }
      } else if (selectedSection) {
        const response = await homeSectionsService.update(selectedSection._id, data)
        if (response.success) {
          toast.success('Home section updated successfully')
          fetchSections()
        } else {
          toast.error(response.message || 'Failed to update home section')
          throw new Error(response.message || 'Failed to update home section')
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save home section')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedSection) return
    try {
      const response = await homeSectionsService.delete(selectedSection._id)
      if (response.success) {
        toast.success('Home section deleted successfully')
        fetchSections()
      } else {
        toast.error(response.message || 'Failed to delete home section')
        throw new Error(response.message || 'Failed to delete home section')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete home section')
      throw error
    }
  }

  const handlePublishAction = useCallback((section: HomeSection, action: 'publish' | 'unpublish') => {
    setPublishModal({ entityId: section._id, action })
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

  const columns = useHomeSectionsColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
    onViewItems: handleViewItems,
    onPublishAction: handlePublishAction,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home Sections"
        description="Manage dynamic sections on the app home screen"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Home Sections' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Section
          </Button>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search sections..."
        filters={filters}
        activeFilters={{ status: statusFilter, publish_status: publishFilter }}
        onFiltersChange={(f) => {
          if (f.status !== undefined) setStatusFilter(f.status)
          if (f.publish_status !== undefined) setPublishFilter(f.publish_status)
        }}
      />

      <DataTable
        data={filteredSections}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        onRowClick={handleViewItems}
        emptyState={{
          icon: Layers,
          title: search || statusFilter !== 'all' || publishFilter !== 'all'
            ? 'No sections found matching your filters'
            : 'No home sections yet',
          description: !search && statusFilter === 'all' && publishFilter === 'all'
            ? 'Get started by adding your first home section'
            : undefined,
          action: !search && statusFilter === 'all' && publishFilter === 'all' ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Add your first section
            </Button>
          ) : undefined,
        }}
        getRowKey={(section) => section._id}
      />

      <HomeSectionFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        section={selectedSection}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeleteImpact(null) }}
        onConfirm={handleDeleteConfirm}
        title="Delete Home Section"
        itemName={selectedSection?.title || 'this section'}
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

      {publishModal && (
        <PublishConfirmModal
          open={!!publishModal}
          onOpenChange={(open) => { if (!open) setPublishModal(null) }}
          entityType="homesection"
          entityId={publishModal.entityId}
          action={publishModal.action}
          onSuccess={() => {
            setPublishModal(null)
            fetchSections()
          }}
        />
      )}
    </div>
  )
}
