import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { RecordingFormModal } from '@/components/recordings/RecordingFormModal'
import { Plus, Film } from 'lucide-react'
import { toast } from 'sonner'
import { recordingsService, Recording, RecordingFormData } from '@/services/recordings.service'
import { liveSessionsService, LiveSession } from '@/services/liveSessions.service'
import { getRecordingsColumns } from './RecordingsPage.columns'

export function RecordingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionFilter, setSessionFilter] = useState(searchParams.get('session') || 'all')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Dropdown data
  const [sessions, setSessions] = useState<LiveSession[]>([])

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null)

  // Fetch sessions for filter dropdown
  useEffect(() => {
    liveSessionsService.getAll({ limit: 100 }).then((res) => {
      if (res.success && res.data) setSessions(res.data.entities)
    })
  }, [])

  // Fetch recordings
  const fetchRecordings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await recordingsService.getAll({
        page: currentPage,
        limit: 20,
        session_id: sessionFilter !== 'all' ? sessionFilter : undefined,
        processing_status: statusFilter !== 'all' ? statusFilter : undefined,
      })

      if (response.success && response.data) {
        setRecordings(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load recordings')
      setRecordings([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, sessionFilter, statusFilter])

  useEffect(() => { fetchRecordings() }, [fetchRecordings])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (sessionFilter !== 'all') params.session = sessionFilter
    if (statusFilter !== 'all') params.status = statusFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [sessionFilter, statusFilter, currentPage, setSearchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [sessionFilter, statusFilter])

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedRecording(null)
    setFormModalOpen(true)
  }

  const handleEdit = (recording: Recording) => {
    setModalMode('edit')
    setSelectedRecording(recording)
    setFormModalOpen(true)
  }

  const handleDeleteClick = (recording: Recording) => {
    setSelectedRecording(recording)
    setDeleteModalOpen(true)
  }

  const handleFormSubmit = async (data: RecordingFormData, file?: File, onProgress?: (percent: number) => void) => {
    try {
      if (modalMode === 'create' && file) {
        const response = await recordingsService.upload(data, file, onProgress)
        if (response.success) {
          toast.success('Recording uploaded successfully — processing will begin shortly')
        }
      } else if (selectedRecording) {
        const response = await recordingsService.update(selectedRecording._id, data)
        if (response.success) {
          toast.success('Recording updated successfully')
        }
      }
      fetchRecordings()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save recording')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedRecording) return
    try {
      const response = await recordingsService.delete(selectedRecording._id)
      if (response.success) {
        toast.success('Recording deleted successfully')
        fetchRecordings()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete recording')
      throw error
    }
  }

  // Filters
  const filters: FilterConfig[] = [
    {
      key: 'session',
      label: 'Session',
      value: sessionFilter,
      onChange: setSessionFilter,
      options: [
        { value: 'all', label: 'All Sessions' },
        ...sessions.map(s => ({ value: s._id, label: s.title })),
      ],
    },
    {
      key: 'status',
      label: 'Status',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'ready', label: 'Ready' },
        { value: 'processing', label: 'Processing' },
        { value: 'uploading', label: 'Uploading' },
        { value: 'failed', label: 'Failed' },
      ],
    },
  ]

  const columns = getRecordingsColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Session Recordings"
        description="Upload and manage live session recordings"
        icon={Film}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Upload Recording
          </Button>
        }
      />

      <SearchWithFilters filters={filters} />

      <DataTable
        columns={columns}
        data={recordings}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        emptyMessage="No recordings found"
        totalCount={totalCount}
      />

      <RecordingFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        recording={selectedRecording}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Recording"
        itemName={selectedRecording?.title || ''}
      />
    </div>
  )
}
