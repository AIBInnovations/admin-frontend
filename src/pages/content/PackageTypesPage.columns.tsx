import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { ColumnDef } from '@/components/common/DataTable'
import { dayIST } from '@/components/users/lib'
import type { PackageType } from '@/services/packageTypes.service'

interface PackageTypesColumnsProps {
  onEdit?: (pt: PackageType) => void
  onDelete?: (pt: PackageType) => void
}

export function usePackageTypesColumns({ onEdit, onDelete }: PackageTypesColumnsProps): ColumnDef<PackageType>[] {
  const columns: ColumnDef<PackageType>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: (pt) => (
        <div className="flex min-w-[180px] items-center gap-3">
          {pt.thumbnail_url
            ? <img src={pt.thumbnail_url} alt="" loading="lazy" className="h-9 w-16 shrink-0 rounded-md border border-border object-cover" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
            : <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">{pt.name.charAt(0).toUpperCase()}</div>}
          <span className="min-w-0 break-words text-sm font-medium">{pt.name}</span>
        </div>
      ),
    },
    { id: 'description', header: 'Description', cell: (pt) => <span className="line-clamp-2 min-w-[200px] text-sm text-muted-foreground">{pt.description || 'No description'}</span> },
    { id: 'created', header: 'Created', width: 'w-32', cell: (pt) => <span className="whitespace-nowrap text-xs text-muted-foreground">{dayIST(pt.createdAt)}</span> },
  ]
  if (onEdit || onDelete) {
    columns.push({
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (pt) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${pt.name}`}><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && <DropdownMenuItem onClick={() => onEdit(pt)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>}
            {onEdit && onDelete && <DropdownMenuSeparator />}
            {onDelete && <DropdownMenuItem onClick={() => onDelete(pt)} className="text-danger focus:text-danger"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })
  }
  return columns
}
