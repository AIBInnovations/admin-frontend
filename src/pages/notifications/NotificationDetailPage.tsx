import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DetailHeader, DetailSkeleton, ErrorState, FactGrid, Section, StatusPill } from '@/components/common/detail'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { Button } from '@/components/ui/button'
import { StaleNotice } from '@/components/users/kit'
import { dayTimeIST, ensureOk, errText, unwrap, useResource } from '@/components/users/lib'
import { useAuth } from '@/contexts/AuthContext'
import { notificationsService, type Notification } from '@/services/notifications.service'
import { deliveryMeta, statusMeta, typeMeta } from './notificationMeta'
import { StudentLink } from '@/components/students/StudentLink'

/** /notifications/:notificationId, one message to one user. */
export function NotificationDetailPage() {
  const { notificationId = '' } = useParams<{ notificationId: string }>()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canDelete = hasPermission('notifications.delete')
  const { data: n, loading, error, status, reload } = useResource<Notification>(async () => unwrap(await notificationsService.getById(notificationId), 'Notification not found'), [notificationId])
  const [deleting, setDeleting] = useState(false)
  const back = { label: 'Notification history', href: '/notifications?tab=history' }

  if (loading && !n) return <DetailSkeleton />
  if (!n) {
    const gone = status === 404 || status === 400
    return <ErrorState title={gone ? 'Notification not found' : status === 403 ? 'You do not have access to notifications' : 'This notification could not be loaded'} message={gone ? 'It may have been deleted, or the link is wrong.' : error ?? undefined} onRetry={gone || status === 403 ? undefined : () => reload()} back={back} />
  }

  const type = typeMeta(n.notification_type)
  const st = statusMeta(n.status)
  const dl = deliveryMeta(n.delivery_status)
  const user = n.user_id && typeof n.user_id === 'object' ? n.user_id : null
  const isHtml = n.notification_type === 'email' && /<[a-z][\s\S]*>/i.test(n.message || '')

  const remove = async () => {
    try {
      ensureOk(await notificationsService.delete(n._id), 'Failed to delete notification')
      toast.success('Notification deleted successfully')
      navigate(back.href, { replace: true })
    } catch (err) {
      toast.error(errText(err, 'Failed to delete notification'))
      throw err
    }
  }

  return (
    <div className="space-y-6">
      <DetailHeader
        back={back}
        title={n.title || 'No title'}
        subtitle={<>{type.label} notification{n.sent_at ? ` sent ${dayTimeIST(n.sent_at)}` : ', not sent yet'}</>}
        status={<><StatusPill tone={st.tone}>{st.label}</StatusPill><StatusPill tone={dl.tone}>{dl.label}</StatusPill></>}
        actions={canDelete ? <Button variant="outline" className="bg-card text-danger hover:bg-danger-soft hover:text-danger" onClick={() => setDeleting(true)}><Trash2 aria-hidden="true" />Delete</Button> : undefined}
      />
      {error && <StaleNotice message={error} onRetry={() => reload({ silent: true })} />}
      {n.failed_reason && <div role="alert" className="rounded-lg border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger"><p className="font-semibold">Failure Reason</p><p className="mt-0.5 break-words">{n.failed_reason}</p></div>}

      <Section title="Message">
        {isHtml
          ? <iframe title="Email content" sandbox="" srcDoc={n.message} className="h-[420px] w-full rounded-lg border border-border bg-white" />
          : <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{n.message || <span className="text-muted-foreground">No message text</span>}</p>}
      </Section>

      <Section title="Notification Details">
        <FactGrid facts={[
          { label: 'Type', value: type.label },
          { label: 'Status', value: st.label },
          { label: 'Delivery', value: dl.label },
          { label: 'User', value: user ? <StudentLink student={user} fallback="Unnamed User" from="Notification" className="font-normal" /> : 'No user, or deleted since' },
          { label: 'Email', value: user?.email, copy: user?.email || null },
          user?.phone ? { label: 'Phone', value: user.phone, copy: user.phone, mono: true } : null,
          { label: 'Sent At', value: n.sent_at ? dayTimeIST(n.sent_at) : 'Not sent' },
          { label: 'Read At', value: n.read_at ? dayTimeIST(n.read_at) : 'Not read' },
          { label: 'Created At', value: dayTimeIST(n.createdAt) },
          n.click_url ? { label: 'Link', wide: true, copy: n.click_url, value: /^https?:\/\//i.test(n.click_url) ? <a href={n.click_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 break-all text-primary hover:underline hover:underline-offset-4"><ExternalLink aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{n.click_url}</a> : <span className="break-all font-mono text-[13px]">{n.click_url}</span> } : null,
          { label: 'Notification ID', value: n._id, copy: n._id, mono: true },
        ]} />
      </Section>

      <DeleteModal open={deleting} onClose={() => setDeleting(false)} onConfirm={remove} title="Delete Notification" itemName={n.title} />
    </div>
  )
}
