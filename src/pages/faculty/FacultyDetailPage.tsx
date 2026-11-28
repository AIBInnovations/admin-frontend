import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Calendar, Pencil, ShieldCheck, Trash2, UserCircle, Video as VideoIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/common/DataTable'
import { StatusToggle } from '@/components/common/StatusToggle'
import { apiErrorMessage, CopyButton, DetailHeader, DetailSkeleton, ErrorState, FactGrid, Section, Stat, StatusPill, type Tone } from '@/components/common/detail'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import type { DeleteImpactResponse } from '@/types/api.types'
import { Faculty, facultyService, FacultySession, FacultyVideo, subjectsOf } from '@/services/faculty.service'
import { feedbackService } from '@/services/feedback.service'
import { AverageRating, RatingBars } from '@/pages/feedback/components/figures'
import { StaleNotice } from '@/pages/feedback/components/StaleNotice'
import { patchParams, useRemote } from '@/pages/feedback/remote'
import { average, istDay, istDayTime, plural } from '@/pages/feedback/lib'
import { splitQualifications } from './qualifications'

const SESSION_TONE: Record<FacultySession['status'], Tone> = { scheduled: 'info', live: 'success', completed: 'neutral', cancelled: 'danger' }
const SESSION_LABEL: Record<FacultySession['status'], string> = { scheduled: 'Scheduled', live: 'Live', completed: 'Completed', cancelled: 'Cancelled' }

const pageParam = (params: URLSearchParams, key: string) => {
  const n = Number(params.get(key))
  return Number.isInteger(n) && n > 0 ? n : 1
}
const minutes = (s: number) => (s > 0 ? (s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m` : `${Math.max(1, Math.round(s / 60))}m`) : 'No length')

function videoHref(v: FacultyVideo): string | null {
  if (!v.subject_id || !v.package || !v.series || !v.module || v.archivedAt) return null
  return `/content/explorer/subjects/${v.subject_id}/packages/${v.package._id}/series/${v.series._id}/modules/${v.module._id}/videos/${v._id}`
}

/** Everything about one faculty member: profile, subjects, videos, sessions, and what students say. */
export function FacultyDetailPage() {
  const { facultyId = '' } = useParams()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('faculty.update')
  const canDelete = hasPermission('faculty.delete')
  const canFeedback = hasPermission('videos.read')

  const { data, setData, loading, error, refresh } = useRemote<Faculty>(`faculty:${facultyId}`, () => facultyService.getById(facultyId))
  const feedback = useRemote(`feedback:${facultyId}:${canFeedback}`, () => (canFeedback ? feedbackService.faculty(facultyId) : Promise.resolve({ success: true, message: '', data: null as never })))
  const [busy, setBusy] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [impact, setImpact] = useState<DeleteImpactResponse | null>(null)
  const [loadingImpact, setLoadingImpact] = useState(false)

  const f = data?._id === facultyId ? data : null
  if (!f) {
    if (error && !loading) {
      const missing = error.status === 404 || error.status === 400
      return (
        <ErrorState
          title={missing ? 'This faculty member does not exist' : 'This faculty member could not be loaded'}
          message={missing ? 'They may have been removed.' : error.message}
          onRetry={missing ? undefined : refresh}
          back={{ label: 'Back to faculty', href: '/faculty' }}
        />
      )
    }
    return <DetailSkeleton />
  }

  const subjects = subjectsOf(f)
  const qualifications = splitQualifications(f.qualifications)
  const figures = feedback.data?.faculty?._id === facultyId ? feedback.data.summary : null

  const act = async (key: string, run: () => Promise<{ success: boolean; message: string }>, done: string, apply: Partial<Faculty>) => {
    if (busy) return
    setBusy(key)
    try {
      const res = await run()
      if (!res.success) throw new Error(res.message)
      setData({ ...f, ...apply })
      toast.success(done)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }
  const askDelete = async () => {
    setDeleteOpen(true)
    setLoadingImpact(true)
    setImpact(null)
    try {
      const res = await facultyService.getDeleteImpact(f._id)
      if (res.success && res.data) setImpact(res.data)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not check what uses this faculty member'))
    } finally {
      setLoadingImpact(false)
    }
  }

  return (
    <div className="space-y-6">
      <DetailHeader
        back={{ label: 'Faculty', href: '/faculty' }}
        title={<span className="inline-flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            {f.photo_url ? <img src={f.photo_url} alt="" className="h-full w-full object-cover" /> : <UserCircle aria-hidden="true" className="h-7 w-7 text-muted-foreground" />}
          </span>
          <span className="min-w-0 break-words">{f.name}</span>
          {f.faculty_code && (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-card py-0.5 pl-2 pr-0.5 align-middle font-mono text-[13px] font-medium tabular-nums text-foreground">
              {f.faculty_code}<CopyButton value={f.faculty_code} label="Faculty code" />
            </span>
          )}
        </span>}
        status={<><StatusPill tone={f.is_active ? 'success' : 'neutral'}>{f.is_active ? 'Active' : 'Inactive'}</StatusPill><StatusPill tone={f.is_verified ? 'info' : 'warning'}>{f.is_verified ? 'Verified' : 'Verification pending'}</StatusPill></>}
        subtitle={[f.qualifications, f.specialization].filter(Boolean).join(' · ') || undefined}
        actions={<>
          {canUpdate && !f.is_verified && (
            <Button variant="outline" className="bg-card" disabled={!!busy} onClick={() => act('verify', () => facultyService.verifyFaculty(f._id, true), 'Faculty verified successfully', { is_verified: true })}>
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />{busy === 'verify' ? 'Verifying…' : 'Verify Faculty'}
            </Button>
          )}
          {canDelete && <Button variant="outline" className="bg-card text-danger hover:text-danger" onClick={askDelete}><Trash2 aria-hidden="true" className="h-4 w-4" />Delete</Button>}
          {canUpdate && <Button asChild><Link to={`/faculty/${f._id}/edit`}><Pencil aria-hidden="true" className="h-4 w-4" />Edit</Link></Button>}
        </>}
      />
      <StaleNotice error={error?.message} onRetry={refresh} />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Videos" value={formatCount(f.video_count ?? 0)} />
        <Stat label="Live sessions" value={formatCount(f.live_session_count ?? 0)} hint={f.workshop_count ? plural(f.workshop_count, 'workshop') : undefined} />
        {canFeedback && <Stat label="Average rating" loading={feedback.loading && !figures} value={figures ? average(figures.average) : feedback.error ? 'Not loaded' : 'No ratings'} hint={figures ? plural(figures.rating_count, 'rating') : undefined} href={`/feedback/faculty/${f._id}`} />}
        {canFeedback && <Stat label="Open feedback" loading={feedback.loading && !figures} value={figures ? formatCount(figures.open_count) : feedback.error ? 'Not loaded' : '0'} hint={figures ? `${formatCount(figures.low_count)} low ${figures.low_count === 1 ? 'rating' : 'ratings'}` : undefined} href={`/feedback/faculty/${f._id}?status=open`} />}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Profile" action={canUpdate && <StatusToggle checked={f.is_active} label={f.name} disabled={!!busy} onCheckedChange={() => act('active', () => facultyService.toggleActive(f._id, !f.is_active), `Faculty ${f.is_active ? 'deactivated' : 'activated'} successfully`, { is_active: !f.is_active })} />}>
          <FactGrid className="xl:grid-cols-2" facts={[
            { label: 'Faculty code', value: f.faculty_code || 'Not assigned yet', copy: f.faculty_code || undefined, mono: !!f.faculty_code },
            { label: 'Email', value: f.email, copy: f.email },
            { label: 'Phone', value: f.phone, copy: f.phone, mono: !!f.phone },
            { label: 'Experience', value: f.experience_years == null ? null : plural(f.experience_years, 'year') },
            { label: 'Display order', value: String(f.display_order ?? 0) },
            { label: 'Faculty portal sign-in', value: f.has_password === undefined ? null : f.has_password ? 'Password set' : 'No password set' },
            { label: 'Last sign-in', value: f.last_login ? istDayTime(f.last_login) : 'Never' },
            { label: 'Added', value: istDay(f.createdAt) },
          ]} />
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="text-[13px] text-muted-foreground">Qualifications</h3>
            {qualifications.length > 0
              ? (
                <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Qualifications">
                  {qualifications.map((q) => <li key={q} className="max-w-full break-words rounded-md bg-muted px-2 py-0.5 text-sm">{q}</li>)}
                </ul>
              )
              : <p className="mt-0.5 text-sm text-muted-foreground">Not set</p>}
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="text-[13px] text-muted-foreground">Bio</h3>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed">{f.bio || <span className="text-muted-foreground">Not set</span>}</p>
          </div>
        </Section>

        <div className="min-w-0 space-y-6">
          <Section title="Subjects">
            {subjects.length > 0
              ? (
                <ul className="space-y-2 pointer-coarse:space-y-0">
                  {subjects.map((s, i) => (
                    <li key={s._id} className="flex flex-wrap items-center gap-2 text-sm pointer-coarse:min-h-10">
                      {hasPermission('subjects.read') ? <Link to={`/content/subjects/${s._id}`} className="font-medium text-primary hover:underline">{s.name}</Link> : <span className="font-medium">{s.name}</span>}
                      {i === 0 && subjects.length > 1 && <StatusPill tone="info">Primary</StatusPill>}
                      {s.is_active === false && <StatusPill>Inactive subject</StatusPill>}
                    </li>
                  ))}
                </ul>
              )
              : <p className="text-sm text-muted-foreground">No subject chosen yet.{canUpdate && <> <Link className="text-primary hover:underline" to={`/faculty/${f._id}/edit`}>Choose subjects</Link></>}</p>}
          </Section>

          {canFeedback && (
            <Section title="Feedback" action={<Button asChild variant="outline" size="sm"><Link to={`/feedback/faculty/${f._id}`}>Open feedback</Link></Button>}>
              {feedback.error && !figures
                ? <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">The feedback could not be loaded.<Button variant="outline" size="sm" onClick={feedback.refresh}>Try again</Button></div>
                : figures
                  ? figures.rating_count > 0
                    ? <RatingBars figures={figures} hrefFor={(n) => `/feedback/faculty/${f._id}?status=all&rating=${n}`} />
                    : <p className="text-sm text-muted-foreground">No ratings yet.</p>
                  : <p role="status" className="text-sm text-muted-foreground">Loading</p>}
            </Section>
          )}
        </div>
      </div>

      <FacultyVideos facultyId={f._id} showRating={canFeedback} />
      <FacultySessions facultyId={f._id} />

      <DeleteModal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setImpact(null) }}
        onConfirm={async () => {
          try {
            const res = await facultyService.delete(f._id)
            if (!res.success) throw new Error(res.message)
            toast.success('Faculty deleted successfully')
            navigate('/faculty', { replace: true })
          } catch (err) {
            toast.error(apiErrorMessage(err, 'Failed to delete faculty'))
            throw err
          }
        }}
        title="Delete Faculty"
        itemName={f.name}
        isLoadingImpact={loadingImpact}
        blocked={impact?.blocked}
        warning={impact?.dependencies?.length ? {
          message: impact.blocked ? 'Cannot delete. Remove the following dependencies first:' : 'The following associated data will be affected:',
          details: impact.dependencies.map((d) => ({ label: d.label, count: d.count, blocking: d.blocking })),
        } : undefined}
      />
    </div>
  )
}

function FacultyVideos({ facultyId, showRating }: { facultyId: string; showRating: boolean }) {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [params, setParams] = useSearchParams()
  const page = pageParam(params, 'videos')
  const { data, loading, error, refresh } = useRemote(`videos:${facultyId}:${page}`, () => facultyService.getVideos(facultyId, { page, limit: 10 }))
  const canExplore = hasPermission('subjects.read')

  const columns: ColumnDef<FacultyVideo>[] = [
    {
      id: 'video', header: 'Video',
      cell: (v) => (
        <span className="block min-w-[220px]">
          <span className="block max-w-[420px] truncate text-sm font-medium" title={v.title}>{v.title}{v.archivedAt && <span className="font-normal text-muted-foreground"> (archived)</span>}{v.publish_status === 'draft' && <span className="font-normal text-muted-foreground"> (draft)</span>}</span>
          <span className="block max-w-[420px] truncate text-xs text-muted-foreground" title={[v.package?.name, v.series?.name, v.module?.name].filter(Boolean).join(' / ') || undefined}>{[v.package?.name, v.series?.name, v.module?.name].filter(Boolean).join(' / ') || 'Not in a course'}</span>
        </span>
      ),
    },
    { id: 'length', header: 'Length', cell: (v) => <span className="whitespace-nowrap text-sm tabular-nums">{minutes(v.duration_seconds)}</span> },
    { id: 'plays', header: 'Plays', headerClassName: 'text-right', cellClassName: 'text-right', cell: (v) => <span className="tabular-nums">{formatCount(v.view_count)}</span> },
    ...(showRating ? [{ id: 'rating', header: 'Rating', cell: (v: FacultyVideo) => (v.rating?.rating_count || v.rating?.open_count ? <Link to={`/feedback/videos/${v._id}`} className="hover:underline"><AverageRating value={v.rating.average} count={v.rating.rating_count} /></Link> : <span className="text-sm text-muted-foreground">No ratings</span>) }] : []),
  ]

  return (
    <section aria-labelledby="faculty-videos" className="space-y-3">
      <h2 id="faculty-videos" className="text-[15px] font-semibold">Videos</h2>
      {data && <StaleNotice error={error?.message} onRetry={refresh} />}
      <DataTable
        data={data?.entities ?? []}
        columns={columns}
        isLoading={loading && !data}
        error={data ? null : error?.message}
        onRetry={refresh}
        skeletonCount={4}
        getRowKey={(v) => v._id}
        onRowClick={(v) => { const href = canExplore ? videoHref(v) : null; navigate(href ?? (showRating ? `/feedback/videos/${v._id}` : '/content/videos')) }}
        pagination={{ currentPage: page, totalPages: data?.pagination.totalPages ?? 1, totalCount: data?.pagination.total ?? 0, onPageChange: (p) => setParams(patchParams(params, { videos: p > 1 ? String(p) : null }, true), { replace: true }) }}
        emptyState={{ icon: VideoIcon, title: 'No videos name this faculty member' }}
      />
    </section>
  )
}

function FacultySessions({ facultyId }: { facultyId: string }) {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canOpen = hasPermission('live_sessions.read')
  const [params, setParams] = useSearchParams()
  const when = params.get('when') === 'past' ? 'past' : 'upcoming'
  const page = pageParam(params, 'sessions')
  const { data, loading, error, refresh } = useRemote(`sessions:${facultyId}:${when}:${page}`, () => facultyService.getSessions(facultyId, { when, page, limit: 10 }))
  const choose = useCallback((v: 'upcoming' | 'past') => setParams((prev) => patchParams(prev, { when: v === 'past' ? 'past' : null, sessions: null }, true), { replace: true }), [setParams])

  const columns: ColumnDef<FacultySession>[] = [
    {
      id: 'title', header: 'Session',
      cell: (s) => (
        <span className="block min-w-[220px]">
          <span className="block max-w-[420px] truncate text-sm font-medium" title={s.title}>{s.title}</span>
          <span className="block max-w-[420px] truncate text-xs text-muted-foreground">{s.workshop_id ? `${s.workshop_id.title}${s.workshop_day ? `, day ${s.workshop_day}` : ''}` : s.subject_id?.name || 'Deleted subject'}</span>
        </span>
      ),
    },
    { id: 'start', header: 'Starts', cell: (s) => <span className="whitespace-nowrap text-sm">{istDayTime(s.scheduled_start_time)}</span> },
    { id: 'length', header: 'Length', cell: (s) => <span className="whitespace-nowrap text-sm tabular-nums">{s.duration_minutes} min</span> },
    { id: 'status', header: 'Status', cell: (s) => <StatusPill tone={SESSION_TONE[s.status]}>{SESSION_LABEL[s.status] ?? s.status}</StatusPill> },
  ]

  return (
    <section aria-labelledby="faculty-sessions" className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="faculty-sessions" className="text-[15px] font-semibold">Live sessions</h2>
        <div role="group" aria-label="When" className="inline-flex rounded-md border border-border bg-muted p-0.5">
          {(['upcoming', 'past'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={when === v} onClick={() => choose(v)} className={cn('rounded px-3 py-1 text-[13px] font-medium transition-colors', when === v ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground')}>
              {v === 'upcoming' ? 'Upcoming' : 'Past'}
            </button>
          ))}
        </div>
      </div>
      {data && <StaleNotice error={error?.message} onRetry={refresh} />}
      <DataTable
        data={data?.entities ?? []}
        columns={columns}
        isLoading={loading && !data}
        error={data ? null : error?.message}
        onRetry={refresh}
        skeletonCount={3}
        getRowKey={(s) => s._id}
        onRowClick={canOpen ? (s) => navigate(s.workshop_id ? `/workshops/${s.workshop_id._id}` : `/sessions/${s._id}`) : undefined}
        pagination={{ currentPage: page, totalPages: data?.pagination.totalPages ?? 1, totalCount: data?.pagination.total ?? 0, onPageChange: (p) => setParams(patchParams(params, { sessions: p > 1 ? String(p) : null }, true), { replace: true }) }}
        emptyState={{ icon: Calendar, title: when === 'upcoming' ? 'No upcoming sessions' : 'No past sessions' }}
      />
    </section>
  )
}
