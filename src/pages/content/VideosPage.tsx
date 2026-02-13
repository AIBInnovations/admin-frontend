import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { VideoFormModal } from '@/components/videos/VideoFormModal'
import { Plus, Video as VideoIcon } from 'lucide-react'
import { toast } from 'sonner'
import { videosService, Video, VideoFormData } from '@/services/videos.service'
import { modulesService, Module } from '@/services/modules.service'
import { useVideosColumns } from './VideosPage.columns'

export function VideosPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [search, setSearch] = useState('')
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [moduleFilter, setModuleFilter] = useState(searchParams.get('module') || 'all')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [accessFilter, setAccessFilter] = useState(searchParams.get('access') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Dropdown data
  const [modules, setModules] = useState<Module[]>([])

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)

  // Fetch modules for filter dropdown
  useEffect(() => {
    modulesService.getAll({ limit: 100, sort_by: 'name', sort_order: 'asc' }).then((res) => {
      if (res.success && res.data) setModules(res.data.entities)
    })
  }, [])

  // Fetch videos
  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true)
      const response = await videosService.getAll({
        page: currentPage,
        limit: 20,
        module_id: moduleFilter !== 'all' ? moduleFilter : undefined,
        processing_status: statusFilter !== 'all' ? statusFilter : undefined,
        is_free: accessFilter === 'all' ? null : accessFilter === 'free',
      })

      if (response.success && response.data) {
        setVideos(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load videos')
      setVideos([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, moduleFilter, statusFilter, accessFilter])

  useEffect(() => { fetchVideos() }, [fetchVideos])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (moduleFilter !== 'all') params.module = moduleFilter
    if (statusFilter !== 'all') params.status = statusFilter
    if (accessFilter !== 'all') params.access = accessFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [moduleFilter, statusFilter, accessFilter, currentPage, setSearchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [moduleFilter, statusFilter, accessFilter])

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedVideo(null)
    setFormModalOpen(true)
  }

  const handleEdit = (video: Video) => {
    setModalMode('edit')
    setSelectedVideo(video)
    setFormModalOpen(true)
  }

  const handleDeleteClick = (video: Video) => {
    setSelectedVideo(video)
    setDeleteModalOpen(true)
  }

  const handleFormSubmit = async (data: VideoFormData, file?: File, onProgress?: (percent: number) => void) => {
    try {
      let videoId: string | undefined
      if (modalMode === 'create' && file) {
        const response = await videosService.upload(data, file, onProgress)
        if (response.success) {
          videoId = response.data?.video_id
          toast.success('Video uploaded successfully — processing will begin shortly')
        }
      } else if (selectedVideo) {
        const response = await videosService.update(selectedVideo._id, data)
        if (response.success) {
          videoId = selectedVideo._id
          toast.success('Video updated successfully')
        }
      }
      // Assign tags if provided
      if (videoId && data.tag_ids && data.tag_ids.length > 0) {
        await videosService.assignTags(videoId, data.tag_ids).catch(() => {})
      }
      fetchVideos()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save video')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedVideo) return
    try {
      const response = await videosService.delete(selectedVideo._id)
      if (response.success) {
        toast.success('Video deleted successfully')
        fetchVideos()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete video')
      throw error
    }
  }

  // Filters
  const filters: FilterConfig[] = [
    {
      key: 'module',
      label: 'Module',
      type: 'select',
      options: [
        { label: 'All Modules', value: 'all' },
        ...modules.map((m) => ({ label: m.name, value: m._id })),
      ],
      placeholder: 'Filter by module',
      defaultValue: 'all',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All Status', value: 'all' },
        { label: 'Ready', value: 'ready' },
        { label: 'Processing', value: 'processing' },
        { label: 'Uploading', value: 'uploading' },
        { label: 'Failed', value: 'failed' },
      ],
      placeholder: 'Filter by status',
      defaultValue: 'all',
    },
    {
      key: 'access',
      label: 'Access',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Free', value: 'free' },
        { label: 'Paid', value: 'paid' },
      ],
      placeholder: 'Filter by access',
      defaultValue: 'all',
    },
  ]

  // Client-side search filter
  const filteredVideos = search
    ? videos.filter((video) =>
        video.title.toLowerCase().includes(search.toLowerCase())
      )
    : videos

  const columns = useVideosColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
  })

  const hasFilters = search || moduleFilter !== 'all' || statusFilter !== 'all' || accessFilter !== 'all'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Videos"
        description="Manage video content, uploads, and processing"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Videos' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Upload Video
          </Button>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search videos..."
        filters={filters}
        activeFilters={{ module: moduleFilter, status: statusFilter, access: accessFilter }}
        onFiltersChange={(f) => {
          if (f.module !== undefined) setModuleFilter(f.module)
          if (f.status !== undefined) setStatusFilter(f.status)
          if (f.access !== undefined) setAccessFilter(f.access)
        }}
      />

      <DataTable
        data={filteredVideos}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: VideoIcon,
          title: hasFilters ? 'No videos found matching your filters' : 'No videos yet',
          description: !hasFilters ? 'Get started by uploading your first video' : undefined,
          action: !hasFilters ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Upload your first video
            </Button>
          ) : undefined,
        }}
        getRowKey={(video) => video._id}
      />

      <VideoFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        video={selectedVideo}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Video"
        itemName={selectedVideo?.title}
      />
    </div>
  )
}
