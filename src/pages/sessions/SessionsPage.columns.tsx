import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { LiveSession } from '@/services/liveSessions.service'
import { MoreVertical, Pencil, Trash2, XCircle } from 'lucide-react'

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-600 border-blue-200',
  live: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  completed: 'bg-gray-500/10 text-gray-600 border-gray-200',
  cancelled: 'bg-red-500/10 text-red-600 border-red-200',
}

const platformLabels: Record<string, string> = {
  zoom: 'Zoom',
  agora: 'Agora',
  teams: 'Teams',
  other: 'Other',
}

interface SessionsColumnsProps {
  onEdit: (session: LiveSession) => void
  onCancel: (session: LiveSession) => void
  onDelete: (session: LiveSession) => void
}

export function useSessionsColumns({
  onEdit,
  onCancel,
  onDelete,
}: SessionsColumnsProps): ColumnDef<LiveSession>[] {
  return [
    {
      id: 'session',
      header: 'Session',
      cell: (session) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate max-w-[240px]">{session.title}</p>
          <p className="text-xs text-muted-foreground">
            {typeof session.faculty_id === 'object' && session.faculty_id
              ? session.faculty_id.name
              : '—'}
          </p>
        </div>
      ),
    },
    {
      id: 'subject',
      header: 'Subject',
      width: 'w-28',
      cell: (session) => (
        <Badge variant="secondary" className="text-[10px]">
          {typeof session.subject_id === 'object' ? session.subject_id.name : '—'}
        </Badge>
      ),
    },
    {
      id: 'schedule',
      header: 'Schedule',
      width: 'w-36',
      cell: (session) => {
        const date = new Date(session.scheduled_start_time)
        return (
          <div>
            <p className="text-sm">
              {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              {' · '}{session.duration_minutes}min
            </p>
          </div>
        )
      },
    },
    {
      id: 'platform',
      header: 'Platform',
      width: 'w-20',
      cell: (session) => (
        <span className="text-xs text-muted-foreground">{platformLabels[session.platform] || session.platform}</span>
      ),
    },
    {
      id: 'capacity',
      header: 'Capacity',
      width: 'w-24',
      cell: (session) => (
        session.capacity_mode === 'unlimited' ? (
          <span className="text-xs text-muted-foreground">Unlimited</span>
        ) : (
          <span className="text-xs">
            {session.current_attendees}/{session.max_attendees || '—'}
          </span>
        )
      ),
    },
    {
      id: 'price',
      header: 'Price',
      width: 'w-20',
      cell: (session) => (
        session.is_free ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">FREE</Badge>
        ) : (
          <span className="text-sm font-medium">₹{session.price.toLocaleString('en-IN')}</span>
        )
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-24',
      cell: (session) => (
        <Badge className={`text-[10px] capitalize ${statusColors[session.status] || ''}`}>
          {session.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (session) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(session)}>
              <Pencil className="mr-2 h-4 w-4" />Edit
            </DropdownMenuItem>
            {session.status === 'scheduled' && (
              <DropdownMenuItem onClick={() => onCancel(session)} className="text-amber-600">
                <XCircle className="mr-2 h-4 w-4" />Cancel Session
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(session)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
