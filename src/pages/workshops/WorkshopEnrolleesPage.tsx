import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Award, Check, Download, Minus, RotateCw, ShieldOff, Users } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { DetailSkeleton, Section, Stat, StatusPill, apiErrorInfo, apiErrorMessage, type Tone } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/contexts/AuthContext'
import { formatCount } from '@/lib/format'
import { workshopsService, WorkshopEnrollee, WorkshopEnrolleesResponse } from '@/services/workshops.service'
import { ConfirmDock, must } from '@/components/forms/editor/ConfirmDock'
import { Note } from '@/components/forms/editor/fields'
import { RecordError } from '@/components/forms/editor/EditorPage'
import { RowMenu, Tag } from '@/components/forms/editor/list'
import { csvLine } from '@/components/workshops/csv'
import { StudentLink, useStudentPage } from '@/components/students/StudentLink'

const STATUS_TONE: Record<string, Tone> = { confirmed: 'success', waitlisted: 'warning', cancelled: 'danger' }
const STATUSES = ['confirmed', 'waitlisted', 'cancelled'] as const
const words = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

export function WorkshopEnrolleesPage() {
  const { workshopId } = useParams<{ workshopId: string }>()
  const { hasPermission } = useAuth()
  const canRevoke = hasPermission('live_sessions.update')
  const student = useStudentPage('Enrollees')
  const [params, setParams] = useSearchParams()
  const status = STATUSES.find((s) => s === params.get('status')) ?? 'all'
  const [search, setSearch] = useState(params.get('search') ?? '')

  // Every registration is loaded once and filtered here, so the counts stay
  // right while a filter is on.
  const [data, setData] = useState<WorkshopEnrolleesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ status?: number; message: string } | null>(null)
  const call = useRef(0)
  const load = useCallback(async () => {
    if (!workshopId) return
    const n = ++call.current
    setLoading(true); setError(null)
    try {
      const res = await workshopsService.getEnrollees(workshopId)
      if (n !== call.current) return
      if (!res.success || !res.data) throw new Error(res.message || 'Failed to load enrollees')
      setData(res.data)
    } catch (e) {
      if (n === call.current) setError({ status: apiErrorInfo(e).status, message: apiErrorMessage(e, 'Failed to load enrollees') })
    } finally {
      if (n === call.current) setLoading(false)
    }
  }, [workshopId])
  useEffect(() => { load(); return () => { call.current += 1 } }, [load])

  // Search in the URL, without an entry per letter
  useEffect(() => {
    const t = setTimeout(() => setParams((prev) => {
      const p = new URLSearchParams(prev)
      if (search.trim()) p.set('search', search.trim())
      else p.delete('search')
      return p
    }, { replace: true }), 300)
    return () => clearTimeout(t)
  }, [search, setParams])

  const [target, setTarget] = useState<WorkshopEnrollee | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.enrollees ?? []).filter((e) => {
      if (status !== 'all' && e.enrollment_status !== status) return false
      if (!q) return true
      const u = e.user_id
      return [u?.name, u?.email, u?.phone_number, u?.student_id].some((x) => x?.toLowerCase().includes(q))
    })
  }, [data, search, status])

  if (loading && !data) return <DetailSkeleton />
  if (!data) return <RecordError status={error?.status ?? null} message={error?.message ?? ''} noun="workshop" back={{ label: 'Back to workshops', href: '/workshops' }} onRetry={load} />

  const { workshop, days } = data
  const counts = { confirmed: 0, waitlisted: 0, cancelled: 0 }
  for (const e of data.enrollees) if (e.enrollment_status in counts) counts[e.enrollment_status] += 1
  const heldDays = days.filter((d) => d.status !== 'cancelled').length

  const setStatus = (next: string) => setParams((prev) => {
    const p = new URLSearchParams(prev)
    if (next === 'all') p.delete('status')
    else p.set('status', next)
    return p
  }, { replace: true })
  const clear = () => { setSearch(''); setStatus('all') }

  /** Client-side CSV of the rows on screen, with the attendance of each day. */
  const exportCsv = () => {
    const rows = [
      ['Name', 'Email', 'Phone', 'Student ID', 'Type', 'Status', ...days.map((d) => `Day ${d.day_number}`), 'Days Attended', 'Certificate'],
      ...filtered.map((e) => [
        e.user_id?.name, e.user_id?.email, e.user_id?.phone_number, e.user_id?.student_id || '', e.enrollment_type, e.enrollment_status,
        ...days.map((d) => (e.attended_day_numbers.includes(d.day_number) ? 'Yes' : 'No')),
        e.days_attended,
        e.certificate ? (e.certificate.revoked ? 'Revoked' : e.certificate.certificate_number) : '',
      ]),
    ]
    const blob = new Blob([`﻿${rows.map(csvLine).join('\r\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workshop-enrollees-${workshopId}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filtered.length} registration${filtered.length === 1 ? '' : 's'}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workshop Enrollees"
        description={`${workshop.title} · ${workshop.day_count} day${workshop.day_count === 1 ? '' : 's'}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Workshops', href: '/workshops' },
          { label: workshop.title, href: `/workshops/${workshopId}` },
          { label: 'Enrollees' },
        ]}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="bg-card"><Link to={`/workshops/${workshopId}`}><ArrowLeft aria-hidden="true" />Back</Link></Button>
            <Button variant="outline" size="sm" className="bg-card" onClick={exportCsv} disabled={filtered.length === 0}><Download aria-hidden="true" />Export CSV</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total registrations" value={formatCount(data.enrollees.length)} />
        <Stat label="Confirmed" value={formatCount(counts.confirmed)} hint={workshop.max_seats ? `of ${formatCount(workshop.max_seats)} seats` : undefined} />
        <Stat label="Waitlisted" value={formatCount(counts.waitlisted)} />
        <Stat label="Cancelled" value={formatCount(counts.cancelled)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Search enrollees"
          placeholder="Search by name, email, phone or student ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full bg-card sm:max-w-sm"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[180px] bg-card" aria-label="Filter by status"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="waitlisted">Waitlisted</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[13px] tabular-nums text-muted-foreground" aria-live="polite">{filtered.length === data.enrollees.length ? '' : `${formatCount(filtered.length)} of ${formatCount(data.enrollees.length)}`}</p>
      </div>

      {error && <Note tone="danger">{error.message} Showing the last results. <button type="button" className="inline-flex items-center gap-1 font-medium underline underline-offset-2" onClick={load}><RotateCw aria-hidden="true" className="h-3.5 w-3.5" />Try again</button></Note>}

      <Section flush>
        {filtered.length === 0 ? (
          data.enrollees.length === 0
            ? <EmptyState icon={Users} title="Nobody has registered yet" description="Students appear here as they register." />
            : <EmptyState icon={Users} title="No enrollees match your filters" action={<Button variant="outline" size="sm" onClick={clear}>Clear filters</Button>} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[200px] pl-5">Student</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="w-28">Status</TableHead>
                {days.map((d) => (
                  <TableHead key={d.session_id} className="w-14 text-center" title={`${d.title}${d.status === 'cancelled' ? ' (cancelled)' : ''}`}>
                    <span className={d.status === 'cancelled' ? 'text-muted-foreground line-through' : ''}>D{d.day_number}</span>
                  </TableHead>
                ))}
                <TableHead className="w-20 text-center">Attended</TableHead>
                <TableHead className="w-36">Certificate</TableHead>
                <TableHead className="w-10 pr-5"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => {
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
                    <TableCell className="pl-5">
                      <div className="max-w-[260px]">
                        <p className="truncate text-sm"><StudentLink student={user} from="Enrollees" className="text-foreground hover:text-primary" /></p>
                        <p className="truncate text-xs text-muted-foreground">{[user?.email, user?.student_id].filter(Boolean).join(' · ')}</p>
                      </div>
                    </TableCell>
                    <TableCell><Tag>{words(e.enrollment_type)}</Tag></TableCell>
                    <TableCell>
                      <StatusPill tone={STATUS_TONE[e.enrollment_status] ?? 'neutral'}>
                        {words(e.enrollment_status)}{e.enrollment_status === 'waitlisted' && e.waitlist_position ? ` #${e.waitlist_position}` : ''}
                      </StatusPill>
                    </TableCell>
                    {days.map((d) => {
                      const attended = e.attended_day_numbers.includes(d.day_number)
                      return (
                        <TableCell key={d.session_id} className="text-center">
                          {attended
                            ? <Check role="img" aria-label="Attended" className="mx-auto h-4 w-4 text-success" />
                            : <Minus role="img" aria-label="Not attended" className="mx-auto h-4 w-4 text-muted-foreground/50" />}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center text-sm tabular-nums">{e.days_attended}/{heldDays}</TableCell>
                    <TableCell>
                      {e.certificate ? (
                        e.certificate.revoked
                          ? <StatusPill tone="danger">Revoked</StatusPill>
                          : <span className="flex items-center gap-1.5 text-xs"><Award aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-success" /><span className="max-w-[130px] truncate font-mono" title={e.certificate.certificate_number}>{e.certificate.certificate_number}</span></span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-5">
                      <RowMenu
                        label={`Actions for ${user?.name || 'this student'}`}
                        actions={[{ label: 'Revoke access', icon: ShieldOff, tone: 'danger', onSelect: () => setTarget(e), hidden: !canRevoke || e.enrollment_status === 'cancelled' }]}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Section>

      <ConfirmDock
        open={!!target}
        onClose={() => setTarget(null)}
        title="Revoke workshop access"
        confirmLabel="Revoke access"
        busyLabel="Revoking..."
        tone="danger"
        reason={{ label: 'Reason', placeholder: 'e.g., Refund processed' }}
        onConfirm={async (reason) => {
          if (!target || !workshopId) return
          must(await workshopsService.revokeEnrollment(workshopId, target._id, reason || undefined), 'Failed to revoke registration')
          toast.success('Registration revoked')
          load()
        }}
      >
        <p>
          <span className="font-medium text-foreground">{target?.user_id?.name || 'This student'}</span> will lose access to every remaining day, any recordings, and their certificate.
          {target?.enrollment_status === 'confirmed' ? ' The next waitlisted student is promoted automatically.' : ''}
        </p>
      </ConfirmDock>
    </div>
  )
}
