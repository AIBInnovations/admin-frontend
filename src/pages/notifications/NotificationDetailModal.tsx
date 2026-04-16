import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Bell, Mail, MessageSquare, Smartphone, User, Calendar, ExternalLink } from 'lucide-react'
import { Notification } from '@/services/notifications.service'

const typeConfig: Record<string, { label: string; className: string; icon: typeof Bell }> = {
  push:   { label: 'Push',   className: 'bg-blue-500/10 text-blue-600 border-blue-200',   icon: Bell },
  in_app: { label: 'In-App', className: 'bg-purple-500/10 text-purple-600 border-purple-200', icon: Smartphone },
  email:  { label: 'Email',  className: 'bg-amber-500/10 text-amber-600 border-amber-200',  icon: Mail },
  sms:    { label: 'SMS',    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: MessageSquare },
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  sent:    'bg-blue-500/10 text-blue-600 border-blue-200',
  read:    'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  failed:  'bg-red-500/10 text-red-600 border-red-200',
}

const deliveryColors: Record<string, string> = {
  queued:    'bg-slate-500/10 text-slate-600 border-slate-200',
  sent:      'bg-blue-500/10 text-blue-600 border-blue-200',
  delivered: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  failed:    'bg-red-500/10 text-red-600 border-red-200',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
      <span className="text-xs font-medium text-muted-foreground pt-0.5">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  )
}

interface Props {
  open: boolean
  onClose: () => void
  notification: Notification | null
}

export function NotificationDetailModal({ open, onClose, notification }: Props) {
  if (!notification) return null

  const type = typeConfig[notification.notification_type] || typeConfig.push
  const TypeIcon = type.icon

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${type.className}`}>
              <TypeIcon className="h-3.5 w-3.5" />
            </div>
            Notification Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Title & Message */}
          <div className="space-y-2">
            <p className="text-sm font-semibold leading-snug">{notification.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {notification.message}
            </p>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-2.5">
            <DetailRow label="Type">
              <Badge className={`text-[10px] ${type.className}`}>{type.label}</Badge>
            </DetailRow>

            <DetailRow label="Status">
              <Badge className={`text-[10px] capitalize ${statusColors[notification.status] || ''}`}>
                {notification.status}
              </Badge>
            </DetailRow>

            <DetailRow label="Delivery">
              <Badge className={`text-[10px] capitalize ${deliveryColors[notification.delivery_status] || ''}`}>
                {notification.delivery_status}
              </Badge>
            </DetailRow>

            {notification.user_id && typeof notification.user_id !== 'string' && (
              <DetailRow label="User">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div>
                    <span className="font-medium">{notification.user_id.name}</span>
                    <span className="text-muted-foreground ml-1 text-xs">
                      {notification.user_id.email}
                    </span>
                  </div>
                </div>
              </DetailRow>
            )}

            <DetailRow label="Sent At">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {formatDate(notification.sent_at)}
              </span>
            </DetailRow>

            {notification.read_at && (
              <DetailRow label="Read At">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  {formatDate(notification.read_at)}
                </span>
              </DetailRow>
            )}

            <DetailRow label="Created At">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {formatDate(notification.createdAt)}
              </span>
            </DetailRow>

            {notification.click_url && (
              <DetailRow label="Link">
                <a
                  href={notification.click_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline break-all"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {notification.click_url}
                </a>
              </DetailRow>
            )}

            {notification.failed_reason && (
              <DetailRow label="Failure Reason">
                <span className="text-red-600 text-xs">{notification.failed_reason}</span>
              </DetailRow>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
