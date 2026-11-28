import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Layers, Package as PackageIcon, UserCheck, Users, Video } from 'lucide-react'
import { ChoiceCards, Field, SearchSelect, StudentPicker, type SelectOption } from '@/components/users/kit'
import { plural, unwrap, useResource } from '@/components/users/lib'
import { useAuth } from '@/contexts/AuthContext'
import { exportsService } from '@/services/exports.service'
import { liveSessionsService, type LiveSession } from '@/services/liveSessions.service'
import { packagesService } from '@/services/packages.service'
import { seriesService } from '@/services/series.service'
import { subjectsService } from '@/services/subjects.service'
import { usersService, type User } from '@/services/users.service'
import type { ScheduledNotificationFull, ScheduledTargetType } from '@/services/notifications.service'

export type Channel = 'push' | 'email' | 'sms'
export type TargetAudience = 'all' | 'subject' | 'specific' | 'session'
export type SubjectScope = 'subscribers' | 'package' | 'series'

/** Who a message goes to. Names ride along so the review can say them. */
export interface Audience {
  target: TargetAudience
  subjectId: string
  subjectScope: SubjectScope
  packageId: string
  seriesId: string
  sessionId: string
  users: User[]
  names: { subject?: string; package?: string; series?: string; session?: string }
}

export const EMPTY_AUDIENCE: Audience = { target: 'all', subjectId: '', subjectScope: 'subscribers', packageId: '', seriesId: '', sessionId: '', users: [], names: {} }

/** What is still missing, as a short instruction. Null when complete. */
export function audienceProblem(a: Audience): string | null {
  if (a.target === 'subject') {
    if (!a.subjectId) return 'Select a subject first'
    if (a.subjectScope === 'package' && !a.packageId) return 'Select a package'
    if (a.subjectScope === 'series' && !(a.packageId && a.seriesId)) return 'Select a package and series'
  }
  if (a.target === 'session' && !a.sessionId) return 'Select a live session first'
  if (a.target === 'specific' && a.users.length === 0) return 'Search and select users first'
  return null
}

export function describeAudience(a: Audience, channel: Channel): string {
  const suffix = channel === 'email' ? ' with an email address' : channel === 'sms' ? ' with a registered phone' : ''
  if (a.target === 'all') return `All active users${suffix}`
  if (a.target === 'session') return `Everyone enrolled in ${a.names.session || 'the selected session'}`
  if (a.target === 'specific') return plural(a.users.length, 'selected user')
  if (a.subjectScope === 'package') return `Active purchasers of ${a.names.package || 'the selected package'}`
  if (a.subjectScope === 'series') return `Users with access to ${a.names.series || 'the selected series'}`
  return `All subscribers of ${a.names.subject || 'the selected subject'}`
}

/** The audience as the schedule endpoint wants it. */
export function scheduleTarget(a: Audience): { target_type: ScheduledTargetType; target_id?: string; user_ids?: string[] } {
  if (a.target === 'all') return { target_type: 'all' }
  if (a.target === 'session') return { target_type: 'session', target_id: a.sessionId }
  if (a.target === 'specific') return { target_type: 'users', user_ids: a.users.map((u) => u._id) }
  if (a.subjectScope === 'package') return { target_type: 'package', target_id: a.packageId }
  if (a.subjectScope === 'series') return { target_type: 'series', target_id: a.seriesId }
  return { target_type: 'subject', target_id: a.subjectId }
}

// ── How many people ──────────────────────────────────────────────────────

export interface AudienceCount { count: number | null; kind: 'exact' | 'atMost' | 'atLeast'; loading: boolean; failed: boolean; unavailable: boolean }

/**
 * Counts from what the API already offers: the user list, the session's
 * enrollments and the export previews. A subject can only be counted by main
 * subject, so that one is a minimum.
 */
export function useAudienceCount(a: Audience, channel: Channel, excludedIds: string[] = []): AudienceCount {
  const { hasPermission } = useAuth()
  const canCount = hasPermission('users.read')
  const ready = audienceProblem(a) === null
  const key = !ready ? '' : a.target === 'all' ? `all:${channel}` : a.target === 'session' ? `session:${a.sessionId}` : a.target === 'specific' ? 'specific'
    : a.subjectScope === 'package' ? `package:${a.packageId}` : a.subjectScope === 'series' ? `series:${a.seriesId}` : `subject:${a.subjectId}`

  const { data, loading, error } = useResource<{ key: string; count: number; kind: AudienceCount['kind'] } | null>(async () => {
    if (!key || key === 'specific' || !canCount) return null
    if (a.target === 'all') {
      const res = unwrap(await usersService.getAll({ is_active: true, limit: 1, ...(channel === 'email' ? { email_excluded: false } : {}) }))
      return { key, count: res.pagination?.total ?? 0, kind: channel === 'push' ? 'exact' : 'atMost' }
    }
    const preview = a.target === 'session' ? await exportsService.previewUsersBySession(a.sessionId)
      : a.subjectScope === 'package' ? await exportsService.previewUsersByPackage({ package_id: a.packageId })
        : a.subjectScope === 'series' ? await exportsService.previewUsersByPackage({ series_id: a.seriesId })
          : await exportsService.previewUsersBySubject(a.subjectId)
    const people = preview.rows || []
    const needs = channel === 'email' ? 'email' : channel === 'sms' ? 'phone_number' : null
    const reachable = needs ? people.filter((p) => p[needs]) : people
    const unique = new Set(reachable.map((p, i) => String(p.phone_number || p.email || p.student_id || `row${i}`)))
    const isSubject = a.target === 'subject' && a.subjectScope === 'subscribers'
    return { key, count: unique.size, kind: isSubject ? 'atLeast' : channel === 'email' ? 'atMost' : 'exact' }
  }, [key, canCount])

  if (!ready) return { count: null, kind: 'exact', loading: false, failed: false, unavailable: false }
  if (a.target === 'specific') {
    const excluded = new Set(excludedIds)
    const reachable = a.users.filter((u) => !excluded.has(u._id) && (channel !== 'email' || (u.email && !u.email_excluded)) && (channel !== 'sms' || u.phone_number))
    return { count: reachable.length, kind: 'exact', loading: false, failed: false, unavailable: false }
  }
  if (!canCount) return { count: null, kind: 'exact', loading: false, failed: false, unavailable: true }
  const fresh = data?.key === key ? data : null
  const count = fresh ? Math.max(0, fresh.count - (channel === 'email' ? excludedIds.length : 0)) : null
  return { count, kind: fresh?.kind ?? 'exact', loading: loading && !fresh, failed: !!error && !fresh, unavailable: false }
}

export function countText(c: AudienceCount): string {
  if (c.loading) return 'Counting…'
  if (c.unavailable) return 'Your role cannot see the number of people'
  if (c.failed) return 'The number of people could not be loaded'
  if (c.count === null) return ''
  const n = plural(c.count, 'person', 'people')
  return c.kind === 'atMost' ? `Up to ${n}` : c.kind === 'atLeast' ? `At least ${n}` : n
}

// ── Picker ───────────────────────────────────────────────────────────────

const sessionHint = (s: LiveSession) => (s.enrollment_count !== undefined ? `${s.enrollment_count.toLocaleString('en-IN')} enrolled` : undefined)

export function AudiencePicker({ value, onChange, disabled, idPrefix }: { value: Audience; onChange: (next: Audience) => void; disabled?: boolean; idPrefix: string }) {
  const set = (patch: Partial<Audience>) => onChange({ ...value, ...patch })
  const isSubject = value.target === 'subject'
  const needsPackages = isSubject && !!value.subjectId && value.subjectScope !== 'subscribers'
  const needsSeries = needsPackages && value.subjectScope === 'series' && !!value.packageId

  const subjects = useResource<SelectOption[]>(async () => (isSubject ? unwrap(await subjectsService.getSubjects({ limit: 100, is_active: true, sort_by: 'display_order', sort_order: 'asc' })).entities.map((s) => ({ value: s._id, label: s.name })) : []), [isSubject])
  const packages = useResource<SelectOption[]>(async () => (needsPackages ? unwrap(await packagesService.getAll({ subject_id: value.subjectId, is_active: true, limit: 100 })).entities.map((p) => ({ value: p._id, label: p.name })) : []), [needsPackages, value.subjectId])
  const series = useResource<SelectOption[]>(async () => (needsSeries ? unwrap(await seriesService.getAll({ package_id: value.packageId, is_active: true, limit: 100 })).entities.map((s) => ({ value: s._id, label: s.name })) : []), [needsSeries, value.packageId])
  const sessions = useResource<SelectOption[]>(async () => (value.target === 'session' ? unwrap(await liveSessionsService.getAll({ limit: 100, publish_status: 'published' })).entities.map((s) => ({ value: s._id, label: s.title, hint: sessionHint(s) })) : []), [value.target === 'session'])

  return (
    <div className="space-y-5">
      <ChoiceCards
        label="Target Audience" value={value.target} disabled={disabled} columns="sm:grid-cols-2 2xl:grid-cols-4" onChange={(target) => set({ target })}
        options={[
          { value: 'all', icon: Users, label: 'All Users', hint: 'Send to everyone' },
          { value: 'subject', icon: BookOpen, label: 'By Subject', hint: 'Subject subscribers' },
          { value: 'session', icon: Video, label: 'By Session', hint: 'Session enrollees' },
          { value: 'specific', icon: UserCheck, label: 'Specific Users', hint: 'Pick individual users' },
        ]}
      />

      {isSubject && (
        <>
          <Field id={`${idPrefix}-subject`} label="Subject" required>
            <SearchSelect
              value={value.subjectId} options={subjects.data || []} loading={subjects.loading} error={subjects.error} onRetry={() => subjects.reload()} disabled={disabled}
              placeholder="Select a subject" searchPlaceholder="Search subjects" emptyText="No subjects found" missingLabel={value.names.subject}
              onChange={(id) => set({ subjectId: id, subjectScope: 'subscribers', packageId: '', seriesId: '', names: { subject: subjects.data?.find((s) => s.value === id)?.label } })}
            />
          </Field>
          {value.subjectId && (
            <div>
              <p className="mb-1.5 text-[13px] font-medium">Target Scope</p>
              <ChoiceCards
                label="Target Scope" value={value.subjectScope} disabled={disabled} columns="sm:grid-cols-3"
                onChange={(subjectScope) => set({ subjectScope, packageId: '', seriesId: '', names: { subject: value.names.subject } })}
                options={[
                  { value: 'subscribers', icon: Users, label: 'All Subscribers', hint: 'All subject subscribers' },
                  { value: 'package', icon: PackageIcon, label: 'Package', hint: 'Package purchasers' },
                  { value: 'series', icon: Layers, label: 'Series', hint: 'Series subscribers' },
                ]}
              />
            </div>
          )}
          {needsPackages && (
            <Field id={`${idPrefix}-package`} label="Package" required>
              <SearchSelect
                value={value.packageId} options={packages.data || []} loading={packages.loading} error={packages.error} onRetry={() => packages.reload()} disabled={disabled}
                placeholder={!packages.loading && packages.data?.length === 0 ? 'No packages found for this subject' : 'Select a package'} searchPlaceholder="Search packages" emptyText="No packages found for this subject" missingLabel={value.names.package}
                onChange={(id) => set({ packageId: id, seriesId: '', names: { ...value.names, package: packages.data?.find((p) => p.value === id)?.label, series: undefined } })}
              />
            </Field>
          )}
          {needsSeries && (
            <Field id={`${idPrefix}-series`} label="Series" required>
              <SearchSelect
                value={value.seriesId} options={series.data || []} loading={series.loading} error={series.error} onRetry={() => series.reload()} disabled={disabled}
                placeholder={!series.loading && series.data?.length === 0 ? 'No series found for this package' : 'Select a series'} searchPlaceholder="Search series" emptyText="No series found for this package" missingLabel={value.names.series}
                onChange={(id) => set({ seriesId: id, names: { ...value.names, series: series.data?.find((s) => s.value === id)?.label } })}
              />
            </Field>
          )}
        </>
      )}

      {value.target === 'session' && (
        <Field id={`${idPrefix}-session`} label="Live Session" required>
          <SearchSelect
            value={value.sessionId} options={sessions.data || []} loading={sessions.loading} error={sessions.error} onRetry={() => sessions.reload()} disabled={disabled}
            placeholder="Select a live session" searchPlaceholder="Search sessions" emptyText="No published sessions" missingLabel={value.names.session}
            onChange={(id) => set({ sessionId: id, names: { session: sessions.data?.find((s) => s.value === id)?.label } })}
          />
        </Field>
      )}

      {value.target === 'specific' && (
        <div>
          <label htmlFor={`${idPrefix}-users`} className="mb-1.5 block text-[13px] font-medium">Select Users</label>
          <StudentPicker id={`${idPrefix}-users`} label="Select users" value={value.users} onChange={(users) => set({ users })} disabled={disabled} placeholder="Search users by name, email, or phone..." />
        </div>
      )}
    </div>
  )
}

// ── Opening a scheduled send for editing ─────────────────────────────────

const refId = (v: unknown) => (v && typeof v === 'object' ? String((v as { _id?: string })._id ?? '') : v ? String(v) : '')
const refName = (v: unknown) => (v && typeof v === 'object' && 'name' in v ? String((v as { name: unknown }).name) : undefined)

/** Names for up to 30 people; more than that stay as a count. */
export async function loadUsers(ids: string[]): Promise<User[]> {
  const stub = (id: string) => ({ _id: id, name: 'Student', phone_number: '', email: '' }) as User
  if (ids.length > 30) return ids.map(stub)
  return Promise.all(ids.map(async (id) => {
    try { return unwrap(await usersService.getById(id)) as User } catch { return stub(id) }
  }))
}

export async function audienceFromScheduled(doc: ScheduledNotificationFull): Promise<Audience> {
  const id = doc.target_id ? String(doc.target_id) : ''
  switch (doc.target_type) {
    case 'users': return { ...EMPTY_AUDIENCE, target: 'specific', users: await loadUsers((doc.user_ids || []).map(String)) }
    case 'session': {
      const s = await liveSessionsService.getById(id).catch(() => null)
      return { ...EMPTY_AUDIENCE, target: 'session', sessionId: id, names: { session: s?.data?.title } }
    }
    case 'subject': {
      const list = await subjectsService.getSubjects({ limit: 100 }).catch(() => null)
      return { ...EMPTY_AUDIENCE, target: 'subject', subjectId: id, names: { subject: list?.data?.entities.find((s) => s._id === id)?.name } }
    }
    case 'package': {
      const p = await packagesService.getById(id).catch(() => null)
      return { ...EMPTY_AUDIENCE, target: 'subject', subjectScope: 'package', packageId: id, subjectId: refId(p?.data?.subject_id), names: { subject: refName(p?.data?.subject_id), package: p?.data?.name } }
    }
    case 'series': {
      const s = await seriesService.getById(id).catch(() => null)
      const pkgId = refId(s?.data?.package_id)
      const p = pkgId ? await packagesService.getById(pkgId).catch(() => null) : null
      return { ...EMPTY_AUDIENCE, target: 'subject', subjectScope: 'series', seriesId: id, packageId: pkgId, subjectId: refId(p?.data?.subject_id), names: { subject: refName(p?.data?.subject_id), package: p?.data?.name, series: s?.data?.name } }
    }
    default: return EMPTY_AUDIENCE
  }
}

/** Loads a scheduled send once, for the composer. */
export function useScheduledDraft(editId: string | null, channel: Channel, load: (id: string) => Promise<ScheduledNotificationFull>, apply: (doc: ScheduledNotificationFull, audience: Audience) => Promise<void> | void) {
  const [state, setState] = useState<{ loading: boolean; error: string | null; doc: ScheduledNotificationFull | null }>({ loading: !!editId, error: null, doc: null })
  useEffect(() => {
    if (!editId) { setState({ loading: false, error: null, doc: null }); return }
    let alive = true
    setState({ loading: true, error: null, doc: null })
    load(editId).then(async (doc) => {
      if (!alive) return
      if (doc.channel !== channel) throw new Error('This scheduled message belongs to another channel.')
      if (doc.status !== 'pending') throw new Error('This scheduled message was already sent, cancelled or failed, so it cannot be edited.')
      const audience = await audienceFromScheduled(doc)
      if (!alive) return
      await apply(doc, audience)
      setState({ loading: false, error: null, doc })
    }).catch((err: Error) => { if (alive) setState({ loading: false, error: err.message || 'The scheduled message could not be loaded.', doc: null }) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, channel])
  return state
}

export const useExcludedIds = (users: User[]) => useMemo(() => users.map((u) => u._id), [users])
