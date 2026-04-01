import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { Tutorial } from '@/services/tutorials.service'
import { MoreVertical, Pencil, Trash2, ExternalLink, Image, FileCheck } from 'lucide-react'

interface TutorialsColumnsProps {
  onEdit: (tutorial: Tutorial) => void
  onDelete: (tutorial: Tutorial) => void
}

export function useTutorialsColumns({
  onEdit,
  onDelete,
}: TutorialsColumnsProps): ColumnDef<Tutorial>[] {
  return [
    {
      id: 'title',
      header: 'Title',
      cell: (tutorial) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-14 items-center justify-center rounded bg-muted overflow-hidden shrink-0">
            {tutorial.thumbnail_url ? (
              <img src={tutorial.thumbnail_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Image className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate max-w-[250px]">{tutorial.title}</p>
            {tutorial.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[250px]">{tutorial.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'url',
      header: 'URL',
      width: 'w-36',
      cell: (tutorial) => {
        let hostname = tutorial.url
        try {
          hostname = new URL(tutorial.url).hostname
        } catch {
          hostname = tutorial.url
        }
        return (
          <a
            href={tutorial.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate max-w-[130px]"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            {hostname}
          </a>
        )
      },
    },
    {
      id: 'media',
      header: 'Media',
      width: 'w-24',
      cell: (tutorial) => {
        if (tutorial.media_url) {
          return (
            <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
              <FileCheck className="mr-1 h-3 w-3" />Uploaded
            </Badge>
          )
        }
        return <span className="text-xs text-muted-foreground">None</span>
      },
    },
    {
      id: 'screens',
      header: 'Screens',
      width: 'w-32',
      cell: (tutorial) => {
        const screens = tutorial.display_screens || []
        if (screens.length === 0) return <span className="text-xs text-muted-foreground">None</span>
        return (
          <div className="flex flex-wrap gap-1">
            {screens.map((s: string) => (
              <Badge key={s} className="text-[9px] bg-indigo-500/10 text-indigo-600 border-indigo-200 capitalize">
                {s}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      id: 'subject',
      header: 'Subject',
      width: 'w-32',
      cell: (tutorial) => {
        const subject = tutorial.subject_id
        if (subject && typeof subject === 'object' && 'name' in subject) {
          return <span className="text-sm">{subject.name}</span>
        }
        return <span className="text-xs text-muted-foreground">All Subjects</span>
      },
    },
    {
      id: 'order',
      header: 'Order',
      width: 'w-16',
      cell: (tutorial) => (
        <span className="text-sm font-mono">{tutorial.display_order}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-24',
      cell: (tutorial) => (
        <Badge className={`text-[10px] ${
          tutorial.is_active
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
            : 'bg-red-500/10 text-red-600 border-red-200'
        }`}>
          {tutorial.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'publish_status',
      header: 'Publish',
      width: 'w-24',
      cell: (tutorial) => (
        <Badge className={`text-[10px] ${
          tutorial.publish_status === 'published'
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
            : 'bg-amber-500/10 text-amber-600 border-amber-200'
        }`}>
          {tutorial.publish_status === 'published' ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (tutorial) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(tutorial)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(tutorial)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
