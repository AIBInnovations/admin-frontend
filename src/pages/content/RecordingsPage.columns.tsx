import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { Recording } from '@/services/recordings.service'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'

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

interface RecordingsPageColumnsProps {
  onEdit: (recording: Recording) => void
  onDelete: (recording: Recording) => void
}

export function getRecordingsColumns({ onEdit, onDelete }: RecordingsPageColumnsProps): ColumnDef<Recording>[] {
  return [
    {
      id: 'title',
      header: 'Title',
      cell: (recording) => (
        <div className="max-w-md">
          <p className="font-medium truncate">{recording.title}</p>
          {recording.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {recording.description}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'session',
      header: 'Session',
      width: 'w-48',
      cell: (recording) => (
        <span className="text-sm">
          {recording.session_id && typeof recording.session_id === 'object'
            ? recording.session_id.title
            : '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-24',
      cell: (recording) => (
        <Badge className={`text-[10px] capitalize ${statusColors[recording.processing_status] || ''}`}>
          {recording.processing_status}
        </Badge>
      ),
    },
    {
      id: 'size',
      header: 'Size',
      width: 'w-20',
      cell: (recording) => (
        <span className="text-xs text-muted-foreground">{formatFileSize(recording.file_size_mb)}</span>
      ),
    },
    {
      id: 'created',
      header: 'Created',
      width: 'w-32',
      cell: (recording) => (
        <span className="text-xs text-muted-foreground">
          {new Date(recording.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-12',
      cell: (recording) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation()
              onEdit(recording)
            }}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation()
              onDelete(recording)
            }} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
