import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { Video } from '@/services/videos.service'
import { MoreVertical, Pencil, Trash2, Clock, Eye } from 'lucide-react'

function formatDuration(seconds: number): string {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatFileSize(mb: number): string {
  if (!mb) return '—'
  if (mb >= 1000) return `${(mb / 1000).toFixed(1)} GB`
  return `${mb.toFixed(0)} MB`
}

const statusColors: Record<string, string> = {
  ready: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  processing: 'bg-amber-500/10 text-amber-600 border-amber-200',
  uploading: 'bg-blue-500/10 text-blue-600 border-blue-200',
  failed: 'bg-red-500/10 text-red-600 border-red-200',
}

interface VideosColumnsProps {
  onEdit: (video: Video) => void
  onDelete: (video: Video) => void
}

export function useVideosColumns({
  onEdit,
  onDelete,
}: VideosColumnsProps): ColumnDef<Video>[] {
  return [
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
              {typeof video.module_id === 'object' ? video.module_id.name : '—'}
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
      id: 'duration',
      header: 'Duration',
      width: 'w-24',
      cell: (video) => (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs">{formatDuration(video.duration_seconds)}</span>
        </div>
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
      id: 'status',
      header: 'Status',
      width: 'w-28',
      cell: (video) => (
        <Badge className={`text-[10px] ${statusColors[video.processing_status] || ''}`}>
          {video.processing_status}
        </Badge>
      ),
    },
    {
      id: 'access',
      header: 'Access',
      width: 'w-20',
      cell: (video) => (
        <Badge variant={video.is_free ? 'secondary' : 'outline'} className="text-[10px]">
          {video.is_free ? 'Free' : 'Paid'}
        </Badge>
      ),
    },
    {
      id: 'views',
      header: 'Views',
      width: 'w-20',
      cell: (video) => (
        <span className="text-sm text-muted-foreground">{video.view_count.toLocaleString()}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (video) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(video)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(video)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
