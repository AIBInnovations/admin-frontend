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
import { SessionFormModal } from '@/components/sessions/SessionFormModal'
import { Plus, Video } from 'lucide-react'
import { toast } from 'sonner'
import {
  liveSessionsService, LiveSession, LiveSessionFormData,
} from '@/services/liveSessions.service'
import { useSessionsColumns } from './SessionsPage.columns'

export function SessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // State
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const { inputValue: search, setInputValue: setSearch, debouncedSearch } = useServerSearch(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [publishFilter, setPublishFilter] = useState(searchParams.get('publish_status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null)
  const [archiveBlocked, setArchiveBlocked] = useState(false)
  const [archiveBlockReason, setArchiveBlockReason] = useState('')
  const [loadingArchiveImpact, setLoadingArchiveImpact] = useState(false)
  const [publishModal, setPublishModal] = useState<{ entityId: string; action: 'publish' | 'unpublish' } | null>(null)

  const { nextFetchId, isStale } = useLatestFetch()

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await liveSessionsService.getAll({
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        publish_status: publishFilter === 'all' ? null : publishFilter,
      })
      if (isStale(fetchId)) return

      if (response.success && response.data) {
        setSessions(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load sessions')
      }
    } catch (error: any) {
      if (isStale(fetchId)) return
      toast.error(error.message || 'Failed to load sessions')
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, debouncedSearch, statusFilter, publishFilter, nextFetchId, isStale])

  useEffect(() => { fetchSessions() }, [fetchSessions])

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
    setSelectedSession(null)
    setFormModalOpen(true)
  }

  const handleEdit = (session: LiveSession) => {
    setModalMode('edit')
    setSelectedSession(session)
    setFormModalOpen(true)
  }

  const handlePublishAction = (entityId: string, action: 'publish' | 'unpublish') => {
    setPublishModal({ entityId, action })
  }

  const handleArchiveClick = async (session: LiveSession) => {
    setSelectedSession(session)
    setArchiveModalOpen(true)
    setLoadingArchiveImpact(true)
    setArchiveBlocked(false)
    setArchiveBlockReason('')

    try {
      const response = await liveSessionsService.getDeleteImpact(session._id)
      if (response.success && response.data && response.data.blocked) {
        setArchiveBlocked(true)
        const reasons = response.data.dependencies
          ?.filter((d: any) => d.blocking)
          .map((d: any) => `${d.count} ${d.label}`)
          .join(', ')
        setArchiveBlockReason(`Cannot archive. Remove dependencies first: ${reasons}`)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to check dependencies')
    } finally {
      setLoadingArchiveImpact(false)
    }
  }

  const handleCancel = async (session: LiveSession) => {
    try {
      const response = await liveSessionsService.cancel(session._id)
      if (response.success) {
        toast.success('Session cancelled')
        fetchSessions()
      } else {
        toast.error(response.message || 'Failed to cancel session')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel session')
    }
  }

  const handleFormSubmit = async (data: LiveSessionFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await liveSessionsService.create(data)
        if (response.success) {
          toast.success('Session scheduled successfully')
          fetchSessions()
        } else {
          toast.error(response.message || 'Failed to schedule session')
          throw new Error(response.message || 'Failed to schedule session')
        }
      } else if (selectedSession) {
        const response = await liveSessionsService.update(selectedSession._id, data)
        if (response.success) {
          toast.success('Session updated successfully')
          fetchSessions()
        } else {
          toast.error(response.message || 'Failed to update session')
          throw new Error(response.message || 'Failed to update session')
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save session')
      throw error
    }
  }

  const handleArchiveConfirm = async () => {
    if (!selectedSession) return
    try {
      const response = await liveSessionsService.archive(selectedSession._id)
      if (response.success) {
        toast.success('Session archived successfully')
        fetchSessions()
      } else {
        toast.error(response.message || 'Failed to archive session')
        throw new Error(response.message || 'Failed to archive session')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive session')
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

  const columns = useSessionsColumns({
    onEdit: handleEdit,
    onCancel: handleCancel,
    onArchive: handleArchiveClick,
    onPublishAction: handlePublishAction,
    onViewAttendees: (session) => navigate(`/sessions/${session._id}/attendees`),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Sessions"
        description="Manage live sessions, scheduling, and capacity"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Live Sessions' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Schedule Session
          </Button>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search by session title..."
        filters={filters}
        activeFilters={{ status: statusFilter, publish_status: publishFilter }}
        onFiltersChange={(f) => {
          if (f.status !== undefined) setStatusFilter(f.status)
          if (f.publish_status !== undefined) setPublishFilter(f.publish_status)
        }}
      />

      <DataTable
        data={sessions}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: Video,
          title: debouncedSearch || statusFilter !== 'all' || publishFilter !== 'all'
            ? 'No sessions found matching your filters'
            : 'No live sessions yet',
          description: !debouncedSearch && statusFilter === 'all' && publishFilter === 'all'
            ? 'Get started by scheduling your first live session'
            : undefined,
          action: !debouncedSearch && statusFilter === 'all' && publishFilter === 'all' ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Schedule your first session
            </Button>
          ) : undefined,
        }}
        onRowClick={(session) => navigate(`/sessions/${session._id}`)}
        getRowKey={(session) => session._id}
      />

      <SessionFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        session={selectedSession}
        mode={modalMode}
      />

      <ArchiveModal
        open={archiveModalOpen}
        onClose={() => { setArchiveModalOpen(false); setArchiveBlocked(false); setArchiveBlockReason(''); }}
        onConfirm={handleArchiveConfirm}
        title="Archive Session"
        itemName={selectedSession?.title}
        isLoadingImpact={loadingArchiveImpact}
        blocked={archiveBlocked}
        blockReason={archiveBlockReason}
      />

      {publishModal && (
        <PublishConfirmModal
          open={!!publishModal}
          onOpenChange={(open) => { if (!open) setPublishModal(null) }}
          entityType="livesession"
          entityId={publishModal.entityId}
          action={publishModal.action}
          onSuccess={fetchSessions}
        />
      )}
    </div>
  )
}
