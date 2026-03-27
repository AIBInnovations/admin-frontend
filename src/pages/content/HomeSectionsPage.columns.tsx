import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { HomeSection } from '@/services/homeSections.service'
import { MoreVertical, Pencil, Trash2, Eye } from 'lucide-react'

interface HomeSectionsColumnsProps {
  onEdit: (section: HomeSection) => void
  onDelete: (section: HomeSection) => void
  onViewItems: (section: HomeSection) => void
  onPublishAction: (section: HomeSection, action: 'publish' | 'unpublish') => void
}

export function useHomeSectionsColumns({
  onEdit,
  onDelete,
  onViewItems,
  onPublishAction,
}: HomeSectionsColumnsProps): ColumnDef<HomeSection>[] {
  return [
    {
      id: 'section',
      header: 'Section',
      cell: (section) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {section.title || 'Untitled Section'}
          </p>
          {section.subtitle && (
            <p className="text-xs text-muted-foreground truncate">{section.subtitle}</p>
          )}
        </div>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      width: 'w-20',
      cell: (section) => (
        <Badge variant="outline" className="text-[10px] font-mono">
          {section.item_count ?? section.items?.length ?? 0}
        </Badge>
      ),
    },
    {
      id: 'colors',
      header: 'Colors',
      width: 'w-24',
      cell: (section) => (
        <div className="flex items-center gap-1.5">
          {section.background_color ? (
            <div
              className="h-5 w-5 rounded border border-border shrink-0"
              style={{ backgroundColor: section.background_color }}
              title={`BG: ${section.background_color}`}
            />
          ) : null}
          {section.text_color ? (
            <div
              className="h-5 w-5 rounded border border-border shrink-0"
              style={{ backgroundColor: section.text_color }}
              title={`Text: ${section.text_color}`}
            />
          ) : null}
          {!section.background_color && !section.text_color && (
            <span className="text-xs text-muted-foreground">Default</span>
          )}
        </div>
      ),
    },
    {
      id: 'visibleTo',
      header: 'Visible To',
      width: 'w-28',
      cell: (section) => {
        const v = section.visible_to || 'all'
        if (v === 'all') return <Badge variant="outline" className="text-[10px]">All</Badge>
        if (v === 'subject') {
          return (
            <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-200">
              Subject ({section.visible_to_subjects?.length || 0})
            </Badge>
          )
        }
        return (
          <Badge className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-200">
            Package ({section.visible_to_packages?.length || 0})
          </Badge>
        )
      },
    },
    {
      id: 'order',
      header: 'Order',
      width: 'w-16',
      cell: (section) => (
        <span className="text-sm font-mono">{section.display_order}</span>
      ),
    },
    {
      id: 'dates',
      header: 'Date Range',
      width: 'w-40',
      cell: (section) => (
        <div className="text-xs text-muted-foreground">
          {section.start_date ? (
            <p>{new Date(section.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          ) : (
            <p>No start date</p>
          )}
          {section.end_date && (
            <p>to {new Date(section.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-24',
      cell: (section) => (
        <Badge className={`text-[10px] ${
          section.is_active
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
            : 'bg-red-500/10 text-red-600 border-red-200'
        }`}>
          {section.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'publish_status',
      header: 'Publish',
      width: 'w-24',
      cell: (section) => (
        <Badge className={`text-[10px] ${
          section.publish_status === 'published'
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
            : 'bg-amber-500/10 text-amber-600 border-amber-200'
        }`}>
          {section.publish_status === 'published' ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (section) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewItems(section)}>
              <Eye className="mr-2 h-4 w-4" />View Items
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(section)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onPublishAction(section, section.publish_status === 'draft' ? 'publish' : 'unpublish')}
            >
              {section.publish_status === 'draft' ? 'Publish' : 'Unpublish'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(section)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
