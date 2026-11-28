import { Archive, Globe, GlobeLock, Pencil, ShieldCheck, Users, XCircle } from 'lucide-react'
import { ColumnDef } from '@/components/common/DataTable'
import { StatusPill } from '@/components/common/detail'
import { LiveSession } from '@/services/liveSessions.service'
import { formatCount, formatINR } from '@/lib/format'
import { PublishStatusPill, RowMenu, RunStatus, Tag } from '@/components/forms/editor/list'
import { istDay, istTime, minutesLabel } from '@/components/forms/editor/ist'
import { ACCESS_MARKER, modeOf, type GatedSession } from '@/components/sessions/sessionAccess'

const platformLabels: Record<string, string> = { zoom: 'Zoom', agora: 'Agora', teams: 'Teams', other: 'Other' }

interface SessionsColumnsProps {
  canUpdate: boolean
  canDelete: boolean
  onEdit: (session: LiveSession) => void
  onCancel: (session: LiveSession) => void
  onArchive: (session: LiveSession) => void
  onPublishAction: (entityId: string, action: 'publish' | 'unpublish') => void
  onViewAttendees: (session: LiveSession) => void
}

/** "28 Nov" this year, "28 Nov 2025" otherwise. */
function shortDay(iso: string): string {
  const full = istDay(iso)
  const year = String(new Date().getFullYear())
  return full.endsWith(` ${year}`) ? full.slice(0, -5) : full
}

export function getSessionsColumns({ canUpdate, canDelete, onEdit, onCancel, onArchive, onPublishAction, onViewAttendees }: SessionsColumnsProps): ColumnDef<LiveSession>[] {
  return [
    {
      id: 'session',
      header: 'Session',
      cell: (session) => (
        <div className="min-w-[180px] max-w-[320px]">
          <p className="truncate text-sm font-medium" title={session.title}>{session.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {typeof session.faculty_id === 'object' && session.faculty_id ? session.faculty_id.name : 'No faculty'}
          </p>
          <AccessMarker session={session as GatedSession} />
        </div>
      ),
    },
    {
      id: 'subject',
      header: 'Subject',
      width: 'w-36',
      cell: (session) => (
        <Tag>{session.subject_id && typeof session.subject_id === 'object' ? session.subject_id.name : 'Deleted subject'}</Tag>
      ),
    },
    {
      id: 'schedule',
      header: 'Schedule',
      width: 'w-40',
      cell: (session) => session.repeat?.weekly ? (
        // A weekly series: its next class, which class it is, and the pattern
        <div className="max-w-[200px]">
          <p className="whitespace-nowrap text-sm">
            {session.next_class_start ? `${session.class_live ? 'Now' : 'Next'} ${shortDay(session.next_class_start)}` : session.status === 'cancelled' ? 'Cancelled' : 'Series over'}
          </p>
          <p className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
            {session.next_class_start ? `${istTime(session.next_class_start)} · ` : ''}Class {session.class_number ?? 0} of {session.classes_total ?? 0}
          </p>
          <p className="truncate text-xs text-muted-foreground" title={session.schedule_label ?? undefined}>{session.schedule_label}</p>
        </div>
      ) : (
        <div className="whitespace-nowrap">
          <p className="text-sm">{shortDay(session.scheduled_start_time)}</p>
          <p className="text-xs text-muted-foreground">{istTime(session.scheduled_start_time)} · {minutesLabel(session.duration_minutes)}</p>
        </div>
      ),
    },
    {
      id: 'platform',
      header: 'Platform',
      width: 'w-20',
      cell: (session) => <span className="text-sm text-muted-foreground">{platformLabels[session.platform] || session.platform}</span>,
    },
    {
      id: 'capacity',
      header: 'Capacity',
      width: 'w-24',
      cell: (session) =>
        session.capacity_mode === 'unlimited' ? (
          <span className="text-sm text-muted-foreground">Unlimited</span>
        ) : (
          <span className="text-sm tabular-nums">{formatCount(session.current_attendees ?? 0)}/{session.max_attendees ? formatCount(session.max_attendees) : '—'}</span>
        ),
    },
    {
      id: 'price',
      header: 'Price',
      width: 'w-24',
      cell: (session) =>
        session.is_free ? <StatusPill tone="success">Free</StatusPill> : <span className="whitespace-nowrap text-sm font-medium tabular-nums">{formatINR(session.price ?? 0)}</span>,
    },
    // What students see now: a weekly series shows Live only during a class
    { id: 'status', header: 'Status', width: 'w-28', cell: (session) => <RunStatus status={session.effective_status ?? session.status} /> },
    { id: 'publish_status', header: 'Publish', width: 'w-28', cell: (session) => <PublishStatusPill status={session.publish_status} /> },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (session) => (
        <RowMenu
          label={`Actions for ${session.title}`}
          actions={[
            { label: 'Edit', icon: Pencil, onSelect: () => onEdit(session), hidden: !canUpdate },
            { label: 'View Attendees', icon: Users, onSelect: () => onViewAttendees(session) },
            session.publish_status === 'published'
              ? { label: 'Unpublish', icon: GlobeLock, onSelect: () => onPublishAction(session._id, 'unpublish'), hidden: !canUpdate }
              : { label: 'Publish', icon: Globe, onSelect: () => onPublishAction(session._id, 'publish'), hidden: !canUpdate },
            { label: 'Cancel Session', icon: XCircle, onSelect: () => onCancel(session), tone: 'warning', hidden: !canUpdate || session.status !== 'scheduled' },
            { label: 'Archive', icon: Archive, onSelect: () => onArchive(session), tone: 'warning', separated: true, hidden: !canDelete },
          ]}
        />
      ),
    },
  ]
}

/** "Subscribers only" / "Free for subscribers"; nothing for Everyone. */
function AccessMarker({ session }: { session: GatedSession }) {
  const label = ACCESS_MARKER[modeOf(session)]
  if (!label) return null
  const names = (session.access_packages || []).map((p) => p.name || 'Deleted package').join(', ')
  return (
    <p className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground" title={names ? `${label}: ${names}` : label}>
      <ShieldCheck aria-hidden="true" className="h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
    </p>
  )
}
