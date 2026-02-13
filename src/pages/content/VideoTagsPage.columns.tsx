import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { VideoTag } from '@/services/videoTags.service'
import { MoreVertical, Pencil, Trash2, Hash } from 'lucide-react'

interface VideoTagsColumnsProps {
  onEdit: (tag: VideoTag) => void
  onDelete: (tag: VideoTag) => void
}

export function useVideoTagsColumns({
  onEdit,
  onDelete,
}: VideoTagsColumnsProps): ColumnDef<VideoTag>[] {
  return [
    {
      id: 'tag',
      header: 'Tag',
      cell: (tag) => (
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{tag.name}</span>
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      cell: (tag) => (
        <span className="text-sm text-muted-foreground">
          {tag.category || '—'}
        </span>
      ),
    },
    {
      id: 'created',
      header: 'Created',
      width: 'w-32',
      cell: (tag) => (
        <span className="text-xs text-muted-foreground">
          {new Date(tag.createdAt).toLocaleDateString('en-IN', {
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
      width: 'w-10',
      cell: (tag) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(tag)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(tag)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
