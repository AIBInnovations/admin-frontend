import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { StatusToggle } from '@/components/common/StatusToggle'
import { StatusPill } from '@/components/common/detail'
import { SubjectChips } from '@/components/faculty/SubjectChips'
import { Faculty, subjectsOf } from '@/services/faculty.service'
import { AverageRating } from '@/pages/feedback/components/figures'
import { formatCount } from '@/lib/format'
import { Eye, MoreVertical, Pencil, Trash2, UserCircle, BadgeCheck, ShieldCheck } from 'lucide-react'

interface FacultyColumnsProps {
  // Left out when the admin may not do it
  onEdit?: (faculty: Faculty) => void
  onDelete?: (faculty: Faculty) => void
  onToggleActive?: (faculty: Faculty) => void
  onVerify?: (faculty: Faculty) => void
  showRating: boolean
  pendingId: string | null
}

export function useFacultyColumns({
  onEdit,
  onDelete,
  onToggleActive,
  onVerify,
  showRating,
  pendingId,
}: FacultyColumnsProps): ColumnDef<Faculty>[] {
  return [
    {
      id: 'faculty',
      header: 'Faculty',
      cell: (faculty) => (
        <div className="flex min-w-[180px] items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            {faculty.photo_url ? (
              <img src={faculty.photo_url} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <UserCircle aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 max-w-[260px]">
            <p className="truncate text-sm font-medium">{faculty.name}</p>
            {faculty.email && <p className="truncate text-xs text-muted-foreground">{faculty.email}</p>}
          </div>
        </div>
      ),
    },
    {
      id: 'code',
      header: 'Code',
      width: 'w-28',
      cell: (faculty) => (
        faculty.faculty_code
          ? <span className="whitespace-nowrap font-mono text-[13px] tabular-nums">{faculty.faculty_code}</span>
          : <span className="whitespace-nowrap text-xs text-muted-foreground" title="Given when the faculty codes are filled in">Not assigned</span>
      ),
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: (faculty) => {
        const subjects = subjectsOf(faculty)
        return (
          <div className="min-w-[150px] space-y-1">
            {subjects.length > 0 ? <SubjectChips subjects={subjects} max={2} /> : <span className="text-xs text-muted-foreground">—</span>}
            {faculty.specialization && (
              <p className="max-w-[180px] truncate text-xs text-muted-foreground">{faculty.specialization}</p>
            )}
          </div>
        )
      },
    },
    {
      id: 'order',
      header: 'Order',
      width: 'w-16',
      cell: (faculty) => (
        <span className="text-sm tabular-nums">{faculty.display_order ?? 0}</span>
      ),
    },
    {
      id: 'experience',
      header: 'Experience',
      width: 'w-24',
      cell: (faculty) => (
        <span className="whitespace-nowrap text-sm">
          {faculty.experience_years != null ? `${faculty.experience_years} ${faculty.experience_years === 1 ? 'yr' : 'yrs'}` : '—'}
        </span>
      ),
    },
    ...(showRating ? [{
      id: 'rating',
      header: 'Rating',
      cell: (faculty: Faculty) => (
        faculty.rating && (faculty.rating.rating_count > 0 || faculty.rating.open_count > 0) ? (
          <Link to={`/feedback/faculty/${faculty._id}`} className="block whitespace-nowrap rounded hover:underline" aria-label={`Feedback for ${faculty.name}`}>
            <AverageRating value={faculty.rating.average} count={faculty.rating.rating_count} />
            {faculty.rating.open_count > 0 && <span className="block text-xs text-muted-foreground">{formatCount(faculty.rating.open_count)} open</span>}
          </Link>
        ) : <span className="text-xs text-muted-foreground">—</span>
      ),
    }] : []),
    {
      id: 'verified',
      header: 'Verified',
      width: 'w-24',
      cell: (faculty) => (
        <StatusPill tone={faculty.is_verified ? 'success' : 'warning'}>
          {faculty.is_verified ? (
            <><BadgeCheck aria-hidden="true" className="mr-1 h-3.5 w-3.5" />Verified</>
          ) : 'Pending'}
        </StatusPill>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-24',
      cell: (faculty) => (
        <StatusToggle
          checked={faculty.is_active}
          label={faculty.name}
          disabled={!onToggleActive || pendingId === faculty._id}
          onCheckedChange={() => onToggleActive?.(faculty)}
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
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${faculty.name}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/faculty/${faculty._id}`}><Eye className="mr-2 h-4 w-4" />View</Link>
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(faculty)}>
                <Pencil className="mr-2 h-4 w-4" />Edit
              </DropdownMenuItem>
            )}
            {onVerify && !faculty.is_verified && (
              <DropdownMenuItem onClick={() => onVerify(faculty)}>
                <ShieldCheck className="mr-2 h-4 w-4" />Verify Faculty
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(faculty)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
