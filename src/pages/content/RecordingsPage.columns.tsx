import { Pencil, Trash2 } from 'lucide-react'
import { ColumnDef } from '@/components/common/DataTable'
import { Recording } from '@/services/recordings.service'
import { RecordingStatus } from '@/components/recordings/RecordingStatus'
import { RowMenu, fileSize } from '@/components/forms/editor/list'
import { istDay } from '@/components/forms/editor/ist'

interface RecordingsPageColumnsProps {
  canUpdate: boolean
  canDelete: boolean
  onEdit: (recording: Recording) => void
  onDelete: (recording: Recording) => void
}

/** The API populates the session with its title. */
export function sessionTitle(recording: Recording): string | null {
  const s = recording.session_id as unknown as { title?: string } | string | null
  if (!s) return null
  return typeof s === 'object' ? s.title ?? 'Deleted session' : 'Deleted session'
}

export function getRecordingsColumns({ canUpdate, canDelete, onEdit, onDelete }: RecordingsPageColumnsProps): ColumnDef<Recording>[] {
  return [
    {
      id: 'title',
      header: 'Title',
      cell: (recording) => (
        <div className="min-w-[180px] max-w-[240px] sm:max-w-md">
          <p className="truncate text-sm font-medium" title={recording.title}>{recording.title}</p>
          {recording.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{recording.description}</p>}
        </div>
      ),
    },
    {
      id: 'session',
      header: 'Session',
      width: 'w-56',
      cell: (recording) => <span className="block max-w-[220px] truncate text-sm" title={sessionTitle(recording) ?? undefined}>{sessionTitle(recording) ?? '—'}</span>,
    },
    { id: 'status', header: 'Status', width: 'w-28', cell: (recording) => <RecordingStatus status={recording.processing_status} /> },
    { id: 'size', header: 'Size', width: 'w-24', cell: (recording) => <span className="whitespace-nowrap text-[13px] tabular-nums text-muted-foreground">{fileSize(recording.file_size_mb)}</span> },
    { id: 'created', header: 'Created', width: 'w-32', cell: (recording) => <span className="whitespace-nowrap text-[13px] text-muted-foreground">{istDay(recording.createdAt)}</span> },
    {
      id: 'actions',
      header: '',
      width: 'w-12',
      cell: (recording) => (
        <RowMenu
          label={`Actions for ${recording.title}`}
          actions={[
            { label: 'Edit', icon: Pencil, onSelect: () => onEdit(recording), hidden: !canUpdate },
            { label: 'Delete', icon: Trash2, onSelect: () => onDelete(recording), tone: 'danger', separated: true, hidden: !canDelete },
          ]}
        />
      ),
    },
  ]
}
