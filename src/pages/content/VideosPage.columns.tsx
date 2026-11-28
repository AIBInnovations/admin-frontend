import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { PublishStatusWarning } from '@/components/common/PublishStatusWarning'
import { Video } from '@/services/videos.service'
import { MoreVertical, Pencil, Archive, Eye, Clock, RotateCw, FolderInput, CopyPlus } from 'lucide-react'
import type { PopulatedRef, PublishStatus } from '@/types/api.types'

/** The parent as the list endpoint returns it; null once it was deleted. */
type Parent = (PopulatedRef & { publish_status?: PublishStatus; is_active?: boolean }) | null

function formatFileSize(mb: number): string {
  if (!mb) return '—'
  if (mb >= 1000) return `${(mb / 1000).toFixed(1)} GB`
  return `${mb.toFixed(0)} MB`
}

const statusColors: Record<string, string> = {
  ready: 'bg-success-soft text-success border-transparent',
  processing: 'bg-warning-soft text-warning border-transparent',
  uploading: 'bg-accent text-accent-foreground border-transparent',
  failed: 'bg-danger-soft text-danger border-transparent',
  upcoming: 'bg-warning-soft text-warning border-transparent',
}

interface VideosColumnsProps {
  canEdit: boolean
  canDelete: boolean
  onEdit: (video: Video) => void
  onArchive: (video: Video) => void
  onPublishAction: (video: Video, action: 'publish' | 'unpublish') => void
  onRetryTranscoding: (video: Video) => void
  /** "Move to..." / "Copy to...": the full-page picker. */
  onMove?: (video: Video, kind: 'video-move' | 'video-copy') => void
  /** Row checkboxes for moving or copying several at once. */
  selection?: { isSelected: (id: string) => boolean; toggle: (id: string) => void }
}

export function useVideosColumns({
  canEdit,
  canDelete,
  onEdit,
  onArchive,
  onPublishAction,
  onRetryTranscoding,
  onMove,
  selection,
}: VideosColumnsProps): ColumnDef<Video>[] {
  const select: ColumnDef<Video>[] = selection ? [{
    id: 'select',
    header: '',
    width: 'w-10',
    cell: (video) => (
      <label className="-m-2 flex cursor-pointer p-2" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          aria-label={`Select ${video.title}`}
          checked={selection.isSelected(video._id)}
          onChange={() => selection.toggle(video._id)}
          className="h-4 w-4 cursor-pointer accent-primary"
        />
      </label>
    ),
  }] : []
  return [
    ...select,
    {
      id: 'video',
      header: 'Video',
      cell: (video) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-16 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {video.thumbnail_url ? (
              <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{video.title}</p>
            <p className="text-xs text-muted-foreground">
              {video.module_id && typeof video.module_id === 'object' ? video.module_id.name : 'Deleted module'}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'faculty',
      header: 'Faculty',
      cell: (video) => (
        <span className="text-sm">
          {video.faculty_id && typeof video.faculty_id === 'object'
            ? video.faculty_id.name
            : '—'}
        </span>
      ),
    },
    {
      id: 'size',
      header: 'Size',
      width: 'w-20',
      cell: (video) => (
        <span className="text-xs text-muted-foreground">{formatFileSize(video.file_size_mb)}</span>
      ),
    },
    {
      id: 'publish_status',
      header: 'Publish',
      width: 'w-28',
      cell: (video) => {
        const mod: Parent = video.module_id && typeof video.module_id === 'object' ? video.module_id : null
        return (
          <div className="flex items-center gap-1.5">
            <Badge
              variant={video.publish_status === 'published' ? 'default' : 'secondary'}
              className={video.publish_status === 'draft' ? 'bg-warning-soft text-warning border-transparent' : 'bg-success-soft text-success border-transparent'}
            >
              {video.publish_status === 'draft' ? 'Draft' : 'Published'}
            </Badge>
            <PublishStatusWarning
              publishStatus={video.publish_status}
              parentPublishStatus={mod?.publish_status}
              parentIsActive={mod?.is_active}
              parentType="module"
              parentName={mod?.name}
            />
          </div>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-28',
      cell: (video) => (
        <Badge className={`text-[11px] ${statusColors[video.processing_status] || ''}`}>
          {video.processing_status.charAt(0).toUpperCase() + video.processing_status.slice(1)}
        </Badge>
      ),
    },
    {
      id: 'scheduled',
      header: 'Scheduled',
      width: 'w-28',
      cell: (video) => video.scheduled_release_at ? (
        <Badge className="text-[11px] bg-warning-soft text-warning border-transparent">
          <Clock className="h-2.5 w-2.5 mr-1" />
          {new Date(video.scheduled_release_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
    },
    {
      id: 'access',
      header: 'Access',
      width: 'w-20',
      cell: (video) => (
        <Badge variant="outline" className={`text-[11px] ${video.is_free ? 'bg-success-soft text-success border-transparent' : ''}`}>
          {video.is_free ? 'Free' : 'Paid'}
        </Badge>
      ),
    },
    {
      id: 'views',
      header: 'Views',
      width: 'w-20',
      cell: (video) => (
        <span className="text-sm text-muted-foreground">{(video.view_count ?? 0).toLocaleString('en-IN')}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (video) => (canEdit || canDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${video.title}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && <DropdownMenuItem onClick={() => onEdit(video)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>}
            {canEdit && <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onPublishAction(video, video.publish_status === 'draft' ? 'publish' : 'unpublish');
              }}
            >
              {video.publish_status === 'draft' ? 'Publish' : 'Unpublish'}
            </DropdownMenuItem>}
            {canEdit && onMove && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(video, 'video-move') }}>
                <FolderInput className="mr-2 h-4 w-4" />Move to…
              </DropdownMenuItem>
            )}
            {canEdit && onMove && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(video, 'video-copy') }}>
                <CopyPlus className="mr-2 h-4 w-4" />Copy to…
              </DropdownMenuItem>
            )}
            {canEdit && video.processing_status === 'failed' && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRetryTranscoding(video);
                }}
                className="text-primary"
              >
                <RotateCw className="mr-2 h-4 w-4" />Retry transcoding
              </DropdownMenuItem>
            )}
            {canDelete && (
              <>
                {canEdit && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => onArchive(video)} className="text-warning">
                  <Archive className="mr-2 h-4 w-4" />Archive
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
