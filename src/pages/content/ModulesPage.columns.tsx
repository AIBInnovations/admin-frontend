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
import { Module } from '@/services/modules.service'
import { GripVertical, MoreVertical, Pencil, Trash2, BookOpen, Clock, RefreshCw } from 'lucide-react'

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}` : `${m}m`
}

interface ModulesColumnsProps {
  onEdit: (mod: Module) => void
  onDelete: (mod: Module) => void
  onToggleActive: (mod: Module) => void
  onRecalculate: (mod: Module) => void
}

export function useModulesColumns({
  onEdit,
  onDelete,
  onToggleActive,
  onRecalculate,
}: ModulesColumnsProps): ColumnDef<Module>[] {
  return [
    {
      id: 'order',
      header: 'Order',
      width: 'w-16',
      cell: (mod) => (
        <div className="flex items-center gap-1">
          <GripVertical className="h-3 w-3 cursor-grab text-muted-foreground" />
          <span className="text-sm font-medium">{mod.display_order}</span>
        </div>
      ),
    },
    {
      id: 'module',
      header: 'Module',
      cell: (mod) => (
        <div>
          <p className="text-sm font-medium">{mod.name}</p>
          <p className="max-w-[220px] truncate text-xs text-muted-foreground">
            {mod.description || '—'}
          </p>
        </div>
      ),
    },
    {
      id: 'series',
      header: 'Series',
      cell: (mod) => (
        <Badge variant="secondary" className="text-[10px]">
          {typeof mod.series_id === 'object' ? mod.series_id.name : '—'}
        </Badge>
      ),
    },
    {
      id: 'lessons',
      header: 'Lessons',
      width: 'w-24',
      cell: (mod) => (
        <div className="flex items-center gap-1">
          <BookOpen className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{mod.lesson_count}</span>
        </div>
      ),
    },
    {
      id: 'duration',
      header: 'Duration',
      width: 'w-24',
      cell: (mod) => (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs">{formatDuration(mod.estimated_duration_minutes)}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-32',
      cell: (mod) => (
        <StatusToggle
          checked={mod.is_active}
          onCheckedChange={() => onToggleActive(mod)}
          size="sm"
        />
      ),
    },
    {
      id: 'created',
      header: 'Created',
      width: 'w-32',
      cell: (mod) => (
        <span className="text-xs text-muted-foreground">
          {new Date(mod.createdAt).toLocaleDateString('en-IN', {
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
      cell: (mod) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(mod)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRecalculate(mod)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recalculate Stats
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(mod)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
