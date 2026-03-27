import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { ArchiveModal } from '@/components/modals/ArchiveModal'
import { VideoFormModal } from '@/components/videos/VideoFormModal'
import { Plus, Video as VideoIcon } from 'lucide-react'
import { toast } from 'sonner'
import { videosService, Video, VideoFormData } from '@/services/videos.service'
import { modulesService, Module } from '@/services/modules.service'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
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
  const [publishFilter, setPublishFilter] = useState(searchParams.get('publish_status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Dropdown data
  const [modules, setModules] = useState<Module[]>([])

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [publishModal, setPublishModal] = useState<{
    entityId: string;
    action: 'publish' | 'unpublish';
  } | null>(null)
  const [archiveBlocked, setArchiveBlocked] = useState(false)
  const [archiveBlockReason, setArchiveBlockReason] = useState('')
  const [loadingArchiveImpact, setLoadingArchiveImpact] = useState(false)

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
        publish_status: publishFilter === 'all' ? null : publishFilter,
      })

      if (response.success && response.data) {
        setVideos(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load videos')
        setVideos([])
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load videos')
      setVideos([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, moduleFilter, statusFilter, accessFilter, publishFilter])

  useEffect(() => { fetchVideos() }, [fetchVideos])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (moduleFilter !== 'all') params.module = moduleFilter
    if (statusFilter !== 'all') params.status = statusFilter
    if (accessFilter !== 'all') params.access = accessFilter
    if (publishFilter !== 'all') params.publish_status = publishFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [moduleFilter, statusFilter, accessFilter, publishFilter, currentPage, setSearchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [moduleFilter, statusFilter, accessFilter, publishFilter])

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

  const handlePublishAction = useCallback((video: Video, action: 'publish' | 'unpublish') => {
    setPublishModal({ entityId: video._id, action });
  }, []);

  const handleArchiveClick = async (video: Video) => {
    setSelectedVideo(video)
    setArchiveModalOpen(true)
    setLoadingArchiveImpact(true)
    setArchiveBlocked(false)
    setArchiveBlockReason('')
    try {
      const response = await videosService.getDeleteImpact(video._id)
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

  const handleFormSubmit = async (data: VideoFormData, file?: File, onProgress?: (percent: number) => void, onPhaseChange?: (phase: 'uploading' | 'completing' | 'confirming') => void) => {
    try {
      let videoId: string | undefined
      if (modalMode === 'create' && file) {
        const response = await videosService.upload(data, file, onProgress, onPhaseChange)
        if (response.success) {
          videoId = response.data?.video_id
          toast.success('Video uploaded successfully — processing will begin shortly')
        } else {
          toast.error(response.message || 'Failed to upload video')
          throw new Error(response.message || 'Failed to upload video')
        }
      } else if (selectedVideo) {
        const response = await videosService.update(selectedVideo._id, data)
        if (response.success) {
          videoId = selectedVideo._id
          toast.success('Video updated successfully')
        } else {
          toast.error(response.message || 'Failed to update video')
          throw new Error(response.message || 'Failed to update video')
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

  const handleArchiveConfirm = async () => {
    if (!selectedVideo) return
    try {
      const response = await videosService.archive(selectedVideo._id)
      if (response.success) {
        toast.success('Video archived successfully')
        fetchVideos()
      } else {
        toast.error(response.message || 'Failed to archive video')
        throw new Error(response.message || 'Failed to archive video')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive video')
      throw error
    }
  }

  // Filters
  const filters: FilterConfig[] = [
    {
      key: 'module',
      label: 'Module',
      type: 'select',
      searchable: true,
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

  // Client-side search filter
  const filteredVideos = search
    ? videos.filter((video) =>
        video.title.toLowerCase().includes(search.toLowerCase())
      )
    : videos

  const columns = useVideosColumns({
    onEdit: handleEdit,
    onArchive: handleArchiveClick,
    onPublishAction: handlePublishAction,
  })

  const hasFilters = search || moduleFilter !== 'all' || statusFilter !== 'all' || accessFilter !== 'all' || publishFilter !== 'all'

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
        activeFilters={{ module: moduleFilter, status: statusFilter, access: accessFilter, publish_status: publishFilter }}
        onFiltersChange={(f) => {
          if (f.module !== undefined) setModuleFilter(f.module)
          if (f.status !== undefined) setStatusFilter(f.status)
          if (f.access !== undefined) setAccessFilter(f.access)
          if (f.publish_status !== undefined) setPublishFilter(f.publish_status)
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

      <ArchiveModal
        open={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        onConfirm={handleArchiveConfirm}
        title="Archive Video"
        itemName={selectedVideo?.title}
        isLoadingImpact={loadingArchiveImpact}
        blocked={archiveBlocked}
        blockReason={archiveBlockReason}
      />

      {publishModal && (
        <PublishConfirmModal
          open={!!publishModal}
          onOpenChange={(open) => { if (!open) setPublishModal(null); }}
          entityType="video"
          entityId={publishModal.entityId}
          action={publishModal.action}
          onSuccess={() => {
            setPublishModal(null);
            fetchVideos();
          }}
        />
      )}
    </div>
  )
}
