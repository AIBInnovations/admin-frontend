import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, Video, Clock, Eye, EyeOff, Archive } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import { VideoRow } from '../rows/VideoRow'
import { SortableItem } from '../SortableItem'
import { ExplorerEmptyState } from '../ExplorerEmptyState'
import { ChildrenListSkeleton } from '../ExplorerSkeleton'
import { ExplorerSelectionBar } from '../ExplorerSelectionBar'
import { UpcomingVideoDialog } from '../../forms/UpcomingVideoDialog'
import { CreateVideoDialog } from '../../forms/CreateVideoDialog'
import { BulkImpactDialog } from '../../dialogs/BulkImpactDialog'
import { classifyPublish, classifyUnpublish, classifyArchive } from '../../dialogs/bulkImpact'
import { useSelection } from '../../hooks/useSelection'
import { videosService } from '@/services/videos.service'
import { publishService } from '@/services/publish.service'
import { toast } from 'sonner'
import type { PackageDetailModule, PackageDetailVideo } from '@/services/packages.service'
import type { ExplorerFocus } from '../../parseExplorerPath'

type ProcessingFilter = 'all' | 'ready' | 'processing' | 'uploading' | 'upcoming' | 'failed'

interface ModuleChildrenProps {
  module: PackageDetailModule | undefined
  focus: ExplorerFocus
  loading: boolean
  onRefresh?: () => void
}

const FILTER_OPTIONS: { value: ProcessingFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ready', label: 'Ready' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'processing', label: 'Processing' },
  { value: 'uploading', label: 'Uploading' },
  { value: 'failed', label: 'Failed' },
]

export function ModuleChildren({ module, focus, loading, onRefresh }: ModuleChildrenProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProcessingFilter>('all')
  const [upcomingOpen, setUpcomingOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const selection = useSelection()

  const videos: PackageDetailVideo[] = module?.videos ?? []
  const moduleId = module?._id ?? ''
  const [localVideos, setLocalVideos] = useState<PackageDetailVideo[]>([])

  useEffect(() => { setLocalVideos([]) }, [moduleId])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const displayVideos = localVideos.length > 0 ? localVideos : videos

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = displayVideos.findIndex((v) => v._id === active.id)
    const newIndex = displayVideos.findIndex((v) => v._id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(displayVideos, oldIndex, newIndex)
    setLocalVideos(reordered)

    try {
      await videosService.reorder(reordered.map((v) => v._id))
      toast.success('Order updated')
      onRefresh?.()
    } catch {
      setLocalVideos(displayVideos)
      toast.error('Failed to reorder')
    }
  }

  const [bulkOp, setBulkOp] = useState<'publish' | 'unpublish' | 'archive' | null>(null)
  const selectedItems = displayVideos
    .filter((v) => selection.isSelected(v._id))
    .map((v) => ({ id: v._id, name: v.title }))

  const bulkCfg =
    bulkOp === 'publish'
      ? { title: 'Publish videos', actionLabel: 'Publish', destructive: false, classify: (id: string) => classifyPublish('video', id), runOne: (id: string) => publishService.publish('video', id) }
      : bulkOp === 'unpublish'
      ? { title: 'Unpublish videos', actionLabel: 'Unpublish', destructive: true, classify: (id: string) => classifyUnpublish('video', id), runOne: (id: string) => publishService.unpublish('video', id) }
      : bulkOp === 'archive'
      ? { title: 'Archive videos', actionLabel: 'Archive', destructive: true, classify: (id: string) => classifyArchive(videosService.getDeleteImpact.bind(videosService), id), runOne: (id: string) => videosService.archive(id) }
      : null

  const filtered = displayVideos.filter((v) => {
    const matchesSearch =
      search.length < 1 ? true : v.title.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' ? true : v.processing_status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredIds = filtered.map((v) => v._id)
  const failedCount = displayVideos.filter((v) => v.processing_status === 'failed').length

  return (
    <>
      <div>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-slate-100 flex-wrap">
          {/* Select all */}
          {filtered.length > 0 && (
            <input
              type="checkbox"
              checked={filteredIds.length > 0 && filteredIds.every((id) => selection.isSelected(id))}
              onChange={() => selection.toggleAll(filteredIds)}
              className="w-4 h-4 accent-primary cursor-pointer shrink-0"
            />
          )}
          <div className="relative flex-1 min-w-40 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 h-8 text-sm"
              placeholder="Search videos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                } ${opt.value === 'failed' && failedCount > 0 ? 'ring-1 ring-red-400' : ''}`}
              >
                {opt.label}
                {opt.value === 'failed' && failedCount > 0 && ` (${failedCount})`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setUploadOpen(true)}
              disabled={!moduleId}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload Video</span>
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setUpcomingOpen(true)}
              disabled={!moduleId}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Upcoming</span>
            </Button>
          </div>
        </div>

        {loading && !module ? (
          <ChildrenListSkeleton />
        ) : filtered.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map((v) => v._id)} strategy={verticalListSortingStrategy}>
              <div className="py-1.5">
                {filtered.map((v) => (
                  <SortableItem key={v._id} id={v._id}>
                    {({ dragHandleProps, isDragging }) => (
                      <VideoRow
                        video={v}
                        parentFocus={focus}
                        onRefresh={onRefresh}
                        selected={selection.isSelected(v._id)}
                        onSelect={selection.toggle}
                        dragHandleProps={dragHandleProps}
                        isDragging={isDragging}
                      />
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <ExplorerEmptyState
            icon={Video}
            title={
              search || statusFilter !== 'all'
                ? 'No videos match'
                : 'No videos yet'
            }
            description={
              search
                ? `No results for "${search}".`
                : statusFilter !== 'all'
                ? `No ${statusFilter} videos in this module.`
                : 'Upload your first video to this module.'
            }
            action={
              search || statusFilter !== 'all'
                ? undefined
                : { label: 'Upload video', onClick: () => setUploadOpen(true) }
            }
          />
        )}
      </div>

      <UpcomingVideoDialog
        open={upcomingOpen}
        onClose={() => setUpcomingOpen(false)}
        onSuccess={() => { setUpcomingOpen(false); onRefresh?.() }}
        moduleId={moduleId}
      />

      <CreateVideoDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => { setUploadOpen(false); onRefresh?.() }}
        moduleId={moduleId}
      />

      <ExplorerSelectionBar
        count={selection.count}
        onClear={selection.clear}
        actions={[
          { label: 'Publish', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => setBulkOp('publish') },
          { label: 'Unpublish', icon: <EyeOff className="w-3.5 h-3.5" />, onClick: () => setBulkOp('unpublish'), variant: 'amber' },
          { label: 'Archive', icon: <Archive className="w-3.5 h-3.5" />, onClick: () => setBulkOp('archive'), variant: 'amber' },
        ]}
      />

      {bulkCfg && (
        <BulkImpactDialog
          open={!!bulkOp}
          onClose={() => setBulkOp(null)}
          onSuccess={() => { setBulkOp(null); selection.clear(); onRefresh?.() }}
          items={selectedItems}
          title={bulkCfg.title}
          actionLabel={bulkCfg.actionLabel}
          destructive={bulkCfg.destructive}
          classify={bulkCfg.classify}
          runOne={bulkCfg.runOne}
        />
      )}
    </>
  )
}
