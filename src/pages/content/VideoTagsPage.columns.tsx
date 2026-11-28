import { Hash, Pencil, Trash2 } from 'lucide-react'
import { ColumnDef } from '@/components/common/DataTable'
import { VideoTag } from '@/services/videoTags.service'
import { RowMenu } from '@/components/forms/editor/list'
import { istDay } from '@/components/forms/editor/ist'

interface VideoTagsColumnsProps {
  canUpdate: boolean
  canDelete: boolean
  onEdit: (tag: VideoTag) => void
  onDelete: (tag: VideoTag) => void
}

export function getVideoTagsColumns({ canUpdate, canDelete, onEdit, onDelete }: VideoTagsColumnsProps): ColumnDef<VideoTag>[] {
  return [
    {
      id: 'tag',
      header: 'Tag',
      cell: (tag) => (
        <div className="flex items-center gap-2">
          <Hash aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="max-w-[320px] truncate text-sm font-medium" title={tag.name}>{tag.name}</span>
        </div>
      ),
    },
    { id: 'category', header: 'Category', cell: (tag) => <span className="text-sm text-muted-foreground">{tag.category || '—'}</span> },
    { id: 'created', header: 'Created', width: 'w-32', cell: (tag) => <span className="whitespace-nowrap text-[13px] text-muted-foreground">{istDay(tag.createdAt)}</span> },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (tag) => (
        <RowMenu
          label={`Actions for ${tag.name}`}
          actions={[
            { label: 'Edit', icon: Pencil, onSelect: () => onEdit(tag), hidden: !canUpdate },
            { label: 'Delete', icon: Trash2, onSelect: () => onDelete(tag), tone: 'danger', separated: true, hidden: !canDelete },
          ]}
        />
      ),
    },
  ]
}
