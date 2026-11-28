import { Archive, Globe, GlobeLock, Pencil, Users, XCircle } from 'lucide-react'
import { ColumnDef } from '@/components/common/DataTable'
import { StatusPill } from '@/components/common/detail'
import { Workshop } from '@/services/workshops.service'
import { formatCount, formatINR } from '@/lib/format'
import { PublishStatusPill, RowMenu, RunStatus, Tag } from '@/components/forms/editor/list'
import { istDay, toIstInputs } from '@/components/forms/editor/ist'

/**
 * "12 to 14 Mar" for a multi-day run, "12 Mar" when it's a single day (IST).
 * Year is only shown when the workshop isn't in the current year.
 */
function formatDateRange(start: string, end: string): string {
  const a = toIstInputs(start).date
  const b = toIstInputs(end).date
  if (!a) return 'Not scheduled'
  const year = String(new Date().getFullYear())
  const trim = (s: string) => (s.endsWith(` ${year}`) ? s.slice(0, -5) : s)
  if (!b || a === b) return trim(istDay(start))
  if (a.slice(0, 7) === b.slice(0, 7)) return `${Number(a.slice(8))} to ${trim(istDay(end))}`
  return `${trim(istDay(start))} to ${trim(istDay(end))}`
}

interface WorkshopsColumnsProps {
  canUpdate: boolean
  canDelete: boolean
  onEdit: (workshop: Workshop) => void
  onCancel: (workshop: Workshop) => void
  onArchive: (workshop: Workshop) => void
  onPublishAction: (workshop: Workshop, action: 'publish' | 'unpublish') => void
  onViewEnrollees: (workshop: Workshop) => void
}

export function getWorkshopsColumns({ canUpdate, canDelete, onEdit, onCancel, onArchive, onPublishAction, onViewEnrollees }: WorkshopsColumnsProps): ColumnDef<Workshop>[] {
  return [
    {
      id: 'workshop',
      header: 'Workshop',
      cell: (workshop) => {
        const faculty = Array.isArray(workshop.faculty_ids)
          ? (workshop.faculty_ids as Array<{ name?: string } | string | null>).map((f) => (f && typeof f === 'object' ? f.name : null)).filter(Boolean)
          : []
        return (
          <div className="min-w-[180px] max-w-[320px]">
            <p className="truncate text-sm font-medium" title={workshop.title}>{workshop.title}</p>
            <p className="truncate text-xs text-muted-foreground">{faculty.length > 0 ? faculty.join(', ') : 'No faculty'}</p>
          </div>
        )
      },
    },
    {
      id: 'subject',
      header: 'Subject',
      width: 'w-36',
      cell: (workshop) => <Tag>{workshop.subject_id && typeof workshop.subject_id === 'object' ? workshop.subject_id.name : 'Deleted subject'}</Tag>,
    },
    {
      id: 'schedule',
      header: 'Dates',
      width: 'w-36',
      cell: (workshop) => (
        <div className="whitespace-nowrap">
          <p className="text-sm">{formatDateRange(workshop.start_date, workshop.end_date)}</p>
          <p className="text-xs text-muted-foreground">
            {workshop.day_count} day{workshop.day_count === 1 ? '' : 's'}
            {workshop.total_duration_minutes ? ` · ${Math.round(workshop.total_duration_minutes / 60)}h total` : ''}
          </p>
        </div>
      ),
    },
    {
      id: 'seats',
      header: 'Seats',
      width: 'w-24',
      cell: (workshop) => (
        <div className="whitespace-nowrap">
          <p className="text-sm tabular-nums">
            {formatCount(workshop.enrollment_count ?? 0)}
            {workshop.capacity_mode === 'unlimited' ? '' : ` / ${workshop.max_seats ? formatCount(workshop.max_seats) : '—'}`}
          </p>
          {(workshop.waitlist_count ?? 0) > 0 && <p className="text-xs text-warning">{workshop.waitlist_count} waiting</p>}
        </div>
      ),
    },
    {
      id: 'price',
      header: 'Price',
      width: 'w-24',
      cell: (workshop) =>
        workshop.is_free || !workshop.price ? <StatusPill tone="success">Free</StatusPill> : <span className="whitespace-nowrap text-sm font-medium tabular-nums">{formatINR(workshop.price)}</span>,
    },
    { id: 'status', header: 'Status', width: 'w-28', cell: (workshop) => <RunStatus status={workshop.status} /> },
    { id: 'publish_status', header: 'Publish', width: 'w-28', cell: (workshop) => <PublishStatusPill status={workshop.publish_status} /> },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (workshop) => (
        <RowMenu
          label={`Actions for ${workshop.title}`}
          actions={[
            { label: 'Edit', icon: Pencil, onSelect: () => onEdit(workshop), hidden: !canUpdate },
            { label: 'View Enrollees', icon: Users, onSelect: () => onViewEnrollees(workshop) },
            workshop.publish_status === 'published'
              ? { label: 'Unpublish', icon: GlobeLock, onSelect: () => onPublishAction(workshop, 'unpublish'), hidden: !canUpdate }
              : { label: 'Publish', icon: Globe, onSelect: () => onPublishAction(workshop, 'publish'), hidden: !canUpdate },
            { label: 'Cancel Workshop', icon: XCircle, onSelect: () => onCancel(workshop), tone: 'warning', hidden: !canUpdate || !(workshop.status === 'scheduled' || workshop.status === 'live') },
            { label: 'Archive', icon: Archive, onSelect: () => onArchive(workshop), tone: 'warning', separated: true, hidden: !canDelete },
          ]}
        />
      ),
    },
  ]
}
