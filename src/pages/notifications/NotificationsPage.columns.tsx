import { Eye, MoreVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { StatusPill } from '@/components/common/detail'
import type { ColumnDef } from '@/components/common/DataTable'
import { dayIST, dayTimeIST } from '@/components/users/lib'
import type { Notification } from '@/services/notifications.service'
import { deliveryMeta, statusMeta, typeMeta } from './notificationMeta'
import { StudentLink } from '@/components/students/StudentLink'

interface NotificationsColumnsProps {
  onView: (notif: Notification) => void
  /** Missing when the admin may not delete. */
  onDelete?: (notif: Notification) => void
}

export function useNotificationsColumns({ onDelete, onView }: NotificationsColumnsProps): ColumnDef<Notification>[] {
  return [
    {
      id: 'notification',
      header: 'Notification',
      width: 'min-w-[280px]',
      cell: (notif) => {
        const Icon = typeMeta(notif.notification_type).icon
        return (
          <div className="flex items-start gap-2.5">
            <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 max-w-[320px]">
              <p className="truncate text-sm font-medium">{notif.title || 'No title'}</p>
              <p className="truncate text-xs text-muted-foreground">{notif.message}</p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'user',
      header: 'User',
      width: 'w-40',
      cell: (notif) => (!notif.user_id || typeof notif.user_id === 'string')
        ? <span className="text-xs text-muted-foreground">No user</span>
        : (
          <div className="min-w-0 max-w-[180px]">
            <p className="truncate text-sm"><StudentLink student={notif.user_id} fallback="Unnamed User" from="Notifications" /></p>
            <p className="truncate text-xs text-muted-foreground">{notif.user_id.email || notif.user_id.phone}</p>
          </div>
        ),
    },
    { id: 'type', header: 'Type', width: 'w-24', cell: (notif) => <span className="text-sm">{typeMeta(notif.notification_type).label}</span> },
    { id: 'status', header: 'Status', width: 'w-24', cell: (notif) => { const m = statusMeta(notif.status); return <StatusPill tone={m.tone}>{m.label}</StatusPill> } },
    { id: 'delivery', header: 'Delivery', width: 'w-28', cell: (notif) => { const m = deliveryMeta(notif.delivery_status); return <StatusPill tone={m.tone}>{m.label}</StatusPill> } },
    { id: 'sent_at', header: 'Sent', width: 'w-28', cell: (notif) => <span className="whitespace-nowrap text-xs text-muted-foreground" title={notif.sent_at ? dayTimeIST(notif.sent_at) : undefined}>{notif.sent_at ? dayIST(notif.sent_at) : 'Not sent'}</span> },
    { id: 'read_at', header: 'Read At', width: 'w-28', cell: (notif) => <span className="whitespace-nowrap text-xs text-muted-foreground" title={notif.read_at ? dayTimeIST(notif.read_at) : undefined}>{notif.read_at ? dayIST(notif.read_at) : 'Not read'}</span> },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (notif) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Notification actions"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(notif)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
            {notif.click_url && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.open(notif.click_url!, '_blank', 'noopener')}>Open Link</DropdownMenuItem>
              </>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-danger focus:text-danger" onClick={() => onDelete(notif)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
