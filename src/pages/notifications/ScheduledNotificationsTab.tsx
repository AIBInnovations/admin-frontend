import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarClock, Loader2, X, Mail, MessageSquare, Megaphone, CheckCircle2, AlertCircle, Ban, Clock } from 'lucide-react'
import { toast } from 'sonner'
import {
  notificationsService,
  type ScheduledNotification,
  type ScheduledStatus,
  type ScheduledChannel,
} from '@/services/notifications.service'

const channelMeta: Record<ScheduledChannel, { label: string; icon: typeof Megaphone; color: string }> = {
  push: { label: 'Push', icon: Megaphone, color: 'text-blue-600' },
  email: { label: 'Email', icon: Mail, color: 'text-purple-600' },
  sms: { label: 'SMS', icon: MessageSquare, color: 'text-emerald-600' },
}

const statusMeta: Record<ScheduledStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending: { label: 'Pending', variant: 'default', icon: Clock },
  sent: { label: 'Sent', variant: 'secondary', icon: CheckCircle2 },
  failed: { label: 'Failed', variant: 'destructive', icon: AlertCircle },
  cancelled: { label: 'Cancelled', variant: 'outline', icon: Ban },
}

function describeTarget(item: ScheduledNotification): string {
  switch (item.target_type) {
    case 'all': return 'All active users'
    case 'subject': return 'Subject subscribers'
    case 'package': return 'Package purchasers'
    case 'series': return 'Series users'
    case 'session': return 'Session enrollees'
    case 'users': return `${item.user_ids?.length || 0} specific users`
    default: return item.target_type
  }
}

function summarize(item: ScheduledNotification): { primary: string; secondary: string } {
  if (item.channel === 'push') return { primary: item.title || '(no title)', secondary: item.message || '' }
  if (item.channel === 'email') return { primary: item.email_subject || '(no subject)', secondary: '' }
  if (item.channel === 'sms') return { primary: item.sms_message || '', secondary: '' }
  return { primary: '', secondary: '' }
}

export function ScheduledNotificationsTab() {
  const [items, setItems] = useState<ScheduledNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const fetchScheduled = useCallback(async () => {
    setLoading(true)
    try {
      const res = await notificationsService.listScheduledNotifications({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        channel: channelFilter !== 'all' ? channelFilter : undefined,
        limit: 100,
      })
      if (res.success && res.data) {
        setItems(res.data.entities || [])
      } else {
        toast.error(res.message || 'Failed to load scheduled notifications')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load scheduled notifications')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, channelFilter])

  useEffect(() => { fetchScheduled() }, [fetchScheduled])

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this scheduled notification? This cannot be undone.')) return
    setCancellingId(id)
    try {
      const res = await notificationsService.cancelScheduledNotification(id)
      if (res.success) {
        toast.success('Scheduled notification cancelled')
        fetchScheduled()
      } else {
        toast.error(res.message || 'Failed to cancel')
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to cancel')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="push">Push</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchScheduled} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <CalendarClock className="h-10 w-10 opacity-40" />
            <p className="text-sm">No scheduled notifications</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const ch = channelMeta[item.channel]
            const st = statusMeta[item.status]
            const ChIcon = ch.icon
            const StIcon = st.icon
            const summary = summarize(item)
            const when = new Date(item.scheduled_at)

            return (
              <Card key={item._id}>
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted ${ch.color}`}>
                    <ChIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{summary.primary}</p>
                      <Badge variant={st.variant} className="gap-1">
                        <StIcon className="h-3 w-3" />
                        {st.label}
                      </Badge>
                    </div>
                    {summary.secondary && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{summary.secondary}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {when.toLocaleString()}
                      </span>
                      <span>·</span>
                      <span>{describeTarget(item)}</span>
                      {item.created_by?.name && (
                        <>
                          <span>·</span>
                          <span>by {item.created_by.name}</span>
                        </>
                      )}
                    </div>
                    {item.status === 'sent' && item.result && (
                      <p className="text-xs text-emerald-600">
                        Delivered {item.result.sent}/{item.result.total}{item.result.failed > 0 ? ` · ${item.result.failed} failed` : ''}
                      </p>
                    )}
                    {item.status === 'failed' && item.failure_reason && (
                      <p className="text-xs text-red-600">{item.failure_reason}</p>
                    )}
                  </div>
                  {item.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(item._id)}
                      disabled={cancellingId === item._id}
                    >
                      {cancellingId === item._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="mr-1 h-4 w-4" />
                          Cancel
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
