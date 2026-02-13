import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusToggle } from '@/components/common/StatusToggle'
import { ColumnDef } from '@/components/common/DataTable'
import { Series } from '@/services/series.service'
import { GripVertical, MoreVertical, Pencil, Trash2 } from 'lucide-react'

interface SeriesColumnsProps {
  onEdit: (series: Series) => void
  onDelete: (series: Series) => void
  onToggleActive: (series: Series) => void
}

export function useSeriesColumns({
  onEdit,
  onDelete,
  onToggleActive,
}: SeriesColumnsProps): ColumnDef<Series>[] {
  return [
    {
      id: 'order',
      header: 'Order',
      width: 'w-16',
      cell: (series) => (
        <div className="flex items-center gap-1">
          <GripVertical className="h-3 w-3 cursor-grab text-muted-foreground" />
          <span className="text-sm font-medium">{series.display_order}</span>
        </div>
      ),
    },
    {
      id: 'series',
      header: 'Series',
      cell: (series) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
            {series.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium">{series.name}</p>
            <p className="max-w-xs truncate text-xs text-muted-foreground">
              {series.description || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'package',
      header: 'Package',
      cell: (series) => (
        <Badge variant="secondary">
          {typeof series.package_id === 'object' ? series.package_id.name : '—'}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-32',
      cell: (series) => (
        <StatusToggle
          checked={series.is_active}
          onCheckedChange={() => onToggleActive(series)}
          size="sm"
        />
      ),
    },
    {
      id: 'created',
      header: 'Created',
      width: 'w-32',
      cell: (series) => (
        <span className="text-xs text-muted-foreground">
          {new Date(series.createdAt).toLocaleDateString('en-IN', {
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
      cell: (series) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(series)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(series)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
