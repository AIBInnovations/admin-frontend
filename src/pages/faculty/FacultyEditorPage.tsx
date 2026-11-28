import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { FileUpload } from '@/components/common/FileUpload'
import { ImageCropper } from '@/components/common/ImageCropper'
import { apiErrorInfo, apiErrorMessage, DetailHeader, DetailSkeleton, ErrorState, Section } from '@/components/common/detail'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { SubjectMultiSelect, type SubjectOption } from '@/components/faculty/SubjectMultiSelect'
import { Faculty, FacultyFormData, facultyService, subjectsOf } from '@/services/faculty.service'
import { subjectsService } from '@/services/subjects.service'
import { QualificationsField } from './QualificationsField'
import { joinQualifications, splitQualifications } from './qualifications'

const number = (label: string) => z.string().trim().refine((v) => v === '' || (/^\d{1,4}$/.test(v)), `${label} must be a whole number, 0 or more`)

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  specialization: z.string().trim().max(100, 'Specialization must be at most 100 characters').refine((v) => v === '' || v.length >= 2, 'Specialization must be at least 2 characters'),
  display_order: number('Display order'),
  email: z.string().trim().refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter an email like name@example.com'),
  phone: z.string().trim().refine((v) => v === '' || /^\d{10}$/.test(v), 'Must be 10 digits'),
  bio: z.string().trim().max(2000, 'Bio must be at most 2000 characters'),
  qualifications: z.string().trim().max(500, 'Qualifications must be at most 500 characters'),
  experience_years: number('Experience'),
  is_active: z.boolean(),
})
type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = { name: '', specialization: '', display_order: '0', email: '', phone: '', bio: '', qualifications: '', experience_years: '', is_active: true }

function Field({ id, label, required, error, hint, children, className }: { id: string; label: string; required?: boolean; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}{required && <span className="text-danger" aria-hidden="true"> *</span>}</Label>
        {children}
        {error ? <p id={`${id}-error`} role="alert" className="text-sm text-danger">{error}</p> : hint && <p id={`${id}-hint`} className="text-[13px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  )
}

/** Add or edit a faculty member, as a page. */
export function FacultyEditorPage() {
  const { facultyId } = useParams<{ facultyId: string }>()
  const mode = facultyId ? 'edit' : 'create'
  const navigate = useNavigate()

  const [original, setOriginal] = useState<Faculty | null>(null)
  const [loading, setLoading] = useState(mode === 'edit')
  const [loadError, setLoadError] = useState<{ message: string; status?: number } | null>(null)
  const [attempt, setAttempt] = useState(0)

  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [subjectsFailed, setSubjectsFailed] = useState(false)
  const [initialSubjects, setInitialSubjects] = useState('')

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [photo, setPhoto] = useState<{ url: string | null; key: string | null }>({ url: null, key: null })
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [cropperFile, setCropperFile] = useState<File | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, reset, setValue, setError, watch, getValues, formState: { errors, isSubmitting, isDirty } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })
  const isActive = watch('is_active')
  // Edited as a list (QualificationsField), kept here as the text the API stores
  useEffect(() => { register('qualifications') }, [register])
  const qualificationsText = watch('qualifications')
  const qualificationItems = useMemo(() => splitQualifications(qualificationsText), [qualificationsText])
  const busy = isSubmitting || uploadProgress !== null

  useEffect(() => {
    let live = true
    subjectsService.getSubjects({ limit: 200, is_active: true, sort_by: 'display_order', sort_order: 'asc' })
      .then((res) => { if (live && res.success && res.data) setSubjectOptions(res.data.entities.map((s) => ({ _id: s._id, name: s.name, is_active: s.is_active }))) })
      .catch(() => { if (live) setSubjectsFailed(true) })
    return () => { live = false }
  }, [])

  useEffect(() => {
    if (mode !== 'edit' || !facultyId) return
    let live = true
    setLoading(true)
    setLoadError(null)
    facultyService.getById(facultyId)
      .then((res) => {
        if (!live) return
        if (!res.success || !res.data) throw new Error(res.message)
        const f = res.data
        setOriginal(f)
        setPhoto({ url: f.photo_url, key: f.photo_s3_key })
        // An older backend answers with subject_id only; its name then comes from the options
        const linked = f.subjects ? subjectsOf(f) : typeof f.subject_id === 'string' ? [{ _id: f.subject_id, name: 'Current subject' }] : subjectsOf(f)
        const chosen = linked.map((s) => ({ _id: s._id, name: s.name, is_active: s.is_active }))
        setSubjects(chosen)
        setInitialSubjects(chosen.map((s) => s._id).join())
        reset({
          name: f.name,
          specialization: f.specialization || '',
          display_order: String(f.display_order ?? 0),
          email: f.email || '',
          phone: f.phone || '',
          bio: f.bio || '',
          qualifications: f.qualifications || '',
          experience_years: f.experience_years == null ? '' : String(f.experience_years),
          is_active: f.is_active,
        })
      })
      .catch((err) => { if (live) setLoadError({ message: apiErrorMessage(err), status: apiErrorInfo(err).status }) })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [mode, facultyId, reset, attempt])

  useEffect(() => {
    if (!photoFile) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(photoFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  const photoChanged = !!photoFile || (original ? photo.url !== original.photo_url : false)
  const subjectsChanged = subjects.map((s) => s._id).join() !== initialSubjects
  useUnsavedChanges(!saved && (isDirty || photoChanged || subjectsChanged))

  /** The first subject also fills an empty specialization, or one that was just the old primary's name. */
  const changeSubjects = (next: SubjectOption[]) => {
    const before = subjects[0]?.name ?? ''
    const current = getValues('specialization').trim()
    if (current === '' || current === before) setValue('specialization', next[0]?.name ?? '', { shouldDirty: true, shouldValidate: !!errors.specialization })
    setSubjects(next)
  }

  const onSubmit = async (data: FormValues) => {
    setGeneralError(null)
    let photoUrl = photo.url
    let photoKey = photo.key
    if (photoFile) {
      setUploadProgress(0)
      try {
        const up = await facultyService.uploadPhoto(photoFile, setUploadProgress)
        photoUrl = up.photoUrl
        photoKey = up.s3Key
      } catch (err) {
        setGeneralError(`The photo could not be uploaded. ${apiErrorMessage(err)}`)
        return
      } finally {
        setUploadProgress(null)
      }
    }

    const creating = mode === 'create'
    const text = (v: string) => v || (creating ? undefined : null)
    const payload: FacultyFormData = {
      name: data.name,
      specialization: text(data.specialization),
      subject_ids: subjects.map((s) => s._id),
      subject_id: subjects[0]?._id ?? null,
      display_order: data.display_order ? Number(data.display_order) : 0,
      email: text(data.email),
      phone: text(data.phone),
      bio: text(data.bio),
      qualifications: text(data.qualifications),
      experience_years: data.experience_years ? Number(data.experience_years) : creating ? undefined : null,
      is_active: data.is_active,
      ...(photoChanged ? { photo_url: photoUrl ?? (creating ? undefined : null), photo_s3_key: photoKey ?? (creating ? undefined : null) } : {}),
    }
    try {
      const res = creating ? await facultyService.create(payload) : await facultyService.update(facultyId!, payload)
      if (!res.success || !res.data) throw new Error(res.message)
      toast.success(creating ? `${data.name} added` : `${data.name} saved`)
      // The guard must know there is nothing left to lose before we leave
      flushSync(() => setSaved(true))
      navigate(`/faculty/${res.data._id}`, { replace: true })
    } catch (err) {
      const message = apiErrorMessage(err)
      if (apiErrorInfo(err).status === 409 && /email/i.test(message)) setError('email', { message: 'Another faculty member already uses this email' }, { shouldFocus: true })
      else setGeneralError(message)
    }
  }

  const back = mode === 'edit' && facultyId ? { label: original?.name || 'Faculty', href: `/faculty/${facultyId}` } : { label: 'Faculty', href: '/faculty' }

  if (loadError) {
    const missing = loadError.status === 404 || loadError.status === 400
    return (
      <ErrorState
        title={missing ? 'This faculty member does not exist' : 'This faculty member could not be loaded'}
        message={missing ? 'They may have been removed.' : loadError.message}
        onRetry={missing ? undefined : () => setAttempt((n) => n + 1)}
        back={{ label: 'Back to faculty', href: '/faculty' }}
      />
    )
  }
  if (loading) return <DetailSkeleton />

  const saveLabel = mode === 'create' ? 'Add Faculty' : 'Update Faculty'
  const invalid = (k: keyof FormValues) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${k}-error` : undefined, disabled: busy, className: 'bg-card' })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <DetailHeader back={back} title={mode === 'create' ? 'Add Faculty' : 'Edit Faculty'} subtitle={mode === 'create' ? 'Add a new faculty member.' : 'Update faculty details below.'} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <Section title="Profile">
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <Field id="name" label="Name" required error={errors.name?.message} className="sm:col-span-2">
                <Input id="name" placeholder="Dr. John Doe" autoComplete="off" {...invalid('name')} {...register('name')} />
              </Field>
              <Field id="faculty_code" label="Faculty code" hint={mode === 'create' ? 'Given automatically when you add them, like PGMEF012. It never changes.' : original?.faculty_code ? 'Given automatically. It never changes and is never reused.' : 'Not assigned yet. It is given when the faculty codes are filled in.'}>
                <Input id="faculty_code" value={original?.faculty_code ?? ''} placeholder={mode === 'create' ? 'Given when you save' : 'Not assigned yet'} readOnly aria-readonly="true" tabIndex={-1} aria-describedby="faculty_code-hint" className="cursor-default bg-muted font-mono tabular-nums text-foreground" />
              </Field>
              <Field id="experience_years" label="Experience (years)" error={errors.experience_years?.message}>
                <Input id="experience_years" inputMode="numeric" {...invalid('experience_years')} {...register('experience_years')} />
              </Field>
              <div className="sm:col-span-2">
                <div className="space-y-1.5">
                  <Label id="qualifications-label" htmlFor="qualifications">Qualifications</Label>
                  <QualificationsField
                    id="qualifications"
                    items={qualificationItems}
                    onChange={(list) => setValue('qualifications', joinQualifications(list), { shouldDirty: true, shouldValidate: !!errors.qualifications })}
                    disabled={busy}
                    invalid={!!errors.qualifications}
                    describedBy={errors.qualifications ? 'qualifications-error' : 'qualifications-hint'}
                  />
                  {errors.qualifications
                    ? <p id="qualifications-error" role="alert" className="text-sm text-danger">{errors.qualifications.message}</p>
                    : <p id="qualifications-hint" className="text-[13px] text-muted-foreground">Educational qualifications, one per row, for example MBBS, then MD (Anatomy). Students see them in this order.</p>}
                </div>
              </div>
              <Field id="bio" label="Bio" error={errors.bio?.message} className="sm:col-span-2">
                <Textarea id="bio" placeholder="Brief faculty bio..." rows={5} {...invalid('bio')} {...register('bio')} />
              </Field>
            </div>
          </Section>

          <Section title="Subjects" description="Choose every subject they teach. The primary one is shown first, and is the one older app versions use.">
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <Field id="subjects" label="Subjects" hint={subjectsFailed ? undefined : 'Up to 20. Pick the primary with the round button.'} error={subjectsFailed ? 'The subjects could not be loaded. Reload the page to change them.' : undefined}>
                <SubjectMultiSelect id="subjects" options={subjectOptions} value={subjects.map((s) => ({ ...s, name: subjectOptions.find((o) => o._id === s._id)?.name ?? s.name }))} onChange={changeSubjects} disabled={busy || subjectsFailed} describedBy="subjects-hint" />
              </Field>
              <Field id="specialization" label="Specialization" error={errors.specialization?.message} hint="Shown under their name. Filled in from the primary subject.">
                <Input id="specialization" placeholder="e.g., Cardiology" {...invalid('specialization')} {...register('specialization')} />
              </Field>
            </div>
          </Section>

          <Section title="Contact" description="The email is also their sign-in for the faculty portal.">
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <Field id="email" label="Email" error={errors.email?.message}>
                <Input id="email" type="email" placeholder="faculty@example.com" autoComplete="off" {...invalid('email')} {...register('email')} />
              </Field>
              <Field id="phone" label="Phone" error={errors.phone?.message}>
                <Input id="phone" inputMode="numeric" placeholder="10-digit number" autoComplete="off" {...invalid('phone')} {...register('phone')} />
              </Field>
            </div>
          </Section>
        </div>

        <div className="min-w-0 space-y-6">
          <Section title="Photo">
            {previewUrl || photo.url ? (
              <div className="flex items-center gap-4">
                <img src={previewUrl || photo.url!} alt={previewUrl ? 'Cropped photo' : 'Faculty'} className="h-20 w-20 shrink-0 rounded-lg border border-border object-cover" />
                <div className="min-w-0 space-y-2">
                  <p className="text-[13px] text-muted-foreground">{previewUrl ? 'Cropped photo ready. It uploads when you save.' : 'Remove it to upload a new one.'}</p>
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => (photoFile ? setPhotoFile(null) : setPhoto({ url: null, key: null }))}>
                    <X aria-hidden="true" className="h-3.5 w-3.5" />{previewUrl ? 'Choose another photo' : 'Remove photo'}
                  </Button>
                </div>
              </div>
            ) : (
              <FileUpload
                accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }}
                maxSize={5 * 1024 * 1024}
                maxFiles={1}
                value={[]}
                onChange={(files) => { if (files.length > 0) setCropperFile(files[0]) }}
                disabled={busy}
                label="Upload faculty photo"
                description="JPEG, PNG, or WebP. Max 5MB. Will be cropped to square."
              />
            )}
            {uploadProgress !== null && (
              <div className="mt-3 space-y-1" aria-live="polite">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
              </div>
            )}
          </Section>

          <Section title="Listing">
            <div className="space-y-5">
              <Field id="display_order" label="Display Order" error={errors.display_order?.message} hint="Lower numbers come first.">
                <Input id="display_order" inputMode="numeric" {...invalid('display_order')} {...register('display_order')} />
              </Field>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-[13px] text-muted-foreground">{isActive ? 'Faculty is visible and active' : 'Faculty is deactivated'}</p>
                </div>
                <Switch id="is_active" checked={isActive} onCheckedChange={(v) => setValue('is_active', v, { shouldDirty: true })} disabled={busy} />
              </div>
            </div>
          </Section>
        </div>
      </div>

      <div className="sticky -bottom-4 z-10 -mx-4 -mb-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6 lg:-mx-8 lg:px-8">
        {generalError && <p role="alert" className="mb-2 text-sm text-danger">{generalError}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="bg-card" disabled={busy} onClick={() => navigate(back.href)}>Cancel</Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
            {busy ? (uploadProgress !== null ? 'Uploading...' : mode === 'create' ? 'Adding…' : 'Updating…') : saveLabel}
          </Button>
        </div>
      </div>

      <ImageCropper
        file={cropperFile}
        open={!!cropperFile}
        onClose={() => setCropperFile(null)}
        onCropComplete={(file) => { setPhotoFile(file); setCropperFile(null) }}
        aspectRatio={1}
        title="Crop Faculty Photo"
        description="Adjust the crop area for the faculty profile photo (1:1 square)."
      />
    </form>
  )
}
