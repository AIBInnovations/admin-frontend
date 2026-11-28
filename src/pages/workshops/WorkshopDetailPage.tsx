import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Archive, Award, Bell, Clock, Copy, ExternalLink, Film, Link as LinkIcon, Loader2, Pencil, RotateCcw, Users, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { DetailSkeleton, FactGrid, Section, Stat, StatusPill, apiErrorMessage } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { formatCount, formatINR } from '@/lib/format'
import { workshopsService, Workshop, WorkshopDay } from '@/services/workshops.service'
import { NotifyDialog } from '@/components/sessions/NotifyDialog'
import { ArchiveWorkshopDock, CancelDayDock, CancelWorkshopDock } from '@/components/workshops/WorkshopDocks'
import { ConfirmDock, must } from '@/components/forms/editor/ConfirmDock'
import { RecordError, useRecord } from '@/components/forms/editor/EditorPage'
import { Note } from '@/components/forms/editor/fields'
import { PublishStatusPill, RunStatus } from '@/components/forms/editor/list'
import { istDateTime, istSpan, minutesLabel, whenLabel } from '@/components/forms/editor/ist'

const words = (s: string | null | undefined) => (s || 'Not set').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

export function WorkshopDetailPage() {
  const { workshopId } = useParams<{ workshopId: string }>()
  const { record: workshop, loading, error, reload } = useRecord(workshopId, (id) => workshopsService.getById(id))

  if (loading && !workshop) return <DetailSkeleton />
  if (!workshop) return <RecordError status={error?.status ?? null} message={error?.message ?? ''} noun="workshop" back={{ label: 'Back to workshops', href: '/workshops' }} onRetry={reload} />
  return <WorkshopDetail key={workshop._id} workshop={workshop} refreshError={error?.message ?? null} reload={reload} />
}

function WorkshopDetail({ workshop, refreshError, reload }: { workshop: Workshop; refreshError: string | null; reload: () => void }) {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('live_sessions.update')
  const canDelete = hasPermission('live_sessions.delete')

  const [notifying, setNotifying] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelDay, setCancelDay] = useState<WorkshopDay | null>(null)
  const [issuing, setIssuing] = useState(false)

  const issueCertificates = async () => {
    if (issuing) return
    setIssuing(true)
    try {
      const res = must(await workshopsService.issueCertificates(workshop._id), 'Failed to issue certificates')
      const { issued = 0, skipped = 0, failed = 0 } = res.data ?? {}
      const text = `Issued ${issued} certificate${issued === 1 ? '' : 's'}. ${skipped} skipped, ${failed} failed.`
      if (failed > 0) toast.warning(text)
      else toast.success(text)
      reload()
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Failed to issue certificates'))
    } finally {
      setIssuing(false)
    }
  }

  const copyLink = (value: string) => {
    navigator.clipboard.writeText(value).then(() => toast.success('Join link copied'), () => toast.error('Could not copy to clipboard'))
  }

  const subjectName = workshop.subject_id && typeof workshop.subject_id === 'object' ? workshop.subject_id.name : 'Deleted subject'
  const days = workshop.days || []
  const activeDays = days.filter((d) => d.status !== 'cancelled')
  const canCancel = workshop.status === 'scheduled' || workshop.status === 'live'
  const registered = workshop.enrollment_count ?? 0
  const full = workshop.capacity_mode === 'limited' && !!workshop.max_seats && registered >= workshop.max_seats

  return (
    <div className="space-y-6">
      <PageHeader
        title={workshop.title}
        description={`${workshop.day_count}-day workshop · ${subjectName}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Workshops', href: '/workshops' },
          { label: workshop.title },
        ]}
        action={
          <div className="flex flex-wrap gap-2 sm:max-w-[420px] sm:justify-end lg:max-w-[560px]">
            {canUpdate && <Button variant="outline" size="sm" className="bg-card" onClick={() => setNotifying(true)}><Bell aria-hidden="true" />Notify</Button>}
            <Button asChild variant="outline" size="sm" className="bg-card"><Link to={`/workshops/${workshop._id}/enrollees`}><Users aria-hidden="true" />Enrollees</Link></Button>
            {canUpdate && <Button asChild variant="outline" size="sm" className="bg-card"><Link to={`/workshops/${workshop._id}/edit`}><Pencil aria-hidden="true" />Edit</Link></Button>}
            {canUpdate && canCancel && <Button variant="outline" size="sm" className="bg-card" onClick={() => setCancelling(true)}><XCircle aria-hidden="true" />Cancel</Button>}
            {canDelete && (workshop.archivedAt
              ? <Button variant="outline" size="sm" className="bg-card" onClick={() => setRestoring(true)}><RotateCcw aria-hidden="true" />Restore</Button>
              : <Button variant="outline" size="sm" className="bg-card" onClick={() => setArchiving(true)}><Archive aria-hidden="true" />Archive</Button>)}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <RunStatus status={workshop.status} />
        <PublishStatusPill status={workshop.publish_status} />
        {workshop.is_free || !workshop.price ? <StatusPill tone="success">Free</StatusPill> : <StatusPill>{formatINR(workshop.price)}</StatusPill>}
        {workshop.certificate_enabled && <StatusPill className="gap-1"><Award aria-hidden="true" className="h-3.5 w-3.5" />Certificates on</StatusPill>}
        {workshop.archivedAt && <StatusPill tone="danger">Archived</StatusPill>}
        {workshop.status !== 'cancelled' && <span className="text-[13px] text-muted-foreground">{whenLabel(workshop.start_date, workshop.end_date)}</span>}
      </div>

      {refreshError && <Note tone="danger">{refreshError} <button type="button" className="font-medium underline underline-offset-2" onClick={reload}>Try again</button></Note>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Days" value={formatCount(workshop.day_count)} hint={activeDays.length !== days.length ? `${days.length - activeDays.length} cancelled` : undefined} />
        <Stat
          label="Registered"
          value={formatCount(registered)}
          hint={[
            workshop.capacity_mode === 'limited' && workshop.max_seats ? `of ${formatCount(workshop.max_seats)}${full ? ', full' : ''}` : '',
            (workshop.waitlist_count ?? 0) > 0 ? `${workshop.waitlist_count} waiting` : '',
          ].filter(Boolean).join(', ') || undefined}
        />
        <Stat label="Paid purchases" value={formatCount(workshop.purchase_count ?? 0)} />
        <Stat label="Certificates issued" value={formatCount(workshop.certificate_count ?? 0)} />
      </div>

      <Section
        title="Day-by-day agenda"
        description={workshop.start_date ? `${istDateTime(workshop.start_date)} to ${istDateTime(workshop.end_date)} IST` : undefined}
      >
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">No days configured.</p>
        ) : (
          <ol className="space-y-3">
            {days.map((day) => {
              const cancelled = day.status === 'cancelled'
              return (
                <li key={day.session_id} className={cancelled ? 'rounded-md border border-border bg-muted/50 p-4' : 'rounded-md border border-border p-4'}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 basis-72">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-semibold text-primary">Day {day.day_number}</span>
                        <RunStatus status={day.status} />
                      </div>
                      <p className={cancelled ? 'text-sm font-medium text-muted-foreground line-through' : 'text-sm font-medium'}>{day.title}</p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        <Clock aria-hidden="true" className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
                        {istSpan(day.scheduled_start_time, day.scheduled_end_time)} IST · {minutesLabel(day.duration_minutes)}
                        {day.faculty_name ? ` · ${day.faculty_name}` : ' · No faculty'}
                      </p>
                      <p className="mt-1 text-[13px] tabular-nums text-muted-foreground">
                        <Users aria-hidden="true" className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />{formatCount(day.attendee_count)} attended
                        <span aria-hidden="true"> · </span>
                        <Film aria-hidden="true" className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />{day.recording_count} recording{day.recording_count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {day.zoom_join_url && !cancelled && (
                        <>
                          <Button variant="outline" size="sm" className="bg-card" onClick={() => copyLink(day.zoom_join_url!)}><Copy aria-hidden="true" />Join link</Button>
                          {day.zoom_host_url && (
                            <Button variant="outline" size="sm" className="bg-card" asChild>
                              <a href={day.zoom_host_url} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" />Start as host</a>
                            </Button>
                          )}
                        </>
                      )}
                      {canUpdate && !cancelled && day.status !== 'completed' && (
                        <Button variant="ghost" size="sm" className="text-warning hover:text-warning" onClick={() => setCancelDay(day)}><XCircle aria-hidden="true" />Cancel day</Button>
                      )}
                    </div>
                  </div>
                  {day.zoom_meeting_id && !cancelled && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><LinkIcon aria-hidden="true" className="h-3 w-3" />Zoom meeting <span className="font-mono">{day.zoom_meeting_id}</span></p>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Settings">
          <FactGrid
            className="xl:grid-cols-2"
            facts={[
              { label: 'Registration mode', value: words(workshop.enrollment_mode) },
              { label: 'Registration closes', value: istDateTime(workshop.registration_closes_at || workshop.start_date) },
              { label: 'Capacity', value: workshop.capacity_mode === 'unlimited' ? 'Unlimited' : `${workshop.max_seats ? formatCount(workshop.max_seats) : '—'} seats` },
              { label: 'Waitlist', value: workshop.allow_waitlist ? 'Enabled' : 'Disabled' },
              { label: 'Platform', value: words(workshop.platform) },
              { label: 'Visibility', value: words(workshop.visible_to) },
            ]}
          />
        </Section>

        <Section title="Certificates">
          {!workshop.certificate_enabled ? (
            <p className="text-sm text-muted-foreground">Certificates are turned off for this workshop. Enable them in Edit to issue completion certificates.</p>
          ) : (
            <div className="space-y-5">
              <FactGrid
                className="xl:grid-cols-2"
                facts={[
                  {
                    label: 'Attendance required',
                    value: workshop.certificate_min_days_attended
                      ? `${workshop.certificate_min_days_attended} of ${activeDays.length} day${activeDays.length === 1 ? '' : 's'}`
                      : `All ${activeDays.length} day${activeDays.length === 1 ? '' : 's'}`,
                  },
                  { label: 'Issued so far', value: formatCount(workshop.certificate_count ?? 0) },
                ]}
              />
              {workshop.status === 'completed' ? (
                canUpdate && (
                  <Button onClick={issueCertificates} disabled={issuing}>
                    {issuing ? <><Loader2 aria-hidden="true" className="animate-spin" />Issuing...</> : <><Award aria-hidden="true" />Issue certificates to eligible students</>}
                  </Button>
                )
              ) : (
                <Note>Certificates become issuable once the workshop has ended. Students can also claim their own from the store.</Note>
              )}
            </div>
          )}
        </Section>
      </div>

      <Section title="About">
        <p className="max-w-[80ch] whitespace-pre-wrap text-sm text-muted-foreground">{workshop.description || 'No description.'}</p>
      </Section>

      <Section title="Recordings">
        <p className="text-sm text-muted-foreground">
          Upload a recording from <Link to="/content/recordings" className="font-medium text-primary underline underline-offset-2">Content, Recordings</Link> and attach it to the relevant day. Registered students can then replay days they missed.
        </p>
      </Section>

      <NotifyDialog
        open={notifying}
        onClose={() => setNotifying(false)}
        title="Send Workshop Notification"
        description="Send a push notification to the target audience for this workshop."
        loadPreview={() => workshopsService.getNotificationPreview(workshop._id)}
        send={(data) => workshopsService.sendNotification(workshop._id, data)}
      />
      <ArchiveWorkshopDock workshop={archiving ? workshop : null} onClose={() => setArchiving(false)} onDone={() => navigate('/workshops')} />
      <CancelWorkshopDock workshop={cancelling ? workshop : null} onClose={() => setCancelling(false)} onDone={reload} />
      <CancelDayDock workshopId={workshop._id} day={cancelDay} onClose={() => setCancelDay(null)} onDone={reload} />
      <ConfirmDock
        open={restoring}
        onClose={() => setRestoring(false)}
        title="Restore Workshop"
        confirmLabel="Restore"
        busyLabel="Restoring..."
        onConfirm={async () => {
          must(await workshopsService.restore(workshop._id), 'Failed to restore workshop')
          toast.success('Workshop restored')
          reload()
        }}
      >
        <p>Restore <span className="font-medium text-foreground">{workshop.title}</span> and its days? It comes back to the workshops list as {workshop.publish_status === 'published' ? 'published, so students can see it' : 'a draft'}.</p>
      </ConfirmDock>
    </div>
  )
}
