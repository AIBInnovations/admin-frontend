import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { apiErrorMessage } from '@/components/common/detail'
import { liveSessionsService, type LiveSession, type LiveSessionFormData } from '@/services/liveSessions.service'
import {
  EditorPage, EditorSection, EditorSkeleton, RecordError, focusFirstInvalid, useEditorExit, useRecord, useStaleCheck,
} from '@/components/forms/editor/EditorPage'
import { Field, Note, SelectControl, SwitchRow, TextInput, UnitInput } from '@/components/forms/editor/fields'
import { EVERYONE, RefPicker, VisibilityFields, loadFaculty, loadSubjects, useOptions, visibilityError, visibilityPayload, type VisibilityValue } from '@/components/forms/editor/pickers'
import { ImageField, NO_IMAGE, type ImageValue } from '@/components/forms/editor/ImageField'
import { fromIstInputs, istSpan, minutesLabel, sameMinute, toIstInputs } from '@/components/forms/editor/ist'
import { AccessFields } from '@/components/sessions/AccessFields'
import { modeOf, packageIdsOf, type AccessMode, type GatedSession } from '@/components/sessions/sessionAccess'
import { WeeklyRepeatFields, asRepeat, type RepeatValues } from '@/components/sessions/WeeklyRepeatFields'
import {
  MAX_SESSION_MINUTES, busyIntervals, currentOrNext, dayString, istParts, listClasses, overlaps, parseDay, repeatProblems,
} from '@/components/sessions/weeklySchedule'

interface SessionFormValues {
  title: string
  description: string
  subject_id: string
  faculty_id: string
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  platform: 'zoom' | 'agora' | 'teams' | 'other'
  enrollment_mode: 'open' | 'enrollment_required' | 'disabled'
  capacity_mode: 'limited' | 'unlimited'
  max_attendees: number | null
  is_free: boolean
  price: number | null
  publish_status: 'draft' | 'published'
  /** Who can join (package subscriptions); "Visible To" only decides who sees it. */
  access_mode: AccessMode
  access_package_ids: string[]
  /** Weekly series: one session, one registration, one Zoom meeting, a class every chosen weekday. */
  repeat_weekly: boolean
  repeat: RepeatValues
}

const NO_REPEAT: RepeatValues = { days: [], start_time: '', end_time: '', overtime_minutes: 0, starts_on: '', ends_on: '' }
const REPEAT_FIELD: Record<keyof RepeatValues, string> = {
  days: 'repeat.days', start_time: 'repeat.start_time', end_time: 'repeat.end_time', overtime_minutes: 'repeat.overtime_minutes', starts_on: 'repeat.starts_on', ends_on: 'repeat.ends_on',
}

// The base shape accepts anything, so every problem is reported in one go.
// Lengths follow the API's own rules.
const schemaFor = (mode: 'create' | 'edit') => z.custom<SessionFormValues>().superRefine((d, ctx) => {
  const fail = (path: keyof SessionFormValues, message: string) => ctx.addIssue({ code: 'custom', message, path: [path] })
  const title = d.title.trim()
  if (title.length < 5) fail('title', title ? 'Title must be at least 5 characters' : 'Title is required')
  if (title.length > 200) fail('title', 'Keep the title under 200 characters')
  if (mode === 'create' && !d.description.trim()) fail('description', 'Description is required')
  if (d.description.trim().length > 2000) fail('description', 'Keep the description under 2000 characters')
  if (!d.subject_id) fail('subject_id', 'Subject is required')
  if (d.repeat_weekly) {
    // A weekly series: the class time and dates, checked field by field
    for (const [k, message] of Object.entries(repeatProblems(asRepeat(d.repeat)))) {
      ctx.addIssue({ code: 'custom', message, path: REPEAT_FIELD[k as keyof RepeatValues].split('.') })
    }
  } else {
    if (!d.start_date) fail('start_date', 'Start date is required')
    if (!d.start_time) fail('start_time', 'Start time is required')
    if (!d.end_date) fail('end_date', 'End date is required')
    if (!d.end_time) fail('end_time', 'End time is required')
    const start = fromIstInputs(d.start_date, d.start_time)
    const end = fromIstInputs(d.end_date, d.end_time)
    if (start && end && end <= start) fail('end_time', 'End date/time must be after start date/time')
    // The same 12-hour rule the server applies (SESSION_TOO_LONG)
    else if (start && end && (end.getTime() - start.getTime()) / 60000 > MAX_SESSION_MINUTES) {
      fail('end_time', 'A session can be at most 12 hours. For a class every week, turn on Repeats weekly.')
    }
  }
  if (d.capacity_mode === 'limited') {
    if (d.max_attendees == null || Number.isNaN(d.max_attendees)) fail('max_attendees', 'Max attendees required for limited capacity')
    else if (!Number.isInteger(d.max_attendees) || d.max_attendees < 1) fail('max_attendees', 'Enter a whole number, 1 or more')
  }
  if (d.access_mode === 'subscribers_free' && !(d.price && d.price > 0)) {
    fail('price', 'Set a price above ₹0. Everyone who is not a subscriber pays this price.')
  } else if (!d.is_free && !(d.price && d.price > 0)) fail('price', 'Price is required for paid sessions')
  if (d.access_mode !== 'everyone' && d.access_package_ids.length === 0) fail('access_package_ids', 'Choose at least one package whose subscribers can join')
})

const BLANK: SessionFormValues = {
  title: '', description: '', subject_id: '', faculty_id: '',
  start_date: '', start_time: '', end_date: '', end_time: '',
  platform: 'zoom', enrollment_mode: 'enrollment_required',
  capacity_mode: 'limited', max_attendees: 100,
  is_free: false, price: 299, publish_status: 'draft',
  access_mode: 'everyone', access_package_ids: [],
  repeat_weekly: false, repeat: NO_REPEAT,
}

const refId = (ref: { _id: string } | string | null | undefined) => (ref && typeof ref === 'object' ? ref._id : ref || '')

function toValues(s: LiveSession): SessionFormValues {
  const start = toIstInputs(s.scheduled_start_time)
  const end = toIstInputs(s.scheduled_end_time)
  return {
    title: s.title, description: s.description || '', subject_id: refId(s.subject_id), faculty_id: refId(s.faculty_id),
    start_date: start.date, start_time: start.time, end_date: end.date, end_time: end.time,
    platform: s.platform, enrollment_mode: s.enrollment_mode, capacity_mode: s.capacity_mode,
    max_attendees: s.max_attendees, is_free: s.is_free, price: s.is_free ? null : s.price,
    publish_status: s.publish_status || 'draft',
    access_mode: modeOf(s as GatedSession), access_package_ids: packageIdsOf(s as GatedSession),
    repeat_weekly: !!s.repeat?.weekly,
    repeat: s.repeat?.weekly
      ? { days: [...s.repeat.days], start_time: s.repeat.start_time, end_time: s.repeat.end_time, overtime_minutes: s.repeat.overtime_minutes ?? 0, starts_on: s.repeat.starts_on, ends_on: s.repeat.ends_on }
      : NO_REPEAT,
  }
}
const toVisibility = (s: LiveSession): VisibilityValue => ({ to: s.visible_to || 'all', subjects: s.visible_to_subjects || [], packages: s.visible_to_packages || [] })
const fingerprint = (s: LiveSession) => JSON.stringify([toValues(s), toVisibility(s), s.thumbnail_url])
const asNumber = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))

export function SessionEditorPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const mode = sessionId ? 'edit' : 'create'
  const { record: session, loading, error, reload, setRecord } = useRecord(sessionId, (id) => liveSessionsService.getById(id))

  if (mode === 'edit' && loading && !session) return <EditorSkeleton />
  if (mode === 'edit' && !session) {
    return <RecordError status={error?.status ?? null} message={error?.message ?? ''} noun="session" back={{ label: 'Back to live sessions', href: '/sessions' }} onRetry={reload} />
  }
  return <SessionForm key={sessionId ?? 'new'} mode={mode} session={session} onReplace={setRecord} />
}

function SessionForm({ mode, session, onReplace }: { mode: 'create' | 'edit'; session: LiveSession | null; onReplace: (s: LiveSession) => void }) {
  const opened = useRef(session)
  const [visibility, setVisibility] = useState<VisibilityValue>(session ? toVisibility(session) : EVERYONE)
  const [thumbnail, setThumbnail] = useState<ImageValue>(session ? { file: null, url: session.thumbnail_url, key: session.thumbnail_s3_key } : NO_IMAGE)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [tried, setTried] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting, isDirty } } = useForm<SessionFormValues>({
    resolver: zodResolver(schemaFor(mode)) as never,
    defaultValues: session ? toValues(session) : BLANK,
    shouldFocusError: false,
  })

  const startVisibility = session ? toVisibility(session) : EVERYONE
  const startThumb = session?.thumbnail_url ?? null
  const dirty = isDirty || !!thumbnail.file || thumbnail.url !== startThumb || JSON.stringify(visibility) !== JSON.stringify(startVisibility)
  const leave = useEditorExit(dirty)
  const stale = useStaleCheck<LiveSession>(fingerprint)

  const subjects = useOptions(loadSubjects(false))
  const faculty = useOptions(loadFaculty)
  const v = watch()
  const weekly = v.repeat_weekly
  const classes = useMemo(() => (weekly ? listClasses(asRepeat(v.repeat)) : []), [weekly, v.repeat])
  const start = fromIstInputs(v.start_date, v.start_time)
  const end = fromIstInputs(v.end_date, v.end_time)
  const minutes = start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0
  const tooLong = !weekly && minutes > MAX_SESSION_MINUTES

  // Most sessions end on the day they start
  useEffect(() => {
    if (v.start_date && !v.end_date) setValue('end_date', v.start_date, { shouldDirty: true })
  }, [v.start_date, v.end_date, setValue])

  // Links such as the dashboard alert (#schedule) and "Who can join > Change" (#who-can-join)
  // open the editor on that section. The form renders after the record loads, so scroll here.
  const { hash } = useLocation()
  useEffect(() => {
    const id = hash.replace(/^#/, '')
    if (!id) return
    const frame = requestAnimationFrame(() => document.getElementById(decodeURIComponent(id))?.scrollIntoView({ block: 'start' }))
    return () => cancelAnimationFrame(frame)
  }, [hash])

  // Sessions that could clash with the chosen time
  const [others, setOthers] = useState<LiveSession[]>([])
  useEffect(() => {
    let alive = true
    Promise.all(['scheduled', 'live'].map((status) => liveSessionsService.getAll({ page: 1, limit: 200, status })))
      .then((all) => { if (alive) setOthers(all.flatMap((r) => r.data?.entities ?? [])) })
      .catch(() => { /* the clash check is a courtesy; saving does not depend on it */ })
    return () => { alive = false }
  }, [])
  // A weekly series is busy only during its classes, never across its whole span
  const clashes = useMemo(() => {
    const mine: Array<[number, number]> = weekly
      ? classes.map((c) => [c.start.getTime(), c.end.getTime()])
      : start && end && end > start ? [[start.getTime(), end.getTime()]] : []
    if (!mine.length) return []
    return others.filter((o) => o._id !== session?._id && overlaps(mine, busyIntervals(o)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [others, weekly, classes, v.start_date, v.start_time, v.end_date, v.end_time, session?._id])

  /** Turning the repeat on fills it from the one-off times; turning it off fills those from the next class. */
  const setWeekly = (on: boolean) => {
    if (on) {
      const r = v.repeat
      if (!r.days.length && !r.start_time && !r.starts_on) {
        const from = fromIstInputs(v.start_date, v.start_time)
        const startsOn = v.start_date
        const endsOn = v.end_date && parseDay(v.end_date)! > parseDay(v.start_date)! ? v.end_date : startsOn ? dayString(parseDay(startsOn)! + 56) : ''
        setValue('repeat', {
          days: from ? [istParts(from).weekday] : [],
          start_time: v.start_time,
          end_time: v.end_time,
          overtime_minutes: r.overtime_minutes ?? 0,
          starts_on: startsOn,
          ends_on: endsOn,
        }, { shouldDirty: true })
      }
    } else {
      const cls = currentOrNext(asRepeat(v.repeat)) ?? listClasses(asRepeat(v.repeat))[0]
      if (cls) {
        const a = toIstInputs(cls.start)
        const b = toIstInputs(cls.end)
        setValue('start_date', a.date, { shouldDirty: true })
        setValue('start_time', a.time, { shouldDirty: true })
        setValue('end_date', b.date, { shouldDirty: true })
        setValue('end_time', b.time, { shouldDirty: true })
      }
    }
    setValue('repeat_weekly', on, { shouldDirty: true, shouldValidate: tried })
  }
  const setRepeat = (patch: Partial<RepeatValues>) => setValue('repeat', { ...v.repeat, ...patch }, { shouldDirty: true, shouldValidate: tried })
  const repeatErrors = (errors.repeat ?? {}) as Partial<Record<keyof RepeatValues, { message?: string }>>

  const visError = tried ? visibilityError(visibility) : undefined
  const problems = Object.keys(errors).length + (visError ? 1 : 0)
  const busy = isSubmitting
  const touched = !session || v.start_date !== toValues(session).start_date || v.start_time !== toValues(session).start_time

  const onInvalid = () => { setTried(true); setFailure(null); focusFirstInvalid(formRef.current) }

  const save = async (data: SessionFormValues) => {
    setTried(true)
    setFailure(null)
    if (visibilityError(visibility)) { focusFirstInvalid(formRef.current); return }

    if (mode === 'edit' && session) {
      const { answer, latest } = await stale.check(opened.current, () => liveSessionsService.getById(session._id))
      if (answer === 'keep') return
      if (answer === 'reload' && latest) {
        opened.current = latest
        onReplace(latest)
        reset(toValues(latest))
        setVisibility(toVisibility(latest))
        setThumbnail({ file: null, url: latest.thumbnail_url, key: latest.thumbnail_s3_key })
        return
      }
    }

    let image = thumbnail
    if (thumbnail.file) {
      setUploadError(null)
      setProgress(0)
      try {
        const up = await liveSessionsService.uploadThumbnail(thumbnail.file, setProgress)
        // Kept, so a failed save does not upload the same picture again
        image = { file: null, url: up.thumbnailUrl, key: up.s3Key }
        setThumbnail(image)
      } catch (err) {
        setUploadError(`The thumbnail was not uploaded: ${apiErrorMessage(err, 'the upload failed')} Nothing was saved. Save again to retry.`)
        focusFirstInvalid(formRef.current)
        return
      } finally {
        setProgress(null)
      }
    }

    // A weekly series: the server derives the stored times from the repeat;
    // the first class start and last class end are sent too.
    const repeat = data.repeat_weekly ? asRepeat(data.repeat) : null
    const series = repeat ? listClasses(repeat) : []
    const from = repeat ? series[0].start : fromIstInputs(data.start_date, data.start_time)!
    const until = repeat ? series[series.length - 1].end : fromIstInputs(data.end_date, data.end_time)!
    const payload: LiveSessionFormData = {
      title: data.title.trim(),
      description: data.description.trim(),
      subject_id: data.subject_id,
      faculty_id: data.faculty_id || null,
      // Untouched times keep their stored seconds
      scheduled_start_time: session && sameMinute(session.scheduled_start_time, from) ? session.scheduled_start_time : from.toISOString(),
      scheduled_end_time: session && sameMinute(session.scheduled_end_time, until) ? session.scheduled_end_time : until.toISOString(),
      repeat,
      platform: data.platform,
      enrollment_mode: data.enrollment_mode,
      capacity_mode: data.capacity_mode,
      max_attendees: data.capacity_mode === 'limited' ? data.max_attendees ?? undefined : undefined,
      is_free: data.is_free,
      price: data.is_free ? 0 : data.price ?? undefined,
      allow_waitlist: true,
      guaranteed_seats_for_paid: true,
      // Removing a saved thumbnail sends null, which clears it
      thumbnail_url: image.url ?? (mode === 'edit' && startThumb ? null : undefined),
      thumbnail_s3_key: image.key ?? (mode === 'edit' && startThumb ? null : undefined),
      ...visibilityPayload(visibility),
      publish_status: data.publish_status,
    }
    // Who can join: additive fields the session API takes
    const body = {
      ...payload,
      access_mode: data.access_mode,
      access_package_ids: data.access_mode === 'everyone' ? [] : data.access_package_ids,
      ...(data.access_mode === 'subscribers_free' ? { is_free: false, price: data.price ?? undefined } : {}),
    }
    try {
      const res = mode === 'create' ? await liveSessionsService.create(body) : await liveSessionsService.update(session!._id, body)
      if (!res.success) throw new Error(res.message || 'Failed to save session')
      toast.success(mode === 'create' ? 'Session scheduled successfully' : 'Session updated successfully')
      const id = res.data?._id ?? session?._id
      leave(id ? `/sessions/${id}` : '/sessions')
    } catch (err) {
      setFailure(apiErrorMessage(err, mode === 'create' ? 'The session could not be scheduled. Please try again.' : 'The session could not be updated. Please try again.'))
    }
  }

  const facultyName = faculty.options.find((f) => f.id === v.faculty_id)

  return (
    <>
      <EditorPage
        title={mode === 'create' ? 'Schedule Live Session' : 'Edit Live Session'}
        description={mode === 'create' ? 'Create a new live session for students.' : 'Update the session details below.'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Live Sessions', href: '/sessions' },
          ...(session ? [{ label: session.title, href: `/sessions/${session._id}` }] : []),
          { label: mode === 'create' ? 'Schedule Session' : 'Edit' },
        ]}
        cancelHref={session ? `/sessions/${session._id}` : '/sessions'}
        saveLabel={mode === 'create' ? 'Schedule Session' : 'Update Session'}
        savingLabel={progress !== null ? 'Uploading...' : mode === 'create' ? 'Scheduling...' : 'Updating...'}
        saving={busy}
        dirty={dirty}
        problems={problems}
        failure={failure}
        onSubmit={handleSubmit(save, onInvalid)}
      >
        <div ref={formRef} className="space-y-6">
          {session && (session.status === 'completed' || session.status === 'cancelled') && (
            <Note tone="warning">This session is {session.status}. Changing its details or schedule does not reopen it.</Note>
          )}
          {(session?.effective_status ?? session?.status) === 'live' && <Note tone="warning">This session is live now. Title and time changes are sent to Zoom as soon as you save.</Note>}
          {session?.repeat?.weekly && (session.enrollment_count || 0) > 0 && (
            <Note>
              {session.enrollment_count === 1 ? '1 student is' : `${session.enrollment_count} students are`} registered for this series. They stay registered, and purchases are kept, when you change the days, times or dates.
            </Note>
          )}

          <EditorSection id="basics" title="Basics" description="What students see in the app.">
            <Field id="title" label="Title" required error={errors.title?.message} counter={{ value: v.title.length, max: 200 }}>
              {(c) => <TextInput {...c} placeholder="e.g., Upper Limb Anatomy" disabled={busy} {...register('title')} />}
            </Field>
            <Field id="description" label="Description" required={mode === 'create'} error={errors.description?.message} counter={{ value: v.description.length, max: 2000 }}>
              {(c) => <Textarea {...c} rows={4} placeholder="Brief description..." disabled={busy} className="bg-card aria-invalid:border-danger" {...register('description')} />}
            </Field>
            <ImageField
              label="Thumbnail / Banner"
              value={thumbnail}
              onChange={(x) => { setThumbnail(x); setUploadError(null) }}
              aspect={16 / 9}
              uploadLabel="Upload thumbnail"
              cropTitle="Crop Thumbnail"
              cropDescription="Adjust the crop area for the session thumbnail (16:9 ratio)."
              progress={progress}
              error={uploadError ?? undefined}
              disabled={busy}
            />
            {mode === 'edit' && startThumb && !thumbnail.url && !thumbnail.file && (
              <p className="text-xs text-muted-foreground">The thumbnail is removed when you save.</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="subject_id" label="Subject" required error={errors.subject_id?.message}>
                {(c) => (
                  <Controller name="subject_id" control={control} render={({ field }) => (
                    <RefPicker control={c} value={field.value} onChange={field.onChange} list={subjects} placeholder="Select subject" emptyText="No subjects found." missingLabel="Deleted subject" disabled={busy} />
                  )} />
                )}
              </Field>
              <Field id="faculty_id" label="Faculty" hint={facultyName?.sub ? `Teaches ${facultyName.sub}` : undefined}>
                {(c) => (
                  <Controller name="faculty_id" control={control} render={({ field }) => (
                    <RefPicker control={c} value={field.value} onChange={field.onChange} list={faculty} noneLabel="No faculty" emptyText="No faculty found." missingLabel="Deleted faculty" disabled={busy} />
                  )} />
                )}
              </Field>
            </div>
          </EditorSection>

          <EditorSection id="schedule" title="Schedule" description="All times are India time (IST).">
            <Controller name="repeat_weekly" control={control} render={({ field }) => (
              <SwitchRow
                id="repeat_weekly"
                label="Repeats weekly"
                description={field.value
                  ? 'One session with one registration, one Zoom meeting and one access rule. Students see the next class.'
                  : 'Turn on for a class that happens every week, for example every Wednesday evening.'}
                checked={field.value}
                onChange={setWeekly}
                disabled={busy}
              />
            )} />
            {weekly ? (
              <WeeklyRepeatFields
                value={v.repeat}
                onChange={setRepeat}
                disabled={busy}
                errors={{
                  days: repeatErrors.days?.message,
                  start_time: repeatErrors.start_time?.message,
                  end_time: repeatErrors.end_time?.message,
                  overtime_minutes: repeatErrors.overtime_minutes?.message,
                  starts_on: repeatErrors.starts_on?.message,
                  ends_on: repeatErrors.ends_on?.message,
                }}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="start_date" label="Start Date" required error={errors.start_date?.message}>
                  {(c) => <TextInput {...c} type="date" disabled={busy} {...register('start_date')} />}
                </Field>
                <Field id="start_time" label="Start Time" required error={errors.start_time?.message}>
                  {(c) => <TextInput {...c} type="time" disabled={busy} {...register('start_time')} />}
                </Field>
                <Field id="end_date" label="End Date" required error={errors.end_date?.message}>
                  {(c) => <TextInput {...c} type="date" min={v.start_date || undefined} disabled={busy} {...register('end_date')} />}
                </Field>
                <Field id="end_time" label="End Time" required error={tooLong ? undefined : errors.end_time?.message}>
                  {/* Over 12 hours the message is the red note below, but End Time must still read as
                      invalid, or a refused save (and "1 field needs attention") has nothing to move to. */}
                  {(c) => <TextInput {...c} {...(tooLong && errors.end_time ? { 'aria-invalid': true, 'aria-describedby': 'session-too-long' } : {})} type="time" disabled={busy} {...register('end_time')} />}
                </Field>
              </div>
            )}
            <div aria-live="polite" className="space-y-2">
              {!weekly && minutes > 0 && <p className="text-[13px] text-muted-foreground"><span className="font-medium text-foreground">{minutesLabel(minutes)}</span>, {istSpan(start, end)} IST</p>}
              {tooLong && (
                <Note tone="danger">
                  <p id="session-too-long">A session can be at most 12 hours; this one is {minutesLabel(minutes)}. For a class that happens every week, use Repeats weekly: one session, a class each week.</p>
                  <button type="button" className="mt-1 font-medium underline underline-offset-2" onClick={() => setWeekly(true)} disabled={busy}>Use Repeats weekly</button>
                </Note>
              )}
              {!weekly && start && touched && start.getTime() < Date.now() && <Note tone="warning">This start time has already passed. Students will not see it as upcoming.</Note>}
              {clashes.length > 0 && (
                <Note tone="warning">
                  <p>{clashes.length === 1 ? 'Another session runs at this time:' : `${clashes.length} other sessions run at this time:`}</p>
                  <ul className="mt-1 list-disc pl-5">
                    {clashes.slice(0, 4).map((o) => (
                      <li key={o._id}>
                        {o.title}, {o.repeat?.weekly && o.schedule_label ? o.schedule_label : istSpan(o.scheduled_start_time, o.scheduled_end_time)}
                        {v.faculty_id && refId(o.faculty_id) === v.faculty_id ? ', same faculty' : ''}
                      </li>
                    ))}
                    {clashes.length > 4 && <li>and {clashes.length - 4} more</li>}
                  </ul>
                </Note>
              )}
            </div>
          </EditorSection>

          <EditorSection id="enrollment" title="Enrollment" description="Where it runs and how many can join.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="platform" label="Platform" hint={mode === 'create' && v.platform === 'zoom' ? 'A Zoom meeting is created when you schedule.' : undefined}>
                {(c) => (
                  <Controller name="platform" control={control} render={({ field }) => (
                    <SelectControl control={c} value={field.value} onChange={field.onChange} disabled={busy} choices={[{ value: 'zoom', label: 'Zoom' }, { value: 'agora', label: 'Agora' }, { value: 'teams', label: 'Teams' }, { value: 'other', label: 'Other' }]} />
                  )} />
                )}
              </Field>
              <Field id="enrollment_mode" label="Enrollment Mode">
                {(c) => (
                  <Controller name="enrollment_mode" control={control} render={({ field }) => (
                    <SelectControl control={c} value={field.value} onChange={field.onChange} disabled={busy} choices={[{ value: 'open', label: 'Open' }, { value: 'enrollment_required', label: 'Enrollment Required' }, { value: 'disabled', label: 'Disabled' }]} />
                  )} />
                )}
              </Field>
              <Field id="capacity_mode" label="Capacity Mode">
                {(c) => (
                  <Controller name="capacity_mode" control={control} render={({ field }) => (
                    <SelectControl control={c} value={field.value} onChange={field.onChange} disabled={busy} choices={[{ value: 'limited', label: 'Limited' }, { value: 'unlimited', label: 'Unlimited' }]} />
                  )} />
                )}
              </Field>
              {v.capacity_mode === 'limited' && (
                <Field id="max_attendees" label="Max Attendees" required error={errors.max_attendees?.message}>
                  {(c) => <UnitInput {...c} suffix="seats" min={1} step={1} inputMode="numeric" disabled={busy} {...register('max_attendees', { setValueAs: asNumber })} />}
                </Field>
              )}
            </div>
            {v.enrollment_mode === 'disabled' && <Note>Nobody can join while enrollment is disabled.</Note>}
            {session && v.capacity_mode === 'limited' && v.max_attendees != null && v.max_attendees < (session.enrollment_count || 0) && (
              <Note tone="warning">{session.enrollment_count} students are already enrolled. They keep their seats; new students go to the waitlist.</Note>
            )}
          </EditorSection>

          <EditorSection id="access" title="Access" description="Who sees it in the app.">
            <VisibilityFields noun="Session" value={visibility} onChange={setVisibility} error={visError} disabled={busy} />
          </EditorSection>

          <EditorSection id="who-can-join" title="Who can join" description="Who may register and join. Visible To above only decides who sees it.">
            {(session as GatedSession | null)?.workshop_id ? (
              <Note>This is a workshop day. Who can join follows the workshop.</Note>
            ) : (
              <AccessFields
                mode={v.access_mode}
                packageIds={v.access_package_ids}
                onMode={(m) => {
                  setValue('access_mode', m, { shouldDirty: true, shouldValidate: tried })
                  // Others pay: the session is a paid one for them
                  if (m === 'subscribers_free') setValue('is_free', false, { shouldDirty: true })
                }}
                onPackages={(ids) => setValue('access_package_ids', ids, { shouldDirty: true, shouldValidate: tried })}
                price={v.price}
                isFree={v.is_free}
                packagesError={errors.access_package_ids?.message}
                disabled={busy}
              />
            )}
            {session && v.access_mode !== 'everyone' && modeOf(session as GatedSession) === 'everyone' && (session.enrollment_count || 0) > 0 && (
              <Note tone="warning">
                {session.enrollment_count === 1 ? '1 student is' : `${session.enrollment_count} students are`} already registered. Registrations stay;
                anyone who is not a subscriber (and has not paid) is refused when they try to join.
              </Note>
            )}
          </EditorSection>

          <EditorSection id="pricing" title="Pricing">
            <Controller name="is_free" control={control} render={({ field }) => (
              <SwitchRow
                id="is_free"
                label="Free Session"
                description={v.access_mode === 'subscribers_free'
                  ? 'Off: everyone who is not a subscriber pays the price below'
                  : field.value ? 'No charge for attendees' : 'Attendees must pay to join'}
                checked={field.value}
                onChange={(c) => { field.onChange(c); if (c) setValue('price', null, { shouldDirty: true }) }}
                disabled={busy || v.access_mode === 'subscribers_free'}
              />
            )} />
            {!v.is_free && (
              <Field id="price" label={v.access_mode === 'subscribers_free' ? 'Price for non-subscribers (INR)' : 'Price (INR)'} required error={errors.price?.message} className="max-w-[320px]">
                {(c) => <UnitInput {...c} prefix="₹" min={1} step="0.01" placeholder="e.g., 299" disabled={busy} {...register('price', { setValueAs: asNumber })} />}
              </Field>
            )}
            {v.access_mode === 'subscribers_only' && (
              <Note>Nobody can buy a seat while only package subscribers can join. The price is kept for when you switch back to Everyone.</Note>
            )}
          </EditorSection>

          <EditorSection id="publishing" title="Publishing">
            <Field id="publish_status" label="Publish Status" hint="Draft content is only visible to admins. Publish when ready for users." className="max-w-[320px]">
              {(c) => (
                <Controller name="publish_status" control={control} render={({ field }) => (
                  <SelectControl control={c} value={field.value} onChange={field.onChange} disabled={busy} choices={[{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }]} />
                )} />
              )}
            </Field>
          </EditorSection>
        </div>
      </EditorPage>
      {stale.dock}
    </>
  )
}
