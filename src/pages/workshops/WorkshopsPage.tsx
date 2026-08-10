import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useServerSearch } from '@/hooks/useServerSearch'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { ArchiveModal } from '@/components/modals/ArchiveModal'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
import { WorkshopFormModal } from '@/components/workshops/WorkshopFormModal'
import { Plus, CalendarRange } from 'lucide-react'
import { toast } from 'sonner'
import { workshopsService, Workshop, WorkshopFormData } from '@/services/workshops.service'
import { useWorkshopsColumns } from './WorkshopsPage.columns'

export function WorkshopsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)
  const { inputValue: search, setInputValue: setSearch, debouncedSearch } = useServerSearch(
    searchParams.get('search') || '',
  )
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [publishFilter, setPublishFilter] = useState(searchParams.get('publish_status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null)
  const [archiveBlocked, setArchiveBlocked] = useState(false)
  const [archiveBlockReason, setArchiveBlockReason] = useState('')
  const [loadingArchiveImpact, setLoadingArchiveImpact] = useState(false)
  const [publishModal, setPublishModal] = useState<{ entityId: string; action: 'publish' | 'unpublish' } | null>(null)

  const { nextFetchId, isStale } = useLatestFetch()

  const fetchWorkshops = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await workshopsService.getAll({
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        publish_status: publishFilter === 'all' ? null : publishFilter,
      })
      if (isStale(fetchId)) return

      if (response.success && response.data) {
        setWorkshops(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load workshops')
      }
    } catch (error) {
      if (isStale(fetchId)) return
      toast.error(error instanceof Error ? error.message : 'Failed to load workshops')
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, debouncedSearch, statusFilter, publishFilter, nextFetchId, isStale])

  useEffect(() => { fetchWorkshops() }, [fetchWorkshops])

  useEffect(() => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (statusFilter !== 'all') params.status = statusFilter
    if (publishFilter !== 'all') params.publish_status = publishFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [search, statusFilter, publishFilter, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [debouncedSearch, statusFilter, publishFilter])

  const handleCreate = () => {
    setModalMode('create')
    setSelectedWorkshop(null)
    setFormModalOpen(true)
  }

  /**
   * Editing needs the full detail payload — the list response has no `days`,
   * and the form's day builder is driven by it.
   */
  const handleEdit = async (workshop: Workshop) => {
    try {
      const res = await workshopsService.getById(workshop._id)
      if (res.success && res.data) {
        setSelectedWorkshop(res.data)
        setModalMode('edit')
        setFormModalOpen(true)
      } else {
        toast.error(res.message || 'Failed to load workshop details')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load workshop details')
    }
  }

  const handlePublishAction = (entityId: string, action: 'publish' | 'unpublish') => {
    setPublishModal({ entityId, action })
  }

  const handleArchiveClick = async (workshop: Workshop) => {
    setSelectedWorkshop(workshop)
    setArchiveModalOpen(true)
    setLoadingArchiveImpact(true)
    setArchiveBlocked(false)
    setArchiveBlockReason('')

    try {
      const response = await workshopsService.getDeleteImpact(workshop._id)
      if (response.success && response.data?.blocked) {
        setArchiveBlocked(true)
        const reasons = response.data.dependencies
          ?.filter((d) => d.blocking)
          .map((d) => `${d.count} ${d.label}`)
          .join(', ')
        setArchiveBlockReason(`Cannot archive. Remove dependencies first: ${reasons}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to check dependencies')
    } finally {
      setLoadingArchiveImpact(false)
    }
  }

  const handleCancel = async (workshop: Workshop) => {
    const confirmed = window.confirm(
      `Cancel "${workshop.title}"?\n\nEvery day's Zoom meeting will be deleted and all registrations cancelled. ` +
        `Paid students will need to be refunded manually.`,
    )
    if (!confirmed) return

    try {
      const response = await workshopsService.cancel(workshop._id)
      if (response.success) {
        const pending = response.data?.refunds_pending ?? 0
        toast.success(
          pending > 0
            ? `Workshop cancelled. ${pending} paid purchase(s) need a manual refund.`
            : 'Workshop cancelled',
        )
        fetchWorkshops()
      } else {
        toast.error(response.message || 'Failed to cancel workshop')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel workshop')
    }
  }

  const handleFormSubmit = async (data: WorkshopFormData) => {
    if (modalMode === 'create') {
      const response = await workshopsService.create(data)
      if (!response.success) {
        toast.error(response.message || 'Failed to create workshop')
        throw new Error(response.message || 'Failed to create workshop')
      }
      toast.success('Workshop created successfully')
      fetchWorkshops()
    } else if (selectedWorkshop) {
      const response = await workshopsService.update(selectedWorkshop._id, data)
      if (!response.success) {
        toast.error(response.message || 'Failed to update workshop')
        throw new Error(response.message || 'Failed to update workshop')
      }
      toast.success('Workshop updated successfully')
      fetchWorkshops()
    }
  }

  const handleArchiveConfirm = async () => {
    if (!selectedWorkshop) return
    const response = await workshopsService.archive(selectedWorkshop._id)
    if (!response.success) {
      toast.error(response.message || 'Failed to archive workshop')
      throw new Error(response.message || 'Failed to archive workshop')
    }
    toast.success('Workshop archived successfully')
    fetchWorkshops()
  }

  const filters: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All Status', value: 'all' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Live', value: 'live' },
        { label: 'Completed', value: 'completed' },
        { label: 'Cancelled', value: 'cancelled' },
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

  const columns = useWorkshopsColumns({
    onEdit: handleEdit,
    onCancel: handleCancel,
    onArchive: handleArchiveClick,
    onPublishAction: handlePublishAction,
    onViewEnrollees: (workshop) => navigate(`/workshops/${workshop._id}/enrollees`),
  })

  const filtersActive = Boolean(debouncedSearch) || statusFilter !== 'all' || publishFilter !== 'all'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workshops"
        description="Multi-day live programmes — one purchase covers every day"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Workshops' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Create Workshop
          </Button>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search by workshop title..."
        filters={filters}
        activeFilters={{ status: statusFilter, publish_status: publishFilter }}
        onFiltersChange={(f) => {
          if (f.status !== undefined) setStatusFilter(f.status)
          if (f.publish_status !== undefined) setPublishFilter(f.publish_status)
        }}
      />

      <DataTable
        data={workshops}
        columns={columns}
        isLoading={loading}
        pagination={{ currentPage, totalPages, totalCount, onPageChange: setCurrentPage }}
        emptyState={{
          icon: CalendarRange,
          title: filtersActive ? 'No workshops found matching your filters' : 'No workshops yet',
          description: filtersActive ? undefined : 'Get started by creating your first multi-day workshop',
          action: filtersActive ? undefined : (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Create your first workshop
            </Button>
          ),
        }}
        onRowClick={(workshop) => navigate(`/workshops/${workshop._id}`)}
        getRowKey={(workshop) => workshop._id}
      />

      <WorkshopFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        workshop={selectedWorkshop}
        mode={modalMode}
      />

      <ArchiveModal
        open={archiveModalOpen}
        onClose={() => { setArchiveModalOpen(false); setArchiveBlocked(false); setArchiveBlockReason('') }}
        onConfirm={handleArchiveConfirm}
        title="Archive Workshop"
        itemName={selectedWorkshop?.title}
        isLoadingImpact={loadingArchiveImpact}
        blocked={archiveBlocked}
        blockReason={archiveBlockReason}
      />

      {publishModal && (
        <PublishConfirmModal
          open={!!publishModal}
          onOpenChange={(open) => { if (!open) setPublishModal(null) }}
          entityType="workshop"
          entityId={publishModal.entityId}
          action={publishModal.action}
          onSuccess={fetchWorkshops}
        />
      )}
    </div>
  )
}
