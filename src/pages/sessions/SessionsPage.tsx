import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { SessionFormModal } from '@/components/sessions/SessionFormModal'
import { Plus, Video } from 'lucide-react'
import { toast } from 'sonner'
import {
  liveSessionsService, LiveSession, LiveSessionFormData,
} from '@/services/liveSessions.service'
import { useSessionsColumns } from './SessionsPage.columns'

export function SessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [sessions, setSessions] = useState<LiveSession[]>([])
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
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null)

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      const response = await liveSessionsService.getAll({
        page: currentPage,
        limit: 20,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      })

      if (response.success && response.data) {
        setSessions(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load sessions')
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, statusFilter])

  useEffect(() => { fetchSessions() }, [fetchSessions])

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
    setSelectedSession(null)
    setFormModalOpen(true)
  }

  const handleEdit = (session: LiveSession) => {
    setModalMode('edit')
    setSelectedSession(session)
    setFormModalOpen(true)
  }

  const handleDeleteClick = (session: LiveSession) => {
    setSelectedSession(session)
    setDeleteModalOpen(true)
  }

  const handleCancel = async (session: LiveSession) => {
    try {
      const response = await liveSessionsService.cancel(session._id)
      if (response.success) {
        toast.success('Session cancelled')
        fetchSessions()
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
        }
      } else if (selectedSession) {
        const response = await liveSessionsService.update(selectedSession._id, data)
        if (response.success) {
          toast.success('Session updated successfully')
          fetchSessions()
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save session')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedSession) return
    try {
      const response = await liveSessionsService.delete(selectedSession._id)
      if (response.success) {
        toast.success('Session deleted successfully')
        fetchSessions()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete session')
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
  ]

  const columns = useSessionsColumns({
    onEdit: handleEdit,
    onCancel: handleCancel,
    onDelete: handleDeleteClick,
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
        activeFilters={{ status: statusFilter }}
        onFiltersChange={(f) => {
          if (f.status !== undefined) setStatusFilter(f.status)
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
          title: search || statusFilter !== 'all'
            ? 'No sessions found matching your filters'
            : 'No live sessions yet',
          description: !search && statusFilter === 'all'
            ? 'Get started by scheduling your first live session'
            : undefined,
          action: !search && statusFilter === 'all' ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Schedule your first session
            </Button>
          ) : undefined,
        }}
        getRowKey={(session) => session._id}
      />

      <SessionFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        session={selectedSession}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Session"
        itemName={selectedSession?.title}
      />
    </div>
  )
}
