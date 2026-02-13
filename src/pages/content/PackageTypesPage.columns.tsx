import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { PackageType } from '@/services/packageTypes.service'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'

interface PackageTypesColumnsProps {
  onEdit: (pt: PackageType) => void
  onDelete: (pt: PackageType) => void
}

export function usePackageTypesColumns({
  onEdit,
  onDelete,
}: PackageTypesColumnsProps): ColumnDef<PackageType>[] {
  return [
    {
      id: 'name',
      header: 'Name',
      cell: (pt) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
            {pt.name.charAt(0)}
          </div>
          <span className="text-sm font-medium">{pt.name}</span>
        </div>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      cell: (pt) => (
        <span className="text-sm text-muted-foreground line-clamp-1">{pt.description}</span>
      ),
    },
    {
      id: 'created',
      header: 'Created',
      width: 'w-32',
      cell: (pt) => (
        <span className="text-xs text-muted-foreground">
          {new Date(pt.createdAt).toLocaleDateString('en-IN', {
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
      cell: (pt) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(pt)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(pt)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
