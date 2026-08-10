import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { Workshop } from '@/services/workshops.service'
import { MoreVertical, Pencil, Archive, XCircle, Globe, GlobeLock, Users } from 'lucide-react'

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-600 border-blue-200',
  live: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  completed: 'bg-gray-500/10 text-gray-600 border-gray-200',
  cancelled: 'bg-red-500/10 text-red-600 border-red-200',
}

/**
 * "12–14 Mar" for a multi-day run, "12 Mar" when it's a single day.
 * Year is only shown when the workshop isn't in the current year.
 */
function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const sameDay = s.toDateString() === e.toDateString()
  const thisYear = s.getFullYear() === new Date().getFullYear()

  const day = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const year = thisYear ? '' : ` ${s.getFullYear()}`

  if (sameDay) return `${day(s)}${year}`
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()}–${e.getDate()} ${s.toLocaleDateString('en-IN', { month: 'short' })}${year}`
  }
  return `${day(s)} – ${day(e)}${year}`
}

interface WorkshopsColumnsProps {
  onEdit: (workshop: Workshop) => void
  onCancel: (workshop: Workshop) => void
  onArchive: (workshop: Workshop) => void
  onPublishAction: (entityId: string, action: 'publish' | 'unpublish') => void
  onViewEnrollees: (workshop: Workshop) => void
}

export function useWorkshopsColumns({
  onEdit,
  onCancel,
  onArchive,
  onPublishAction,
  onViewEnrollees,
}: WorkshopsColumnsProps): ColumnDef<Workshop>[] {
  return [
    {
      id: 'workshop',
      header: 'Workshop',
      cell: (workshop) => {
        const faculty = Array.isArray(workshop.faculty_ids)
          ? (workshop.faculty_ids as Array<{ name?: string }>)
              .map((f) => (typeof f === 'object' ? f?.name : null))
              .filter(Boolean)
          : []
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium truncate max-w-[240px]">{workshop.title}</p>
            <p className="text-xs text-muted-foreground truncate max-w-[240px]">
              {faculty.length > 0 ? faculty.join(', ') : '—'}
            </p>
          </div>
        )
      },
    },
    {
      id: 'subject',
      header: 'Subject',
      width: 'w-28',
      cell: (workshop) => (
        <Badge variant="secondary" className="text-[10px]">
          {typeof workshop.subject_id === 'object' ? workshop.subject_id.name : '—'}
        </Badge>
      ),
    },
    {
      id: 'schedule',
      header: 'Dates',
      width: 'w-36',
      cell: (workshop) => (
        <div>
          <p className="text-sm">{formatDateRange(workshop.start_date, workshop.end_date)}</p>
          <p className="text-[10px] text-muted-foreground">
            {workshop.day_count} day{workshop.day_count === 1 ? '' : 's'}
            {workshop.total_duration_minutes
              ? ` · ${Math.round(workshop.total_duration_minutes / 60)}h total`
              : ''}
          </p>
        </div>
      ),
    },
    {
      id: 'seats',
      header: 'Seats',
      width: 'w-24',
      cell: (workshop) => (
        <div>
          <p className="text-xs">
            {workshop.enrollment_count ?? 0}
            {workshop.capacity_mode === 'unlimited' ? '' : ` / ${workshop.max_seats ?? '—'}`}
          </p>
          {(workshop.waitlist_count ?? 0) > 0 && (
            <p className="text-[10px] text-amber-600">{workshop.waitlist_count} waiting</p>
          )}
        </div>
      ),
    },
    {
      id: 'price',
      header: 'Price',
      width: 'w-20',
      cell: (workshop) =>
        workshop.is_free || !workshop.price ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">FREE</Badge>
        ) : (
          <span className="text-sm font-medium">₹{workshop.price.toLocaleString('en-IN')}</span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-24',
      cell: (workshop) => (
        <Badge className={`text-[10px] capitalize ${statusColors[workshop.status] || ''}`}>
          {workshop.status}
        </Badge>
      ),
    },
    {
      id: 'publish_status',
      header: 'Publish',
      width: 'w-24',
      cell: (workshop) => (
        <Badge
          className={`text-[10px] ${
            workshop.publish_status === 'published'
              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
              : 'bg-amber-500/10 text-amber-600 border-amber-200'
          }`}
        >
          {workshop.publish_status === 'published' ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (workshop) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(workshop)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewEnrollees(workshop)}>
              <Users className="mr-2 h-4 w-4" />View Enrollees
            </DropdownMenuItem>
            {workshop.publish_status === 'published' ? (
              <DropdownMenuItem onClick={() => onPublishAction(workshop._id, 'unpublish')}>
                <GlobeLock className="mr-2 h-4 w-4" />Unpublish
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onPublishAction(workshop._id, 'publish')}>
                <Globe className="mr-2 h-4 w-4" />Publish
              </DropdownMenuItem>
            )}
            {(workshop.status === 'scheduled' || workshop.status === 'live') && (
              <DropdownMenuItem onClick={() => onCancel(workshop)} className="text-amber-600">
                <XCircle className="mr-2 h-4 w-4" />Cancel Workshop
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onArchive(workshop)} className="text-amber-600">
              <Archive className="mr-2 h-4 w-4" />Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
