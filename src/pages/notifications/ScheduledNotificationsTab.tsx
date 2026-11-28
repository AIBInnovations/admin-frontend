import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Loader2, Mail, Megaphone, MessageSquare, Pencil, RotateCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { ErrorState, StatusPill, type Tone } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDock, RowsSkeleton, StaleNotice } from '@/components/users/kit'
import { dayTimeIST, ensureOk, plural, unwrap, usePageInRange, useResource, useUrlState } from '@/components/users/lib'
import { relativeTime } from '@/lib/relativeTime'
import { useAuth } from '@/contexts/AuthContext'
import { notificationsService, type ScheduledChannel, type ScheduledNotification, type ScheduledStatus } from '@/services/notifications.service'
import type { ListResponse } from '@/types/api.types'

const CHANNEL: Record<ScheduledChannel, { label: string; icon: typeof Megaphone; tab: string }> = {
  push: { label: 'Push', icon: Megaphone, tab: 'send' },
  email: { label: 'Email', icon: Mail, tab: 'email' },
  sms: { label: 'SMS', icon: MessageSquare, tab: 'sms' },
}
const STATUS: Record<ScheduledStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pending', tone: 'info' },
  sent: { label: 'Sent', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}
const PAGE = 20

function describeTarget(item: ScheduledNotification): string {
  switch (item.target_type) {
    case 'all': return 'All active users'
    case 'subject': return 'Subject subscribers'
    case 'package': return 'Package purchasers'
    case 'series': return 'Series users'
    case 'session': return 'Session enrollees'
    case 'users': return plural(item.user_ids?.length || 0, 'specific user')
    default: return item.target_type
  }
}

function summarize(item: ScheduledNotification): { primary: string; secondary: string } {
  if (item.channel === 'push') return { primary: item.title || 'No title', secondary: item.message || '' }
  if (item.channel === 'email') return { primary: item.email_subject || 'No subject', secondary: '' }
  return { primary: item.sms_message || 'No message', secondary: '' }
}

export function ScheduledNotificationsTab() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCancel = hasPermission('notifications.delete')
  const canEdit = canCancel && hasPermission('notifications.create')
  const { state, set, page, setPage } = useUrlState({ sched_status: 'pending', sched_channel: 'all' })
  const [cancelling, setCancelling] = useState<ScheduledNotification | null>(null)

  const { data, loading, error, reload } = useResource<ListResponse<ScheduledNotification>>(async () => unwrap(await notificationsService.listScheduledNotifications({
    status: state.sched_status !== 'all' ? state.sched_status : undefined,
    channel: state.sched_channel !== 'all' ? state.sched_channel : undefined,
    page, limit: PAGE,
  }), 'Failed to load scheduled notifications'), [state.sched_status, state.sched_channel, page])
  const items = data?.entities || []
  const total = data?.pagination?.total ?? 0
  const totalPages = Math.max(1, data?.pagination?.totalPages || 1)
  usePageInRange(page, data ? totalPages : undefined, loading, setPage)
  const hasFilters = state.sched_status !== 'pending' || state.sched_channel !== 'all'

  const cancel = async () => {
    if (!cancelling) return
    ensureOk(await notificationsService.cancelScheduledNotification(cancelling._id), 'Failed to cancel')
    toast.success('Scheduled notification cancelled')
    await reload({ silent: true })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={state.sched_status} onValueChange={(v) => set({ sched_status: v })}>
          <SelectTrigger aria-label="Status" className="h-9 w-44 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={state.sched_channel} onValueChange={(v) => set({ sched_channel: v })}>
          <SelectTrigger aria-label="Channel" className="h-9 w-44 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="push">Push</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-9 bg-card" onClick={() => reload({ silent: !!data })} disabled={loading}>
          {loading ? <Loader2 aria-hidden="true" className="animate-spin" /> : <RotateCw aria-hidden="true" />}Refresh
        </Button>
      </div>

      {error && data && <StaleNotice message={error} onRetry={() => reload({ silent: true })} />}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card" aria-busy={loading}>
        {loading && !data ? <RowsSkeleton /> : !data ? <ErrorState message={error ?? undefined} onRetry={() => reload()} /> : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <CalendarClock aria-hidden="true" className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No scheduled notifications</p>
            <p className="text-sm text-muted-foreground">{hasFilters ? 'Nothing matches these filters.' : 'Tick "Schedule for later" when you write a message and it appears here.'}</p>
            {hasFilters && <Button size="sm" variant="outline" className="mt-1" onClick={() => set({ sched_status: 'pending', sched_channel: 'all' })}>Clear filters</Button>}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const ch = CHANNEL[item.channel] ?? CHANNEL.push
              const st = STATUS[item.status] ?? { label: item.status, tone: 'neutral' as Tone }
              const Icon = ch.icon
              const summary = summarize(item)
              const editHref = `/notifications?tab=${ch.tab}&edit=${item._id}`
              const open = canEdit && item.status === 'pending'
              return (
                <li key={item._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                  <Icon aria-hidden="true" className="mt-0.5 hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <p className="min-w-0 max-w-full break-words text-sm font-medium">{summary.primary}</p>
                      <StatusPill tone={st.tone}>{st.label}</StatusPill>
                    </div>
                    {summary.secondary && <p className="line-clamp-2 text-sm text-muted-foreground">{summary.secondary}</p>}
                    <p className="text-[13px] text-muted-foreground">
                      {ch.label} · {dayTimeIST(item.scheduled_at)}{item.status === 'pending' && Math.abs(new Date(item.scheduled_at).getTime() - Date.now()) < 30 * 86_400_000 ? ` (${relativeTime(item.scheduled_at)})` : ''} · {describeTarget(item)}{item.created_by?.name ? ` · by ${item.created_by.name}` : ''}
                    </p>
                    {item.status === 'sent' && item.result && <p className="text-[13px] text-success">Delivered {item.result.sent.toLocaleString('en-IN')}/{item.result.total.toLocaleString('en-IN')}{item.result.failed > 0 ? ` · ${item.result.failed.toLocaleString('en-IN')} failed` : ''}</p>}
                    {item.status === 'failed' && item.failure_reason && <p className="break-words text-[13px] text-danger">{item.failure_reason}</p>}
                  </div>
                  {item.status === 'pending' && (open || canCancel) && (
                    <div className="flex shrink-0 gap-2">
                      {open && <Button variant="outline" size="sm" className="bg-card" onClick={() => navigate(editHref)}><Pencil aria-hidden="true" />Edit</Button>}
                      {canCancel && <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setCancelling(item)}><X aria-hidden="true" />Cancel</Button>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {totalPages} · {plural(total, 'message')}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="bg-card" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button size="sm" variant="outline" className="bg-card" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <ConfirmDock
        open={!!cancelling} onClose={() => setCancelling(null)} onConfirm={cancel}
        title="Cancel this scheduled notification?" description={cancelling ? <p className="break-words">"{summarize(cancelling).primary}" will not be sent on {dayTimeIST(cancelling.scheduled_at)}. This cannot be undone.</p> : undefined}
        confirmLabel="Cancel notification" workingLabel="Cancelling…" cancelLabel="Keep it"
      />
    </div>
  )
}
