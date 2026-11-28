import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, RotateCw, ShieldOff, Users } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { DetailSkeleton, ErrorState, Section, Stat, StatusPill, apiErrorMessage, type Tone } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/contexts/AuthContext'
import { formatCount, formatINR } from '@/lib/format'
import { liveSessionsService, Enrollee } from '@/services/liveSessions.service'
import { ConfirmDock, must } from '@/components/forms/editor/ConfirmDock'
import { Note } from '@/components/forms/editor/fields'
import { RecordError, useRecord } from '@/components/forms/editor/EditorPage'
import { RowMenu, Tag } from '@/components/forms/editor/list'
import { istDay } from '@/components/forms/editor/ist'
import { StudentLink, useStudentPage } from '@/components/students/StudentLink'
import { enrollmentTypeLabel, type GatedEnrollee } from '@/components/sessions/sessionAccess'

const STATUS_TONE: Record<string, Tone> = { confirmed: 'success', waitlisted: 'warning', cancelled: 'danger' }
const words = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
const STATUSES = ['confirmed', 'waitlisted', 'cancelled'] as const

export function SessionAttendeesPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { hasPermission } = useAuth()
  // The API takes either name for this permission
  const canRevoke = hasPermission('sessions.update') || hasPermission('live_sessions.update')
  const student = useStudentPage('Attendees')
  const [params, setParams] = useSearchParams()
  const status = STATUSES.find((s) => s === params.get('status')) ?? 'all'

  const { record: session, loading: loadingSession, error: sessionError, reload } = useRecord(sessionId, (id) => liveSessionsService.getById(id))

  // Every registration is loaded once and filtered here, so the counts stay
  // right while a filter is on.
  const [enrollees, setEnrollees] = useState<Enrollee[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const call = useRef(0)
  const load = useCallback(async () => {
    if (!sessionId) return
    const n = ++call.current
    setLoading(true); setError(null)
    try {
      const res = await liveSessionsService.getEnrollees(sessionId)
      if (n !== call.current) return
      if (!res.success || !res.data) throw new Error(res.message || 'Failed to load attendees')
      setEnrollees(res.data.enrollees || [])
    } catch (e) {
      if (n === call.current) setError(apiErrorMessage(e, 'Failed to load attendees'))
    } finally {
      if (n === call.current) setLoading(false)
    }
  }, [sessionId])
  useEffect(() => { load(); return () => { call.current += 1 } }, [load])

  const [target, setTarget] = useState<Enrollee | null>(null)

  if (loadingSession && !session) return <DetailSkeleton />
  if (!session) return <RecordError status={sessionError?.status ?? null} message={sessionError?.message ?? ''} noun="session" back={{ label: 'Back to live sessions', href: '/sessions' }} onRetry={reload} />

  const rows = enrollees ?? []
  const counts = { confirmed: 0, waitlisted: 0, cancelled: 0 }
  for (const e of rows) if (e.enrollment_status in counts) counts[e.enrollment_status] += 1
  const shown = status === 'all' ? rows : rows.filter((e) => e.enrollment_status === status)
  const first = loading && enrollees === null

  const setStatus = (next: string) => setParams((prev) => {
    const p = new URLSearchParams(prev)
    if (next === 'all') p.delete('status')
    else p.set('status', next)
    return p
  }, { replace: true })

  const nameOf = (e: Enrollee | null) => e?.user_id?.name || e?.user_id?.phone_number || 'this user'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registered Users"
        description={session.title}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Sessions', href: '/sessions' },
          { label: session.title, href: `/sessions/${sessionId}` },
          { label: 'Attendees' },
        ]}
        action={<Button asChild variant="outline" size="sm" className="bg-card"><Link to={`/sessions/${sessionId}`}><ArrowLeft aria-hidden="true" />Back to Session</Link></Button>}
      />

      {session.repeat?.weekly && (
        <Note>
          {session.schedule_label ? `${session.schedule_label}. ` : ''}One registration covers every class of this weekly series{session.classes_total ? ` (${session.classes_total} classes)` : ''}; seats are counted per class.
        </Note>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total" value={formatCount(rows.length)} loading={first} />
        <Stat label="Confirmed" value={formatCount(counts.confirmed)} loading={first} hint={session.max_attendees && session.capacity_mode === 'limited' ? `of ${formatCount(session.max_attendees)} seats` : undefined} />
        <Stat label="Waitlisted" value={formatCount(counts.waitlisted)} loading={first} />
        <Stat label="Cancelled" value={formatCount(counts.cancelled)} loading={first} />
      </div>

      {error && enrollees === null ? (
        <ErrorState title="The attendees could not be loaded" message={error} onRetry={load} />
      ) : (
        <Section
          title={<>Attendees <span className="ml-1 font-normal tabular-nums text-muted-foreground" aria-live="polite">{first ? '' : formatCount(shown.length)}</span></>}
          action={
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 w-[170px] bg-card text-[13px]" aria-label="Filter by status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({rows.length})</SelectItem>
                <SelectItem value="confirmed">Confirmed ({counts.confirmed})</SelectItem>
                <SelectItem value="waitlisted">Waitlisted ({counts.waitlisted})</SelectItem>
                <SelectItem value="cancelled">Cancelled ({counts.cancelled})</SelectItem>
              </SelectContent>
            </Select>
          }
          flush
        >
          {error && <div className="px-5 pb-4"><Note tone="danger">{error} Showing the last results. <button type="button" className="inline-flex items-center gap-1 font-medium underline underline-offset-2" onClick={load}><RotateCw aria-hidden="true" className="h-3.5 w-3.5" />Try again</button></Note></div>}
          {first ? (
            <div className="space-y-2 px-5 pb-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : shown.length === 0 ? (
            <EmptyState
              icon={Users}
              title={status === 'all' ? 'No registered users' : `No registered users with status "${status}"`}
              action={status !== 'all' ? <Button variant="outline" size="sm" onClick={() => setStatus('all')}>Clear filters</Button> : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 pl-5">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="hidden lg:table-cell">UG College</TableHead>
                  <TableHead className="hidden lg:table-cell">PG College</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Paid</TableHead>
                  <TableHead className="hidden sm:table-cell">Enrolled</TableHead>
                  <TableHead className="w-10 pr-5"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((e, i) => {
                  const user = e.user_id
                  const open = student.hrefOf(user) ? () => student.open(user) : undefined
                  return (
                    <TableRow
                      key={e._id}
                      tabIndex={open ? 0 : undefined}
                      className={open ? 'cursor-pointer hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[hsl(var(--ring))]' : undefined}
                      onClick={(ev) => { if (open && !(ev.target as HTMLElement).closest('button, a, [role="menuitem"]')) open() }}
                      onKeyDown={(ev) => { if (open && ev.key === 'Enter' && ev.target === ev.currentTarget) open() }}
                    >
                      <TableCell className="pl-5 text-xs tabular-nums text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <div className="min-w-[140px] max-w-[240px]">
                          <p className="truncate text-sm"><StudentLink student={user} from="Attendees" className="text-sm text-foreground hover:text-primary" /></p>
                          <p className="truncate text-xs text-muted-foreground md:hidden">{user?.email || ''}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{user?.phone_number || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[13px]">{user?.student_id || '—'}</TableCell>
                      <TableCell className="hidden text-sm md:table-cell"><span className="block max-w-[220px] truncate" title={user?.email}>{user?.email || '—'}</span></TableCell>
                      <TableCell className="hidden whitespace-nowrap text-sm tabular-nums sm:table-cell">{user?.phone_number || '—'}</TableCell>
                      <TableCell className="hidden text-[13px] lg:table-cell">{user?.ug_college || '—'}</TableCell>
                      <TableCell className="hidden text-[13px] lg:table-cell">{user?.pg_college || '—'}</TableCell>
                      <TableCell><Tag className="max-w-[220px] truncate">{enrollmentTypeLabel(e as GatedEnrollee)}</Tag></TableCell>
                      <TableCell><StatusPill tone={STATUS_TONE[e.enrollment_status] ?? 'neutral'}>{words(e.enrollment_status)}</StatusPill></TableCell>
                      <TableCell className="hidden text-sm tabular-nums md:table-cell">{e.purchase_id ? formatINR(e.purchase_id.amount_paid ?? 0) : '—'}</TableCell>
                      <TableCell className="hidden whitespace-nowrap text-[13px] text-muted-foreground sm:table-cell">{istDay(e.enrolled_at)}</TableCell>
                      <TableCell className="pr-5">
                        <RowMenu
                          label={`Actions for ${nameOf(e)}`}
                          actions={[{ label: 'Revoke Access', icon: ShieldOff, tone: 'danger', onSelect: () => setTarget(e), hidden: !canRevoke || e.enrollment_status === 'cancelled' }]}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </Section>
      )}

      <ConfirmDock
        open={!!target}
        onClose={() => setTarget(null)}
        title="Revoke Session Access"
        confirmLabel="Revoke Access"
        busyLabel="Revoking..."
        tone="danger"
        reason={{ label: 'Reason', placeholder: 'e.g. Refund issued, duplicate enrollment, policy violation...' }}
        onConfirm={async (reason) => {
          if (!target || !sessionId) return
          must(await liveSessionsService.revokeEnrollment(sessionId, target._id, reason || undefined), 'Failed to revoke access')
          toast.success('Session access revoked successfully')
          load()
        }}
      >
        <p>
          This will cancel <span className="font-medium text-foreground">{nameOf(target)}</span>'s enrollment in{' '}
          <span className="font-medium text-foreground">{session.title}</span>. They will lose access immediately. This cannot be undone.
        </p>
        {target?.purchase_id && <p>The associated purchase of <span className="font-medium text-foreground">{formatINR(target.purchase_id.amount_paid ?? 0)}</span> will also be marked as revoked.</p>}
      </ConfirmDock>
    </div>
  )
}
