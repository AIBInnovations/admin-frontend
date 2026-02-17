import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusToggle } from '@/components/common/StatusToggle';
import { ColumnDef } from '@/components/common/DataTable';
import { Subject } from '@/services/subjects.service';
import { GripVertical, MoreVertical, Eye, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

interface SubjectsColumnsProps {
  onNavigate: (subject: Subject) => void;
  onEdit: (subject: Subject) => void;
  onDelete: (subject: Subject) => void;
  onToggleActive: (subject: Subject) => void;
}

export function useSubjectsColumns({
  onNavigate,
  onEdit,
  onDelete,
  onToggleActive,
}: SubjectsColumnsProps): ColumnDef<Subject>[] {
  return [
    {
      id: 'order',
      header: 'Order',
      width: 'w-16',
      cell: (subject) => (
        <div className="flex items-center gap-1">
          <GripVertical className="h-3 w-3 cursor-grab text-muted-foreground" />
          <span className="text-sm font-medium">{subject.display_order}</span>
        </div>
      ),
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: (subject) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
            {subject.name.charAt(0)}
          </div>
          <span className="font-medium">{subject.name}</span>
        </div>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      cell: (subject) => (
        <p className="max-w-xs truncate text-sm text-muted-foreground">
          {subject.description || '—'}
        </p>
      ),
    },
    {
      id: 'packages',
      header: 'Packages',
      width: 'w-32',
      cell: (subject) => (
        <Badge variant="secondary">
          {subject.package_count || 0}{' '}
          {subject.package_count === 1 ? 'package' : 'packages'}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-32',
      cell: (subject) => (
        <div onClick={(e) => e.stopPropagation()}>
          <StatusToggle
            checked={subject.is_active}
            onCheckedChange={() => onToggleActive(subject)}
            size="sm"
          />
        </div>
      ),
    },
    {
      id: 'created',
      header: 'Created',
      width: 'w-32',
      cell: (subject) => (
        <span className="text-xs text-muted-foreground">
          {new Date(subject.createdAt).toLocaleDateString('en-IN', {
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
      cell: (subject) => (
        <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onNavigate(subject)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(subject)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(subject)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      ),
    },
  ];
}
