import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileText, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/common/FileUpload'
import { apiErrorMessage } from '@/components/common/detail'
import { workshopsService, type Workshop, type WorkshopFormData } from '@/services/workshops.service'
import {
  EditorPage, EditorSection, EditorSkeleton, RecordError, focusFirstInvalid, useEditorExit, useRecord, useStaleCheck,
} from '@/components/forms/editor/EditorPage'
import { Field, Note, SelectControl, SwitchRow, TextInput, UnitInput } from '@/components/forms/editor/fields'
import { EVERYONE, RefPicker, VisibilityFields, loadFaculty, loadSubjects, useOptions, visibilityError, visibilityPayload, type VisibilityValue } from '@/components/forms/editor/pickers'
import { ImageField, NO_IMAGE, type ImageValue } from '@/components/forms/editor/ImageField'
import { fromIstInputs, sameMinute } from '@/components/forms/editor/ist'
import { DaySchedule } from '@/components/workshops/DaySchedule'
import { BLANK_WORKSHOP, dayEnd, dayStart, toWorkshopValues, workshopSchema, type WorkshopFormValues } from '@/components/workshops/workshopForm'

interface BrochureValue { file: File | null; url: string | null; key: string | null; filename: string | null }
const toBrochure = (w: Workshop | null): BrochureValue => ({ file: null, url: w?.brochure_url ?? null, key: w?.brochure_s3_key ?? null, filename: w?.brochure_filename ?? null })
const toVisibility = (w: Workshop): VisibilityValue => ({ to: w.visible_to || 'all', subjects: w.visible_to_subjects || [], packages: w.visible_to_packages || [] })
// Attendance and day status move on their own; they are not edits.
const fingerprint = (w: Workshop) => {
  const v = toWorkshopValues(w)
  return JSON.stringify([{ ...v, days: v.days.map((d) => ({ ...d, locked: false, status: null })) }, toVisibility(w), w.thumbnail_url, w.brochure_url])
}
const asNumber = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))

export function WorkshopEditorPage() {
  const { workshopId } = useParams<{ workshopId: string }>()
  const mode = workshopId ? 'edit' : 'create'
  const { record: workshop, loading, error, reload, setRecord } = useRecord(workshopId, (id) => workshopsService.getById(id))

  if (mode === 'edit' && loading && !workshop) return <EditorSkeleton />
  if (mode === 'edit' && !workshop) {
    return <RecordError status={error?.status ?? null} message={error?.message ?? ''} noun="workshop" back={{ label: 'Back to workshops', href: '/workshops' }} onRetry={reload} />
  }
  return <WorkshopForm key={workshopId ?? 'new'} mode={mode} workshop={workshop} onReplace={setRecord} />
}

function countErrors(errors: Record<string, unknown>): number {
  let n = 0
  for (const [key, value] of Object.entries(errors)) {
    if (key === 'days' && Array.isArray(value)) value.forEach((d) => { if (d) n += Object.keys(d).length })
    else n += 1
  }
  return n
}

function WorkshopForm({ mode, workshop, onReplace }: { mode: 'create' | 'edit'; workshop: Workshop | null; onReplace: (w: Workshop) => void }) {
  const opened = useRef(workshop)
  const formRef = useRef<HTMLDivElement>(null)
  const [visibility, setVisibility] = useState<VisibilityValue>(workshop ? toVisibility(workshop) : EVERYONE)
  const [thumbnail, setThumbnail] = useState<ImageValue>(workshop ? { file: null, url: workshop.thumbnail_url, key: workshop.thumbnail_s3_key } : NO_IMAGE)
  const [brochure, setBrochure] = useState<BrochureValue>(toBrochure(workshop))
  const [thumbProgress, setThumbProgress] = useState<number | null>(null)
  const [brochureProgress, setBrochureProgress] = useState<number | null>(null)
  const [thumbError, setThumbError] = useState<string | null>(null)
  const [brochureError, setBrochureError] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [tried, setTried] = useState(false)
  const [defaults] = useState<WorkshopFormValues>(() => (workshop ? toWorkshopValues(workshop) : BLANK_WORKSHOP()))

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting, isDirty } } = useForm<WorkshopFormValues>({
    resolver: zodResolver(workshopSchema) as never,
    defaultValues: defaults,
    shouldFocusError: false,
  })

  const startVisibility = workshop ? toVisibility(workshop) : EVERYONE
  const dirty = isDirty
    || !!thumbnail.file || thumbnail.url !== (workshop?.thumbnail_url ?? null)
    || !!brochure.file || brochure.url !== (workshop?.brochure_url ?? null)
    || JSON.stringify(visibility) !== JSON.stringify(startVisibility)
  const leave = useEditorExit(dirty)
  const stale = useStaleCheck<Workshop>(fingerprint)

  const subjects = useOptions(loadSubjects(false))
  const faculty = useOptions(loadFaculty)
  const v = watch()
  const busy = isSubmitting
  const uploading = thumbProgress !== null || brochureProgress !== null

  const visError = tried ? visibilityError(visibility) : undefined
  const problems = countErrors(errors as Record<string, unknown>) + (visError ? 1 : 0)
  const kept = new Set(v.days.map((d) => d.session_id).filter(Boolean))
  const dropped = (workshop?.days ?? []).filter((d) => !kept.has(d.session_id))
  const registered = workshop?.enrollment_count ?? 0

  const onInvalid = () => { setTried(true); setFailure(null); focusFirstInvalid(formRef.current) }

  const save = async (data: WorkshopFormValues) => {
    setTried(true)
    setFailure(null)
    if (visibilityError(visibility)) { focusFirstInvalid(formRef.current); return }

    if (mode === 'edit' && workshop) {
      const { answer, latest } = await stale.check(opened.current, () => workshopsService.getById(workshop._id))
      if (answer === 'keep') return
      if (answer === 'reload' && latest) {
        opened.current = latest
        onReplace(latest)
        reset(toWorkshopValues(latest))
        setVisibility(toVisibility(latest))
        setThumbnail({ file: null, url: latest.thumbnail_url, key: latest.thumbnail_s3_key })
        setBrochure(toBrochure(latest))
        return
      }
    }

    // Uploads are kept, so a failed save does not send the same file again.
    let image = thumbnail
    if (thumbnail.file) {
      setThumbError(null)
      setThumbProgress(0)
      try {
        const up = await workshopsService.uploadThumbnail(thumbnail.file, setThumbProgress)
        image = { file: null, url: up.thumbnailUrl, key: up.s3Key }
        setThumbnail(image)
      } catch (err) {
        setThumbError(`The thumbnail was not uploaded: ${apiErrorMessage(err, 'the upload failed.')} Nothing was saved. Save again to retry.`)
        focusFirstInvalid(formRef.current)
        return
      } finally {
        setThumbProgress(null)
      }
    }
    let pdf = brochure
    if (brochure.file) {
      setBrochureError(null)
      setBrochureProgress(0)
      try {
        const up = await workshopsService.uploadBrochure(brochure.file, setBrochureProgress)
        pdf = { file: null, url: up.brochureUrl, key: up.s3Key, filename: up.filename }
        setBrochure(pdf)
      } catch (err) {
        setBrochureError(`The brochure was not uploaded: ${apiErrorMessage(err, 'the upload failed.')} Nothing was saved. Save again to retry.`)
        focusFirstInvalid(formRef.current)
        return
      } finally {
        setBrochureProgress(null)
      }
    }

    const closes = data.registration_cutoff_mode === 'custom' ? fromIstInputs(data.registration_closes_date, data.registration_closes_time) : null
    const payload: WorkshopFormData = {
      title: data.title.trim(),
      description: data.description.trim(),
      subject_id: data.subject_id,
      // Headline faculty: everyone who teaches a day
      faculty_ids: [...new Set(data.days.map((d) => d.faculty_id).filter(Boolean))],
      days: data.days.map((d) => {
        // A day whose times were not touched keeps its stored timestamps, so
        // students are not told about a schedule change that did not happen.
        const stored = workshop?.days?.find((x) => x.session_id === d.session_id)
        const start = dayStart(d)!
        const end = dayEnd(d)!
        const same = stored && sameMinute(stored.scheduled_start_time, start) && sameMinute(stored.scheduled_end_time, end)
        return {
          session_id: d.session_id || null,
          title: d.title.trim(),
          description: d.description || '',
          faculty_id: d.faculty_id || null,
          scheduled_start_time: same ? stored.scheduled_start_time : start.toISOString(),
          scheduled_end_time: same ? stored.scheduled_end_time : end.toISOString(),
        }
      }),
      thumbnail_url: image.url,
      thumbnail_s3_key: image.key,
      brochure_url: pdf.url,
      brochure_s3_key: pdf.key,
      brochure_filename: pdf.filename,
      platform: data.platform,
      is_free: data.is_free,
      price: data.is_free ? 0 : data.price || 0,
      registration_closes_at: closes ? closes.toISOString() : null,
      enrollment_mode: data.enrollment_mode,
      capacity_mode: data.capacity_mode,
      max_seats: data.capacity_mode === 'limited' ? data.max_seats : null,
      allow_waitlist: data.allow_waitlist,
      guaranteed_seats_for_paid: true,
      ...visibilityPayload(visibility),
      certificate_enabled: data.certificate_enabled,
      certificate_min_days_attended: data.certificate_enabled ? data.certificate_min_days_attended : null,
      certificate_signatory_name: data.certificate_signatory_name || null,
      certificate_signatory_title: data.certificate_signatory_title || null,
      publish_status: data.publish_status,
    }
    try {
      const res = mode === 'create' ? await workshopsService.create(payload) : await workshopsService.update(workshop!._id, payload)
      if (!res.success) throw new Error(res.message || 'Failed to save workshop')
      toast.success(mode === 'create' ? 'Workshop created' : 'Workshop updated')
      const id = res.data?._id ?? workshop?._id
      leave(id ? `/workshops/${id}` : '/workshops')
    } catch (err) {
      setFailure(apiErrorMessage(err, mode === 'create' ? 'The workshop could not be created. Please try again.' : 'The workshop could not be updated. Please try again.'))
    }
  }

  return (
    <>
      <EditorPage
        title={mode === 'create' ? 'Create Workshop' : 'Edit Workshop'}
        description={mode === 'create'
          ? 'A workshop runs across multiple days. Each day gets its own Zoom meeting; one purchase covers them all.'
          : 'Update the workshop details and its day-by-day schedule.'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Workshops', href: '/workshops' },
          ...(workshop ? [{ label: workshop.title, href: `/workshops/${workshop._id}` }] : []),
          { label: mode === 'create' ? 'Create Workshop' : 'Edit' },
        ]}
        cancelHref={workshop ? `/workshops/${workshop._id}` : '/workshops'}
        saveLabel={mode === 'create' ? 'Create Workshop' : 'Update Workshop'}
        savingLabel={uploading ? 'Uploading...' : mode === 'create' ? 'Creating...' : 'Updating...'}
        saving={busy}
        dirty={dirty}
        problems={problems}
        failure={failure}
        onSubmit={handleSubmit(save, onInvalid)}
      >
        <div ref={formRef} className="space-y-6">
          {workshop && (workshop.status === 'completed' || workshop.status === 'cancelled') && (
            <Note tone="warning">This workshop is {workshop.status}. Changing its details or schedule does not reopen it.</Note>
          )}

          <EditorSection id="basics" title="Basics" description="What students see in the app and store.">
            <Field id="title" label="Title" required error={errors.title?.message} counter={{ value: v.title.length, max: 200 }}>
              {(c) => <TextInput {...c} placeholder="e.g., Advanced Laparoscopic Skills Workshop" disabled={busy} {...register('title')} />}
            </Field>
            <Field id="description" label="Description" required error={errors.description?.message} counter={{ value: v.description.length, max: 4000 }}>
              {(c) => <Textarea {...c} rows={4} placeholder="What the workshop covers, who it's for, prerequisites..." disabled={busy} className="bg-card aria-invalid:border-danger" {...register('description')} />}
            </Field>
            <ImageField
              label="Thumbnail / Banner"
              value={thumbnail}
              onChange={(x) => { setThumbnail(x); setThumbError(null) }}
              aspect={16 / 9}
              uploadLabel="Upload thumbnail"
              cropTitle="Crop Thumbnail"
              cropDescription="Adjust the crop area for the workshop thumbnail (16:9 ratio)."
              progress={thumbProgress}
              error={thumbError ?? undefined}
              disabled={busy}
            />
            <BrochureField value={brochure} onChange={(x) => { setBrochure(x); setBrochureError(null) }} error={brochureError} progress={brochureProgress} disabled={busy} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="subject_id" label="Subject" required error={errors.subject_id?.message}>
                {(c) => (
                  <Controller name="subject_id" control={control} render={({ field }) => (
                    <RefPicker control={c} value={field.value} onChange={field.onChange} list={subjects} placeholder="Select subject" emptyText="No subjects found." missingLabel="Deleted subject" disabled={busy} />
                  )} />
                )}
              </Field>
              <Field id="platform" label="Platform" hint="Zoom creates one meeting per day automatically.">
                {(c) => (
                  <Controller name="platform" control={control} render={({ field }) => (
                    <SelectControl control={c} value={field.value} onChange={field.onChange} disabled={busy} choices={[{ value: 'zoom', label: 'Zoom' }, { value: 'agora', label: 'Agora' }, { value: 'teams', label: 'Teams' }, { value: 'other', label: 'Other' }]} />
                  )} />
                )}
              </Field>
            </div>
          </EditorSection>

          <EditorSection id="schedule" title="Schedule" description="Each day, in India time (IST). Days can be added in any order; the numbers follow the dates.">
            <DaySchedule control={control} register={register} setValue={setValue} errors={errors} days={v.days} faculty={faculty} disabled={busy} />
            {dropped.length > 0 && (
              <Note tone="warning">
                Saving removes {dropped.length === 1 ? '1 day' : `${dropped.length} days`}: {dropped.map((d) => d.title).join(', ')}.
                {dropped.some((d) => d.zoom_meeting_id) ? ' Their Zoom meetings are deleted and registered students are told about the new schedule.' : ' Registered students are told about the new schedule.'}
              </Note>
            )}
          </EditorSection>

          <EditorSection id="pricing" title="Pricing">
            <Controller name="is_free" control={control} render={({ field }) => (
              <SwitchRow
                id="is_free"
                label="Free Workshop"
                description={field.value ? 'Students register at no charge' : 'Students pay once for all days'}
                checked={field.value}
                onChange={(c) => { field.onChange(c); if (c) setValue('price', null, { shouldDirty: true }) }}
                disabled={busy}
              />
            )} />
            {!v.is_free && (
              <Field id="price" label="Price for the whole workshop (INR)" required error={errors.price?.message} className="max-w-[320px]">
                {(c) => <UnitInput {...c} prefix="₹" min={1} step="0.01" placeholder="e.g., 4999" disabled={busy} {...register('price', { setValueAs: asNumber })} />}
              </Field>
            )}
          </EditorSection>

          <EditorSection id="registration" title="Registration" description="When it closes, and how many can join.">
            <Field
              id="registration_cutoff_mode"
              label="Registration closes"
              hint="A later cutoff lets students join mid-workshop and catch up on recordings. It cannot be after the last day ends."
            >
              {(c) => (
                <Controller name="registration_cutoff_mode" control={control} render={({ field }) => (
                  <SelectControl control={c} value={field.value} onChange={field.onChange} disabled={busy} choices={[{ value: 'first_day', label: 'When Day 1 starts' }, { value: 'custom', label: 'At a specific date & time' }]} />
                )} />
              )}
            </Field>
            {v.registration_cutoff_mode === 'custom' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="registration_closes_date" label="Cutoff date" required error={errors.registration_closes_date?.message}>
                  {(c) => <TextInput {...c} type="date" disabled={busy} {...register('registration_closes_date')} />}
                </Field>
                <Field id="registration_closes_time" label="Cutoff time" required>
                  {(c) => <TextInput {...c} type="time" disabled={busy} {...register('registration_closes_time')} />}
                </Field>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="capacity_mode" label="Capacity">
                {(c) => (
                  <Controller name="capacity_mode" control={control} render={({ field }) => (
                    <SelectControl control={c} value={field.value} onChange={field.onChange} disabled={busy} choices={[{ value: 'unlimited', label: 'Unlimited' }, { value: 'limited', label: 'Limited seats' }]} />
                  )} />
                )}
              </Field>
              {v.capacity_mode === 'limited' && (
                <Field id="max_seats" label="Seat limit" required error={errors.max_seats?.message}>
                  {(c) => <UnitInput {...c} suffix="seats" min={1} step={1} inputMode="numeric" disabled={busy} {...register('max_seats', { setValueAs: asNumber })} />}
                </Field>
              )}
            </div>
            {v.capacity_mode === 'limited' && v.max_seats != null && v.max_seats < registered && (
              <Note tone="warning">{registered} students are already registered. They keep their seats; new registrations go to the waitlist.</Note>
            )}
            {v.capacity_mode === 'limited' && (
              <Controller name="allow_waitlist" control={control} render={({ field }) => (
                <SwitchRow
                  id="allow_waitlist"
                  label="Waitlist"
                  description="When full, new registrations join a waitlist and are promoted automatically as seats free up."
                  checked={field.value}
                  onChange={field.onChange}
                  disabled={busy}
                />
              )} />
            )}
            <Field id="enrollment_mode" label="Registration Mode" hint='Paid workshops should keep "Registration required" so each payment maps to a seat.'>
              {(c) => (
                <Controller name="enrollment_mode" control={control} render={({ field }) => (
                  <SelectControl
                    control={c}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={busy}
                    choices={[
                      { value: 'enrollment_required', label: 'Registration required' },
                      { value: 'open', label: 'Open, anyone can join' },
                      { value: 'disabled', label: 'Closed, nobody can join' },
                    ]}
                  />
                )} />
              )}
            </Field>
          </EditorSection>

          <EditorSection id="certificate" title="Completion Certificate">
            <Controller name="certificate_enabled" control={control} render={({ field }) => (
              <SwitchRow
                id="certificate_enabled"
                label="Completion Certificate"
                description="Issue a PDF certificate once the workshop ends and attendance is met."
                checked={field.value}
                onChange={field.onChange}
                disabled={busy}
              />
            )} />
            {v.certificate_enabled && (
              <>
                <Field
                  id="certificate_min_days_attended"
                  label="Minimum days attended"
                  error={errors.certificate_min_days_attended?.message}
                  hint="Leave blank to require every day. Cancelled days never count against a student."
                  className="max-w-[320px]"
                >
                  {(c) => <UnitInput {...c} suffix="days" min={1} max={v.days.length || undefined} step={1} inputMode="numeric" placeholder={`All ${v.days.length} day${v.days.length === 1 ? '' : 's'}`} disabled={busy} {...register('certificate_min_days_attended', { setValueAs: asNumber })} />}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="certificate_signatory_name" label="Signatory name" error={errors.certificate_signatory_name?.message}>
                    {(c) => <TextInput {...c} placeholder="PGME Academic Office" disabled={busy} {...register('certificate_signatory_name')} />}
                  </Field>
                  <Field id="certificate_signatory_title" label="Signatory title" error={errors.certificate_signatory_title?.message}>
                    {(c) => <TextInput {...c} placeholder="Authorised Signatory" disabled={busy} {...register('certificate_signatory_title')} />}
                  </Field>
                </div>
              </>
            )}
          </EditorSection>

          <EditorSection id="access" title="Access" description="Who sees it in the app.">
            <VisibilityFields noun="Workshop" value={visibility} onChange={setVisibility} error={visError} disabled={busy} />
          </EditorSection>

          <EditorSection id="publishing" title="Publishing">
            <Field id="publish_status" label="Publish Status" hint="Draft workshops are admin-only. Publishing also publishes every day." className="max-w-[320px]">
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

/** A downloadable PDF, separate from the thumbnail: removing one leaves the other. */
function BrochureField({ value, onChange, error, progress, disabled }: { value: BrochureValue; onChange: (v: BrochureValue) => void; error: string | null; progress: number | null; disabled?: boolean }) {
  const shown = value.file || value.url
  return (
    <div className="space-y-1.5">
      <Label className="block text-[13px] font-medium" id="brochure-label">Brochure (PDF)</Label>
      <div role="group" aria-labelledby="brochure-label" aria-invalid={error ? true : undefined} tabIndex={error ? -1 : undefined} className="max-w-[420px] outline-none">
        {shown ? (
          <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
            <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              {value.file ? (
                <>
                  <p className="truncate text-sm font-medium">{value.file.name}</p>
                  <p className="text-xs text-muted-foreground">{(value.file.size / 1048576).toFixed(1)} MB, uploaded when you save</p>
                </>
              ) : (
                <>
                  <a href={value.url!} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-primary hover:underline">{value.filename || 'View current brochure'}</a>
                  <p className="text-xs text-muted-foreground">Current brochure. Remove it to upload a new one.</p>
                </>
              )}
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-danger hover:text-danger" aria-label="Remove brochure" disabled={disabled} onClick={() => onChange(value.file ? { ...value, file: null } : { file: null, url: null, key: null, filename: null })}><Trash2 /></Button>
          </div>
        ) : (
          <FileUpload
            accept={{ 'application/pdf': ['.pdf'] }}
            maxSize={25 * 1024 * 1024}
            maxFiles={1}
            value={[]}
            onChange={(files) => { if (files[0]) onChange({ ...value, file: files[0] }) }}
            disabled={disabled}
            label="Upload brochure"
            description="PDF only. Max 25MB. Shown to everyone, including before enrolling."
          />
        )}
      </div>
      {progress !== null && (
        <div className="max-w-[420px] space-y-1" role="status">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">Uploading brochure... {progress}%</p>
        </div>
      )}
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  )
}
