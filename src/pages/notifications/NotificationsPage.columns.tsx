import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColumnDef } from '@/components/common/DataTable'
import { Notification } from '@/services/notifications.service'
import {
  MoreVertical, Trash2, Bell, Mail, MessageSquare, Smartphone,
} from 'lucide-react'

const typeConfig: Record<string, { label: string; className: string; icon: typeof Bell }> = {
  push: { label: 'Push', className: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: Bell },
  in_app: { label: 'In-App', className: 'bg-purple-500/10 text-purple-600 border-purple-200', icon: Smartphone },
  email: { label: 'Email', className: 'bg-amber-500/10 text-amber-600 border-amber-200', icon: Mail },
  sms: { label: 'SMS', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: MessageSquare },
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  sent: 'bg-blue-500/10 text-blue-600 border-blue-200',
  read: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  failed: 'bg-red-500/10 text-red-600 border-red-200',
}

const deliveryColors: Record<string, string> = {
  queued: 'bg-slate-500/10 text-slate-600 border-slate-200',
  sent: 'bg-blue-500/10 text-blue-600 border-blue-200',
  delivered: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  failed: 'bg-red-500/10 text-red-600 border-red-200',
}

interface NotificationsColumnsProps {
  onDelete: (notif: Notification) => void
}

export function useNotificationsColumns({
  onDelete,
}: NotificationsColumnsProps): ColumnDef<Notification>[] {
  return [
    {
      id: 'notification',
      header: 'Notification',
      width: 'min-w-[280px]',
      cell: (notif) => {
        const type = typeConfig[notif.notification_type] || typeConfig.push
        const TypeIcon = type.icon
        return (
          <div className="flex items-start gap-2">
            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${type.className}`}>
              <TypeIcon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{notif.title}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[240px]">{notif.message}</p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'user',
      header: 'User',
      width: 'w-40',
      cell: (notif) => {
        if (!notif.user_id || typeof notif.user_id === 'string') {
          return <span className="text-xs text-muted-foreground">—</span>
        }
        return (
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{notif.user_id.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{notif.user_id.email}</p>
          </div>
        )
      },
    },
    {
      id: 'type',
      header: 'Type',
      width: 'w-24',
      cell: (notif) => {
        const type = typeConfig[notif.notification_type] || typeConfig.push
        return (
          <Badge className={`text-[10px] ${type.className}`}>{type.label}</Badge>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-24',
      cell: (notif) => (
        <Badge className={`text-[10px] capitalize ${statusColors[notif.status] || ''}`}>
          {notif.status}
        </Badge>
      ),
    },
    {
      id: 'delivery',
      header: 'Delivery',
      width: 'w-28',
      cell: (notif) => (
        <Badge className={`text-[10px] capitalize ${deliveryColors[notif.delivery_status] || ''}`}>
          {notif.delivery_status}
        </Badge>
      ),
    },
    {
      id: 'sent_at',
      header: 'Sent',
      width: 'w-28',
      cell: (notif) => (
        <span className="text-xs text-muted-foreground">
          {notif.sent_at
            ? new Date(notif.sent_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })
            : '—'}
        </span>
      ),
    },
    {
      id: 'read_at',
      header: 'Read At',
      width: 'w-28',
      cell: (notif) => (
        <span className="text-xs text-muted-foreground">
          {notif.read_at
            ? new Date(notif.read_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })
            : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      width: 'w-10',
      cell: (notif) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {notif.click_url && (
              <>
                <DropdownMenuItem onClick={() => window.open(notif.click_url!, '_blank')}>
                  Open Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(notif)}>
              <Trash2 className="mr-2 h-4 w-4" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
