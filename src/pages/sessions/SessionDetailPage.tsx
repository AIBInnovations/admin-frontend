import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Archive, Bell, CheckCircle, ExternalLink, Eye, Film, Image, Link as LinkIcon, Loader2, Package, Pencil, RotateCw, ShieldCheck, UserCheck, Users, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { CopyButton, DetailSkeleton, FactGrid, Section, StatusPill, apiErrorMessage } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/contexts/AuthContext'
import { formatCount, formatINR } from '@/lib/format'
import { liveSessionsService, LiveSession } from '@/services/liveSessions.service'
import { recordingsService, Recording } from '@/services/recordings.service'
import { CohostLinksPanel } from '@/components/sessions/CohostLinksPanel'
import { ConvertToPackageDialog } from '@/components/sessions/ConvertToPackageDialog'
import { NotifyDialog } from '@/components/sessions/NotifyDialog'
import { ArchiveSessionDock, CancelSessionDock } from '@/components/sessions/SessionDocks'
import { RecordError, useRecord } from '@/components/forms/editor/EditorPage'
import { Note } from '@/components/forms/editor/fields'
import { PublishStatusPill, RunStatus, Tag, fileSize, videoLength } from '@/components/forms/editor/list'
import { RecordingStatus } from '@/components/recordings/RecordingStatus'
import { istDateTime, istDay, istSpan, minutesLabel, whenLabel } from '@/components/forms/editor/ist'
import { ACCESS_MARKER, accessSentence, modeOf, type GatedSession } from '@/components/sessions/sessionAccess'
import { listClasses, previewText } from '@/components/sessions/weeklySchedule'

const words = (s: string | null | undefined) => (s || 'Not set').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
const refName = (ref: LiveSession['subject_id'] | LiveSession['faculty_id'], missing: string) =>
  ref && typeof ref === 'object' ? ref.name : ref ? missing : null

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { record: session, loading, error, reload } = useRecord(sessionId, (id) => liveSessionsService.getById(id))

  if (loading && !session) return <DetailSkeleton />
  if (!session) return <RecordError status={error?.status ?? null} message={error?.message ?? ''} noun="session" back={{ label: 'Back to live sessions', href: '/sessions' }} onRetry={reload} />
  return <SessionDetail key={session._id} session={session} refreshError={error?.message ?? null} reload={reload} />
}

function SessionDetail({ session, refreshError, reload }: { session: LiveSession; refreshError: string | null; reload: () => void }) {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('live_sessions.update')
  const canDelete = hasPermission('live_sessions.delete')

  const [archiving, setArchiving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [converting, setConverting] = useState(false)

  // Recordings
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [recState, setRecState] = useState<{ loading: boolean; error: string | null }>({ loading: true, error: null })
  const recCall = useRef(0)
  const loadRecordings = useCallback(async () => {
    const call = ++recCall.current
    setRecState({ loading: true, error: null })
    try {
      const res = await recordingsService.getAll({ session_id: session._id, limit: 100 })
      if (call !== recCall.current) return
      if (!res.success || !res.data) throw new Error(res.message || 'Failed to load recordings')
      setRecordings(res.data.entities || [])
      setRecState({ loading: false, error: null })
    } catch (e) {
      if (call === recCall.current) setRecState({ loading: false, error: apiErrorMessage(e, 'Failed to load recordings') })
    }
  }, [session._id])
  useEffect(() => { loadRecordings(); return () => { recCall.current += 1 } }, [loadRecordings])

  // Banner
  const [hasBanner, setHasBanner] = useState(false)
  const [bannerBusy, setBannerBusy] = useState(false)
  useEffect(() => {
    let alive = true
    liveSessionsService.getBannerStatus(session._id)
      .then((res) => { if (alive && res.success && res.data) setHasBanner(res.data.has_active_banner) })
      .catch(() => { /* the button falls back to "Create Banner"; the API refuses a second one */ })
    return () => { alive = false }
  }, [session._id])

  const toggleBanner = async () => {
    if (bannerBusy) return
    setBannerBusy(true)
    try {
      const res = hasBanner ? await liveSessionsService.hideBanner(session._id) : await liveSessionsService.createBanner(session._id)
      if (!res.success) throw new Error(res.message || 'Failed to update banner')
      toast.success(hasBanner ? 'Banner hidden successfully' : 'Banner created successfully')
      setHasBanner(!hasBanner)
    } catch (e) {
      toast.error(apiErrorMessage(e, hasBanner ? 'Failed to hide banner' : 'Failed to create banner'))
    } finally {
      setBannerBusy(false)
    }
  }

  const archivedAt = (session as LiveSession & { archivedAt?: string | null }).archivedAt
  const full = session.capacity_mode === 'limited' && !!session.max_attendees && (session.enrollment_count || 0) >= session.max_attendees
  const weekly = !!session.repeat?.weekly
  // What students see now: a weekly series is live only during a class
  const shownStatus = session.effective_status ?? session.status
  const overdue = !weekly && session.status === 'scheduled' && new Date(session.scheduled_end_time).getTime() < Date.now()
  const seriesDone = weekly && session.class_state === 'over' && session.status === 'scheduled'

  return (
    <div className="space-y-6">
      <PageHeader
        title={session.title}
        description="View and manage live session details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Sessions', href: '/sessions' },
          { label: session.title },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2 sm:max-w-[420px] sm:justify-end lg:max-w-[560px] xl:max-w-[760px]">
            <Button asChild variant="outline" size="sm" className="bg-card"><Link to={`/sessions/${session._id}/attendees`}><Users aria-hidden="true" />View Attendees</Link></Button>
            {canUpdate && <Button variant="outline" size="sm" className="bg-card" onClick={() => setNotifying(true)}><Bell aria-hidden="true" />Send Notification</Button>}
            {canUpdate && (
              <Button variant="outline" size="sm" className="bg-card" onClick={toggleBanner} disabled={bannerBusy}>
                {bannerBusy ? <Loader2 aria-hidden="true" className="animate-spin" /> : hasBanner ? <Eye aria-hidden="true" /> : <Image aria-hidden="true" />}
                {hasBanner ? 'Hide Banner' : 'Create Banner'}
              </Button>
            )}
            {canUpdate && recordings.length > 0 && (
              <Button size="sm" onClick={() => setConverting(true)}><Package aria-hidden="true" />Convert to Package</Button>
            )}
            {canUpdate && session.status === 'scheduled' && (
              <Button variant="outline" size="sm" className="bg-card" onClick={() => setCancelling(true)}><XCircle aria-hidden="true" />Cancel Session</Button>
            )}
            {canUpdate && <Button asChild variant="outline" size="sm" className="bg-card"><Link to={`/sessions/${session._id}/edit`}><Pencil aria-hidden="true" />Edit</Link></Button>}
            {canDelete && !archivedAt && (
              <Button variant="outline" size="sm" className="bg-card" onClick={() => setArchiving(true)}><Archive aria-hidden="true" />Archive</Button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <RunStatus status={shownStatus} />
        <PublishStatusPill status={session.publish_status} />
        {weekly && <StatusPill tone="info">Weekly</StatusPill>}
        {archivedAt && <StatusPill tone="danger">Archived</StatusPill>}
        {session.status !== 'cancelled' && (
          weekly ? (
            session.next_class_start && (
              <span className="text-[13px] text-muted-foreground">
                Class {session.class_number} of {session.classes_total}, {session.class_state === 'buffer' && session.join_closes_at
                  ? `in its overtime, joining open until ${istDateTime(session.join_closes_at).split(', ').pop()}`
                  : whenLabel(session.next_class_start, session.next_class_end)}
              </span>
            )
          ) : (
            <span className="text-[13px] text-muted-foreground">{whenLabel(session.scheduled_start_time, session.scheduled_end_time)}</span>
          )
        )}
      </div>

      {refreshError && <Note tone="danger">{refreshError} <button type="button" className="font-medium underline underline-offset-2" onClick={reload}>Try again</button></Note>}
      {overdue && <Note tone="warning">This session is still marked scheduled, but its end time has passed ({istDateTime(session.scheduled_end_time)} IST).</Note>}
      {seriesDone && <Note>The last class of this series has ended. Students see it as completed.</Note>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Basic Information">
          <FactGrid
            className="xl:grid-cols-2"
            facts={[
              { label: 'Title', value: session.title, wide: true },
              { label: 'Description', value: session.description ? <span className="whitespace-pre-wrap font-normal">{session.description}</span> : null, wide: true },
              { label: 'Subject', value: refName(session.subject_id, 'Deleted subject') ?? 'Deleted subject' },
              { label: 'Faculty', value: refName(session.faculty_id, 'Deleted faculty') },
              session.series_id ? { label: 'Series', value: typeof session.series_id === 'object' ? session.series_id.name : 'Deleted series' } : null,
            ]}
          />
        </Section>
        {weekly ? (
          <WeeklySchedule session={session} />
        ) : (
          <Section title="Schedule" description={`${istSpan(session.scheduled_start_time, session.scheduled_end_time)} IST`}>
            <FactGrid
              className="xl:grid-cols-2"
              facts={[
                { label: 'Start Time', value: istDateTime(session.scheduled_start_time) },
                { label: 'End Time', value: istDateTime(session.scheduled_end_time) },
                { label: 'Duration', value: minutesLabel(session.duration_minutes) },
              ]}
            />
          </Section>
        )}
      </div>

      <Section title="Meeting Details">
        <div className="space-y-5">
          <FactGrid
            facts={[
              { label: 'Platform', value: words(session.platform) },
              session.zoom_meeting_id ? { label: 'Zoom Meeting ID', value: session.zoom_meeting_id, mono: true, copy: session.zoom_meeting_id } : null,
            ]}
          />
          {session.zoom_join_url && (
            <MeetingLink label="Zoom Join URL (Participants)" url={session.zoom_join_url} action={<><Users aria-hidden="true" />Join as Participant</>} />
          )}
          {session.zoom_host_url && (
            <MeetingLink label="Zoom Host URL (Start Meeting)" url={session.zoom_host_url} primary={session.status === 'scheduled' || session.status === 'live'} action={<><UserCheck aria-hidden="true" />Start as Host</>} />
          )}
          {session.meeting_link && !session.zoom_join_url && (
            <MeetingLink label="Meeting Link" url={session.meeting_link} action="Join Meeting" />
          )}
          {!session.zoom_join_url && !session.zoom_host_url && !session.meeting_link && (
            <p className="text-sm text-muted-foreground">No meeting link is attached to this session.</p>
          )}
          {session.thumbnail_url && (
            <div>
              <p className="text-[13px] text-muted-foreground">Thumbnail</p>
              <img src={session.thumbnail_url} alt={`Thumbnail of ${session.title}`} className="mt-1.5 h-32 w-auto max-w-full rounded-md border border-border object-cover" loading="lazy" />
            </div>
          )}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Capacity & Enrollment">
          <FactGrid
            className="xl:grid-cols-2"
            facts={[
              { label: 'Enrollment Mode', value: <Tag>{words(session.enrollment_mode)}</Tag> },
              { label: 'Capacity Mode', value: <Tag>{words(session.capacity_mode)}</Tag> },
              { label: 'Enrolled Users', value: <span className="tabular-nums">{formatCount(session.enrollment_count || 0)}{full && <StatusPill tone="warning" className="ml-2">Full</StatusPill>}</span> },
              { label: 'Current Attendees (users who joined the live meeting)', value: <span className="tabular-nums">{formatCount(session.current_attendees || 0)}</span> },
              session.max_attendees ? { label: 'Max Attendees', value: <span className="tabular-nums">{formatCount(session.max_attendees)}</span> } : null,
            ]}
          />
        </Section>
        <Section title="Pricing">
          <FactGrid
            className="xl:grid-cols-2"
            facts={[
              { label: 'Access', value: <StatusPill tone={session.is_free ? 'success' : 'info'}>{session.is_free ? 'Free' : 'Paid'}</StatusPill> },
              !session.is_free && { label: 'Price', value: <span className="text-base font-semibold tabular-nums">{formatINR(session.price ?? 0)}</span> },
              !session.is_free && session.compare_at_price && session.compare_at_price > session.price
                ? { label: 'Compare at Price', value: <span className="tabular-nums text-muted-foreground line-through">{formatINR(session.compare_at_price)}</span> }
                : null,
            ]}
          />
        </Section>
      </div>

      <WhoCanJoin session={session as GatedSession} canUpdate={canUpdate} />

      <Section title="Session Settings">
        <ul className="space-y-2 text-sm">
          <SettingRow on={session.auto_admit_users} label="Auto-admit Users" />
          <SettingRow on={session.allow_join_before_host} label="Allow Join Before Host" />
        </ul>
      </Section>

      <Section title="Metadata">
        <FactGrid facts={[{ label: 'Created At', value: istDateTime(session.createdAt) }, { label: 'Last Updated', value: istDateTime(session.updatedAt) }]} />
      </Section>

      <Section
        title={<>Session Recordings <span className="ml-1 font-normal tabular-nums text-muted-foreground">{recState.loading ? '' : recordings.length}</span></>}
        action={<Button asChild variant="outline" size="sm" className="bg-card"><Link to={`/content/recordings?session=${session._id}`}><ExternalLink aria-hidden="true" />Manage Recordings</Link></Button>}
        flush
      >
        {recState.loading ? (
          <div className="space-y-2 px-5 pb-5"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
        ) : recState.error ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 px-5 pb-5 text-sm text-danger">
            {recState.error}
            <Button variant="outline" size="sm" onClick={loadRecordings}><RotateCw />Try again</Button>
          </div>
        ) : recordings.length === 0 ? (
          <div className="px-5 pb-8 pt-4 text-center text-sm text-muted-foreground">
            <Film aria-hidden="true" className="mx-auto mb-2 h-7 w-7 opacity-50" />
            <p>No recordings assigned to this session yet</p>
            <Button asChild variant="link" size="sm" className="mt-1"><Link to="/content/recordings">Go to Recordings page to upload and assign</Link></Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Title</TableHead>
                <TableHead className="w-24">Duration</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-24">Size</TableHead>
                <TableHead className="w-32 pr-5">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recordings.map((r) => (
                <TableRow
                  key={r._id}
                  tabIndex={0}
                  className="cursor-pointer hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[hsl(var(--ring))]"
                  onClick={() => navigate(`/content/recordings/${r._id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/content/recordings/${r._id}`) }}
                >
                  <TableCell className="pl-5">
                    <div className="max-w-md">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      {r.description && <p className="truncate text-xs text-muted-foreground">{r.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{videoLength(r.duration_seconds)}</TableCell>
                  <TableCell><RecordingStatus status={r.processing_status} /></TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground tabular-nums">{fileSize(r.file_size_mb)}</TableCell>
                  <TableCell className="whitespace-nowrap pr-5 text-sm text-muted-foreground">{istDay(r.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {session.platform === 'zoom' && (
        <CohostLinksPanel sessionId={session._id} sessionStatus={session.status} hasZoomMeeting={!!session.zoom_meeting_id} canUpdate={canUpdate} />
      )}

      <ArchiveSessionDock session={archiving ? session : null} onClose={() => setArchiving(false)} onDone={() => navigate('/sessions')} />
      <CancelSessionDock session={cancelling ? session : null} onClose={() => setCancelling(false)} onDone={() => { toast.success('Session cancelled successfully'); reload() }} />
      <ConvertToPackageDialog open={converting} onClose={() => setConverting(false)} session={session} recordingCount={recordings.length} />
      <NotifyDialog
        open={notifying}
        onClose={() => setNotifying(false)}
        title="Send Session Notification"
        description="Send a push notification to the target audience for this session."
        loadPreview={() => liveSessionsService.getNotificationPreview(session._id)}
        send={(data) => liveSessionsService.sendNotification(session._id, data)}
      />
    </div>
  )
}

/** A weekly series: the schedule in words, the class now or next, and the series span. */
function WeeklySchedule({ session }: { session: LiveSession }) {
  const repeat = session.repeat!
  const classes = listClasses(repeat)
  const state = session.class_state
  const live = !!session.class_live
  const inBuffer = state === 'buffer'
  const nextLabel = session.next_class_start
    ? `${istSpan(session.next_class_start, session.next_class_end)} IST`
    : session.status === 'cancelled' ? 'Cancelled' : 'Series over'
  return (
    <Section
      title="Schedule"
      description={`${session.schedule_label ?? 'Weekly'} IST`}
      action={live ? <StatusPill tone="success">Live now</StatusPill> : undefined}
    >
      <div className="space-y-4">
        <FactGrid
          className="xl:grid-cols-2"
          facts={[
            { label: 'Repeats', value: session.schedule_label ?? 'Weekly', wide: true },
            {
              label: state === 'running' || inBuffer ? 'This class' : 'Next class',
              value: nextLabel,
              wide: true,
            },
            session.class_number ? { label: 'Class', value: <span className="tabular-nums">Class {session.class_number} of {session.classes_total}</span> } : null,
            { label: 'Classes', value: previewText(repeat) ?? `${classes.length} classes` },
            { label: 'Start Time (first class)', value: istDateTime(session.scheduled_start_time) },
            { label: 'End Time (last class)', value: istDateTime(session.scheduled_end_time) },
            { label: 'Duration (each class)', value: minutesLabel(session.duration_minutes) },
            { label: 'Overtime', value: repeat.overtime_minutes ? `${minutesLabel(repeat.overtime_minutes)}. ${session.overtime_label ?? ''}` : 'None' },
          ]}
        />
        {inBuffer && !live && session.join_closes_at && (
          <Note>The class time is over. It may be running over time, so students can still join until {istDateTime(session.join_closes_at)} IST. It shows as live only while Zoom reports the meeting running.</Note>
        )}
        {inBuffer && live && <Note>Running over time: Zoom reports the meeting is still on. Students can join until {istDateTime(session.join_closes_at)} IST.</Note>}
        <p className="text-[13px] text-muted-foreground">Students join from 10 minutes before each class{repeat.overtime_minutes ? ' until its end plus the overtime' : ' until it ends'}. One registration and one Zoom meeting cover every class.</p>
      </div>
    </Section>
  )
}

function MeetingLink({ label, url, action, primary }: { label: string; url: string; action: React.ReactNode; primary?: boolean }) {
  return (
    <div>
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 basis-60 items-center gap-1.5 text-sm text-primary hover:underline">
          <LinkIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{url}</span>
        </a>
        <CopyButton value={url} label={label} />
        <Button size="sm" variant={primary ? 'default' : 'outline'} className={primary ? undefined : 'bg-card'} asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">{action}</a>
        </Button>
      </div>
    </div>
  )
}

/** The access rule in words, its packages, and registrations it would refuse. */
function WhoCanJoin({ session, canUpdate }: { session: GatedSession; canUpdate: boolean }) {
  const mode = modeOf(session)
  const packages = session.access_packages || []
  const sentence = session.access_rule_text
    || accessSentence(mode, packages.map((p) => p.name || 'Deleted package'), session.price, session.is_free)
  const summary = session.access_summary
  const marker = ACCESS_MARKER[mode]
  return (
    <Section
      title="Who can join"
      action={canUpdate && !session.workshop_id ? (
        <Button asChild variant="outline" size="sm" className="bg-card"><Link to={`/sessions/${session._id}/edit#who-can-join`}><Pencil aria-hidden="true" />Change</Link></Button>
      ) : undefined}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-2.5">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-sm font-medium">{sentence}</p>
          {marker && <StatusPill tone="info">{marker}</StatusPill>}
        </div>
        {mode !== 'everyone' && (
          packages.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Packages whose subscribers can join">
              {packages.map((p) => (
                <li key={p._id} className={p.deleted ? 'max-w-full rounded-full border border-warning bg-warning-soft px-2.5 py-0.5 text-[13px] text-warning' : 'max-w-full rounded-full border border-border bg-muted px-2.5 py-0.5 text-[13px]'}>
                  <span className="block truncate">
                    {p.name ?? 'Deleted package'}
                    {(p.package_type || p.subject) && <span className="text-muted-foreground"> · {[p.package_type, p.subject].filter(Boolean).join(' · ')}</span>}
                    {!p.deleted && p.is_active === false && <span className="text-muted-foreground"> · inactive</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Note tone="warning">No package is chosen, so nobody can be included. Edit the session and choose the packages.</Note>
          )
        )}
        {mode !== 'everyone' && packages.some((p) => p.deleted) && (
          <Note tone="warning">A chosen package was deleted. Its subscribers are no longer included. Edit the session to remove it.</Note>
        )}
        {mode !== 'everyone' && <p className="text-[13px] text-muted-foreground">A combo that contains a chosen package counts too. Students who already paid for this session keep their seat.</p>}
        {summary && summary.not_eligible > 0 && (
          <Note tone="warning">
            {summary.not_eligible === 1
              ? '1 registered student is not a subscriber and has not paid for this session.'
              : `${formatCount(summary.not_eligible)} registered students are not subscribers and have not paid for this session.`}
            {' '}They registered before this rule and are refused when they try to join.
          </Note>
        )}
      </div>
    </Section>
  )
}

function SettingRow({ on, label }: { on: boolean; label: string }) {
  const Icon = on ? CheckCircle : XCircle
  return (
    <li className="flex items-center gap-2">
      <Icon aria-hidden="true" className={on ? 'h-4 w-4 text-success' : 'h-4 w-4 text-muted-foreground'} />
      <span>{label}</span>
      <span className="text-muted-foreground">{on ? 'On' : 'Off'}</span>
    </li>
  )
}
