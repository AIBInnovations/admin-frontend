import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Copy, Clock, Archive, Eye, EyeOff, GripVertical, Braces } from 'lucide-react'
import { ProcessingBadge, PublishBadge, FreeBadge, ScheduledBadge } from '../../ui/StatusBadge'
import { VideoFormDialog } from '../../forms/VideoFormDialog'
import { PublishDialog } from '../../dialogs/PublishDialog'
import { ConfirmDialog } from '../../dialogs/ConfirmDialog'
import { ProcessingDetailsPopover } from '../popovers/ProcessingDetailsPopover'
import { RawJsonDrawer } from '../popovers/RawJsonDrawer'
import { useExplorerMutation } from '../../hooks/useExplorerMutation'
import { copyText } from '../../copyShareLink'
import { videosService } from '@/services/videos.service'
import type { PackageDetailVideo } from '@/services/packages.service'

interface VideoRowProps {
  video: PackageDetailVideo
  onRefresh?: () => void
  selected?: boolean
  onSelect?: (id: string) => void
  dragHandleProps?: React.HTMLAttributes<HTMLElement>
  isDragging?: boolean
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function VideoRow({ video, onRefresh, selected, onSelect, dragHandleProps, isDragging }: VideoRowProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [rawJsonOpen, setRawJsonOpen] = useState(false)
  const isPublished = video.publish_status === 'published'

  const isScheduled =
    video.processing_status === 'ready' &&
    video.scheduled_release_at &&
    new Date(video.scheduled_release_at) > new Date()

  const archiveMutation = useExplorerMutation({
    name: 'Archive video',
    fn: () => videosService.archive(video._id),
    onSuccess: () => { setArchiveOpen(false); onRefresh?.() },
    successMessage: `"${video.title}" archived`,
  })

  return (
    <>
      <div className={`flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-xl hover:bg-slate-50 transition-colors group ${selected ? 'bg-blue-50' : ''} ${isDragging ? 'opacity-40' : ''}`}>
        {/* Drag handle */}
        {dragHandleProps && (
          <span
            {...dragHandleProps}
            className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </span>
        )}
        {/* Checkbox (when selection mode active) */}
        {onSelect && (
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={() => onSelect(video._id)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 w-4 h-4 accent-primary cursor-pointer"
          />
        )}
        {/* Thumbnail */}
        <div className="relative shrink-0">
          <Avatar className="w-10 h-10 rounded-lg">
            {video.thumbnail_url && <AvatarImage src={video.thumbnail_url} alt={video.title} />}
            <AvatarFallback className="rounded-lg bg-slate-100 text-slate-600 text-xs">
              {video.display_order}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{video.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {video.duration_seconds > 0 && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(video.duration_seconds)}
              </span>
            )}
            {video.faculty_id && (
              <span className="text-xs text-slate-400 truncate max-w-25">
                {video.faculty_id.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end max-w-44">
          <ProcessingDetailsPopover video={video} onRefresh={onRefresh}>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
            >
              <ProcessingBadge status={video.processing_status} className="hover:opacity-80 transition-opacity" />
            </button>
          </ProcessingDetailsPopover>
          {video.publish_status && <PublishBadge status={video.publish_status} />}
          {video.is_free && <FreeBadge />}
          {isScheduled && video.scheduled_release_at && (
            <ScheduledBadge dateIso={video.scheduled_release_at} />
          )}
        </div>

        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPublishOpen(true)}>
                {isPublished
                  ? <><EyeOff className="w-3.5 h-3.5 mr-2" /> Unpublish</>
                  : <><Eye className="w-3.5 h-3.5 mr-2" /> Publish</>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyText(video._id, 'Video ID')}>
                <Copy className="w-3.5 h-3.5 mr-2" /> Copy ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRawJsonOpen(true)}>
                <Braces className="w-3.5 h-3.5 mr-2" /> View raw JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-amber-600 focus:text-amber-600"
                onClick={() => setArchiveOpen(true)}
              >
                <Archive className="w-3.5 h-3.5 mr-2" /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <VideoFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { setEditOpen(false); onRefresh?.() }}
        video={video}
      />

      <ConfirmDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        onConfirm={archiveMutation.execute}
        loading={archiveMutation.loading}
        title="Archive video"
        description={`"${video.title}" will be hidden from students. You can restore it later.`}
        confirmLabel="Archive"
      />

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onSuccess={() => { setPublishOpen(false); onRefresh?.() }}
        entityType="video"
        entityId={video._id}
        entityName={video.title}
        currentStatus={video.publish_status === 'published' ? 'published' : 'draft'}
      />

      <RawJsonDrawer
        open={rawJsonOpen}
        onClose={() => setRawJsonOpen(false)}
        label={video.title}
        data={video}
      />
    </>
  )
}
