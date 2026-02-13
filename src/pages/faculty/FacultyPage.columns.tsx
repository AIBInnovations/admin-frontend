import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { StatusToggle } from '@/components/common/StatusToggle'
import { Faculty } from '@/services/faculty.service'
import { MoreVertical, Pencil, Trash2, UserCircle, BadgeCheck, ShieldCheck } from 'lucide-react'

interface FacultyColumnsProps {
  onEdit: (faculty: Faculty) => void
  onDelete: (faculty: Faculty) => void
  onToggleActive: (faculty: Faculty) => void
  onVerify: (faculty: Faculty) => void
}

export function useFacultyColumns({
  onEdit,
  onDelete,
  onToggleActive,
  onVerify,
}: FacultyColumnsProps): ColumnDef<Faculty>[] {
  return [
    {
      id: 'faculty',
      header: 'Faculty',
      cell: (faculty) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted overflow-hidden shrink-0">
            {faculty.photo_url ? (
              <img src={faculty.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserCircle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{faculty.name}</p>
            <p className="text-xs text-muted-foreground truncate">{faculty.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'specialization',
      header: 'Specialization',
      cell: (faculty) => (
        <Badge variant="secondary" className="text-[10px]">
          {faculty.specialization}
        </Badge>
      ),
    },
    {
      id: 'experience',
      header: 'Experience',
      width: 'w-24',
      cell: (faculty) => (
        <span className="text-sm">
          {faculty.experience_years != null ? `${faculty.experience_years} yrs` : '—'}
        </span>
      ),
    },
    {
      id: 'verified',
      header: 'Verified',
      width: 'w-24',
      cell: (faculty) => (
        <Badge className={`text-[10px] ${faculty.is_verified
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
          : 'bg-amber-500/10 text-amber-600 border-amber-200'
        }`}>
          {faculty.is_verified ? (
            <><BadgeCheck className="mr-1 h-3 w-3" />Verified</>
          ) : 'Pending'}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-24',
      cell: (faculty) => (
        <StatusToggle
          isActive={faculty.is_active}
          onToggle={() => onToggleActive(faculty)}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (faculty) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(faculty)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            {!faculty.is_verified && (
              <DropdownMenuItem onClick={() => onVerify(faculty)}>
                <ShieldCheck className="mr-2 h-4 w-4" />Verify Faculty
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(faculty)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
