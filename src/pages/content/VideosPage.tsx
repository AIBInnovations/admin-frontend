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
import { ArchiveModal } from '@/components/modals/ArchiveModal'
import { VideoFormModal } from '@/components/videos/VideoFormModal'
import { CopyPlus, FolderInput, Plus, Video as VideoIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { videosService, Video, VideoFormData } from '@/services/videos.service'
import { modulesService, Module } from '@/services/modules.service'
import { PublishConfirmModal } from '@/components/common/PublishConfirmModal'
import { useVideosColumns } from './VideosPage.columns'
import { ContentMovePicker, type PickItem } from '@/components/modules/ContentMovePicker'
import type { MoveKind } from '@/services/contentMove.service'

export function VideosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('videos.create')
  const canEdit = hasPermission('videos.update')
  const canDelete = hasPermission('videos.delete')

  // State
  const { inputValue: search, setInputValue: setSearch, debouncedSearch } = useServerSearch(searchParams.get('search') || '')
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [moduleFilter, setModuleFilter] = useState(searchParams.get('module') || 'all')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || searchParams.get('processing_status') || 'all')
  const [accessFilter, setAccessFilter] = useState(searchParams.get('access') || 'all')
  const [publishFilter, setPublishFilter] = useState(searchParams.get('publish_status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)

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
  // Move / copy: the full-page picker, and the rows chosen for a bulk one
  const [moving, setMoving] = useState<{ kind: MoveKind; items: PickItem[] } | null>(null)
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const [archiveBlocked, setArchiveBlocked] = useState(false)
  const [archiveBlockReason, setArchiveBlockReason] = useState('')
  const [loadingArchiveImpact, setLoadingArchiveImpact] = useState(false)

  // Fetch modules for filter dropdown
  useEffect(() => {
    modulesService.getAll({ limit: 100, sort_by: 'name', sort_order: 'asc' }).then((res) => {
      if (res.success && res.data) setModules(res.data.entities)
    })
  }, [])

  const { nextFetchId, isStale } = useLatestFetch()

  // Fetch videos
  const fetchVideos = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    setLoadError(null)
    try {
      const response = await videosService.getAll({
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        module_id: moduleFilter !== 'all' ? moduleFilter : undefined,
        processing_status: statusFilter !== 'all' ? statusFilter : undefined,
        is_free: accessFilter === 'all' ? null : accessFilter === 'free',
        publish_status: publishFilter === 'all' ? null : publishFilter,
      })
      if (isStale(fetchId)) return

      if (response.success && response.data) {
        setVideos(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
        // The last row of the last page is gone: show the page before it
        const pages = response.data.pagination?.totalPages || 1
        if (currentPage > pages) setCurrentPage(pages)
      } else {
        setLoadError(response.message || 'The videos could not be loaded.')
      }
    } catch (error: any) {
      if (isStale(fetchId)) return
      const message = error.status === 403 ? 'You do not have access to videos.' : error.message || 'The videos could not be loaded.'
      setLoadError(message)
      toast.error(message)
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, debouncedSearch, moduleFilter, statusFilter, accessFilter, publishFilter, nextFetchId, isStale])

  useEffect(() => { fetchVideos() }, [fetchVideos])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (debouncedSearch) params.search = debouncedSearch
    if (moduleFilter !== 'all') params.module = moduleFilter
    if (statusFilter !== 'all') params.status = statusFilter
    if (accessFilter !== 'all') params.access = accessFilter
    if (publishFilter !== 'all') params.publish_status = publishFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params, { replace: true })
  }, [debouncedSearch, moduleFilter, statusFilter, accessFilter, publishFilter, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [debouncedSearch, moduleFilter, statusFilter, accessFilter, publishFilter])
  // A choice belongs to the rows on screen: another page or filter starts again
  useEffect(() => { setChosen(new Set()) }, [currentPage, debouncedSearch, moduleFilter, statusFilter, accessFilter, publishFilter])
  const pickItem = (v: Video): PickItem => ({ id: v._id, name: v.title, parentId: v.module_id && typeof v.module_id === 'object' ? v.module_id._id : null })
  const chosenVideos = videos.filter((v) => chosen.has(v._id))
  const toggleChosen = useCallback((id: string) => setChosen((prev) => {
    const next = new Set(prev)
    if (!next.delete(id)) next.add(id)
    return next
  }), [])

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

  const handleRetryTranscoding = useCallback(async (video: Video) => {
    try {
      const response = await videosService.retryTranscoding(video._id)
      if (response.success) {
        toast.success('Transcoding retry started')
        fetchVideos()
      } else {
        toast.error(response.message || 'Failed to retry transcoding')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to retry transcoding')
    }
  }, [fetchVideos])

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

  const handleFormSubmit = async (
    data: VideoFormData,
    file?: File,
    onProgress?: (percent: number) => void,
    onPhaseChange?: (phase: 'uploading' | 'completing' | 'confirming') => void,
    releaseMode?: 'immediate' | 'scheduled',
  ) => {
    try {
      let videoId: string | undefined
      if (modalMode === 'create' && file) {
        const response = await videosService.upload(data, file, onProgress, onPhaseChange)
        if (response.success) {
          videoId = response.data?.video_id
          toast.success('Video uploaded. Processing will begin shortly.')
        } else {
          toast.error(response.message || 'Failed to upload video')
          throw new Error(response.message || 'Failed to upload video')
        }
      } else if (selectedVideo) {
        // Upload file for upcoming video if a file was provided
        if (file && selectedVideo.processing_status === 'upcoming') {
          const uploadResponse = await videosService.uploadFileForExisting(
            selectedVideo._id,
            file,
            {
              onProgress,
              onPhaseChange,
              release_mode: releaseMode,
              scheduled_release_at: data.scheduled_release_at ?? undefined,
            },
          )
          if (uploadResponse.success) {
            toast.success(
              releaseMode === 'scheduled'
                ? 'Video file uploaded. It will be released on the scheduled date.'
                : 'Video file uploaded. Processing will begin shortly.',
            )
          } else {
            toast.error(uploadResponse.message || 'Failed to upload video file')
            throw new Error(uploadResponse.message || 'Failed to upload video file')
          }
        }
        // Update metadata. Strip scheduled_release_at when we just uploaded a
        // file — the upload endpoint already wrote the authoritative value and
        // overwriting here would race with it.
        const updatePayload: Partial<VideoFormData> = file
          ? (() => {
              const { scheduled_release_at: _unused, ...rest } = data
              void _unused
              return rest
            })()
          : data
        const response = await videosService.update(selectedVideo._id, updatePayload)
        if (response.success) {
          videoId = selectedVideo._id
          if (!file) toast.success('Video updated successfully')
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
        { label: 'Upcoming', value: 'upcoming' },
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

  const columns = useVideosColumns({
    canEdit,
    canDelete,
    onEdit: handleEdit,
    onArchive: handleArchiveClick,
    onPublishAction: handlePublishAction,
    onRetryTranscoding: handleRetryTranscoding,
    onMove: canEdit ? (video, kind) => setMoving({ kind, items: [pickItem(video)] }) : undefined,
    selection: canEdit ? { isSelected: (id) => chosen.has(id), toggle: toggleChosen } : undefined,
  })

  const hasFilters = debouncedSearch || moduleFilter !== 'all' || statusFilter !== 'all' || accessFilter !== 'all' || publishFilter !== 'all'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Videos"
        description="Manage video content, uploads, and processing"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Content' }, { label: 'Videos' }]}
        action={canCreate && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Upload Video
          </Button>
        )}
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

      {canEdit && chosenVideos.length > 0 && (
        <div role="toolbar" aria-label="Selected videos" className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-accent px-3 py-2">
          <span aria-live="polite" className="mr-auto text-sm font-semibold tabular-nums text-accent-foreground">{chosenVideos.length} selected</span>
          {chosenVideos.length < videos.length && (
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setChosen(new Set(videos.map((v) => v._id)))}>Select all {videos.length} on this page</Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8 sm:order-last" aria-label="Clear selection" onClick={() => setChosen(new Set())}><X className="h-4 w-4" /></Button>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button size="sm" variant="outline" className="h-9 flex-1 gap-1.5 bg-card sm:h-8 sm:flex-none" onClick={() => setMoving({ kind: 'video-move', items: chosenVideos.map(pickItem) })}><FolderInput className="h-3.5 w-3.5" />Move to…</Button>
            <Button size="sm" variant="outline" className="h-9 flex-1 gap-1.5 bg-card sm:h-8 sm:flex-none" onClick={() => setMoving({ kind: 'video-copy', items: chosenVideos.map(pickItem) })}><CopyPlus className="h-3.5 w-3.5" />Copy to…</Button>
          </div>
        </div>
      )}

      <DataTable
        data={videos}
        columns={columns}
        isLoading={loading}
        error={loadError}
        onRetry={fetchVideos}
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
          action: canCreate && !hasFilters ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Upload your first video
            </Button>
          ) : undefined,
        }}
        getRowKey={(video) => video._id}
        onRowClick={canEdit ? handleEdit : undefined}
      />

      <VideoFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        video={selectedVideo}
        mode={modalMode}
        onMoved={fetchVideos}
      />

      {moving && (
        <ContentMovePicker
          kind={moving.kind}
          items={moving.items}
          onClose={() => setMoving(null)}
          onDone={() => { setMoving(null); setChosen(new Set()); fetchVideos() }}
        />
      )}

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
