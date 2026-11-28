import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ExternalLink, FileText, FileVideo, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/common/FileUpload'
import { apiErrorMessage } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { tutorialsService, type Tutorial, type TutorialFormData } from '@/services/tutorials.service'
import {
  EditorPage, EditorSection, EditorSkeleton, RecordError, focusFirstInvalid, useEditorExit, useRecord, useStaleCheck,
} from '@/components/forms/editor/EditorPage'
import { Field, SelectControl, SwitchRow, TextInput, UnitInput } from '@/components/forms/editor/fields'
import { RefPicker, loadSubjects, useOptions } from '@/components/forms/editor/pickers'
import { ImageField, NO_IMAGE, type ImageValue } from '@/components/forms/editor/ImageField'
import { fileSize } from '@/components/forms/editor/list'

const SCREENS = [
  { id: 'home', label: 'Home' },
  { id: 'theory', label: 'Theory' },
  { id: 'practical', label: 'Practical' },
  { id: 'notes', label: 'Notes' },
  { id: 'ebook-store', label: 'E-Book Store' },
]

interface TutorialFormValues {
  title: string
  description: string
  body: string
  url: string
  subject_id: string
  display_screens: string[]
  display_order: number | null
  is_active: boolean
  publish_status: 'draft' | 'published'
}

const isUrl = (s: string) => { try { return /^https?:$/.test(new URL(s).protocol) } catch { return false } }

const schema = z.custom<TutorialFormValues>().superRefine((d, ctx) => {
  const fail = (path: keyof TutorialFormValues, message: string) => ctx.addIssue({ code: 'custom', message, path: [path] })
  if (d.title.trim().length < 2) fail('title', 'Title is required')
  if (d.title.trim().length > 300) fail('title', 'Keep the title under 300 characters')
  if (d.description.trim().length > 500) fail('description', 'Keep this under 500 characters')
  if (d.body.trim().length > 5000) fail('body', 'Keep this under 5000 characters')
  if (d.url.trim() && !isUrl(d.url.trim())) fail('url', 'Must be a valid URL')
  if (d.display_screens.length === 0) fail('display_screens', 'Select at least one screen')
  if (d.display_order != null && (!Number.isInteger(d.display_order) || d.display_order < 0)) fail('display_order', 'Enter a whole number, 0 or more')
})

const BLANK: TutorialFormValues = { title: '', description: '', body: '', url: '', subject_id: '', display_screens: ['notes'], display_order: null, is_active: true, publish_status: 'draft' }
const toValues = (t: Tutorial): TutorialFormValues => ({
  title: t.title, description: t.description || '', body: t.body || '', url: t.url || '',
  subject_id: t.subject_id && typeof t.subject_id === 'object' ? t.subject_id._id : t.subject_id || '',
  display_screens: t.display_screens?.length ? t.display_screens : ['notes'],
  display_order: t.display_order ?? null, is_active: t.is_active, publish_status: t.publish_status || 'draft',
})
const fingerprint = (t: Tutorial) => JSON.stringify([toValues(t), t.thumbnail_url, t.media_url])
const asNumber = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))

/** Auto-detect type from the media file, what was uploaded before, or the link. */
function detectType(file: File | null, mime: string | null, url: string): 'video' | 'pdf' {
  if (file) return file.type.startsWith('video/') ? 'video' : 'pdf'
  if (mime) return mime.startsWith('video/') ? 'video' : 'pdf'
  return url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'video'
}

export function TutorialEditorPage() {
  const { tutorialId } = useParams<{ tutorialId: string }>()
  const mode = tutorialId ? 'edit' : 'create'
  const { record: tutorial, loading, error, reload, setRecord } = useRecord(tutorialId, (id) => tutorialsService.getById(id))

  if (mode === 'edit' && loading && !tutorial) return <EditorSkeleton />
  if (mode === 'edit' && !tutorial) {
    return <RecordError status={error?.status ?? null} message={error?.message ?? ''} noun="tutorial" back={{ label: 'Back to tutorials', href: '/content/tutorials' }} onRetry={reload} />
  }
  return <TutorialForm key={tutorialId ?? 'new'} mode={mode} tutorial={tutorial} onReplace={setRecord} />
}

function TutorialForm({ mode, tutorial, onReplace }: { mode: 'create' | 'edit'; tutorial: Tutorial | null; onReplace: (t: Tutorial) => void }) {
  const { hasPermission } = useAuth()
  const readOnly = !hasPermission(mode === 'create' ? 'tutorials.create' : 'tutorials.update')
  const opened = useRef(tutorial)
  const formRef = useRef<HTMLDivElement>(null)
  // The record, once it exists: a failed media upload must not create it twice
  const savedId = useRef<string | null>(tutorial?._id ?? null)
  const [thumbnail, setThumbnail] = useState<ImageValue>(tutorial ? { file: null, url: tutorial.thumbnail_url, key: tutorial.thumbnail_s3_key } : NO_IMAGE)
  const [media, setMedia] = useState<File | null>(null)
  const [hideMedia, setHideMedia] = useState(false)
  const [thumbProgress, setThumbProgress] = useState<number | null>(null)
  const [mediaProgress, setMediaProgress] = useState<number | null>(null)
  const [thumbError, setThumbError] = useState<string | null>(null)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [defaults] = useState<TutorialFormValues>(() => (tutorial ? toValues(tutorial) : BLANK))

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting, isDirty } } = useForm<TutorialFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: defaults,
    shouldFocusError: false,
  })
  const v = watch()
  const busy = isSubmitting
  const dirty = isDirty || !!thumbnail.file || thumbnail.url !== (tutorial?.thumbnail_url ?? null) || !!media || hideMedia
  const leave = useEditorExit(dirty && !readOnly)
  const stale = useStaleCheck<Tutorial>(fingerprint)
  const subjects = useOptions(loadSubjects(true))

  const save = async (data: TutorialFormValues) => {
    setFailure(null)
    if (mode === 'edit' && tutorial) {
      const { answer, latest } = await stale.check(opened.current, () => tutorialsService.getById(tutorial._id))
      if (answer === 'keep') return
      if (answer === 'reload' && latest) {
        opened.current = latest
        onReplace(latest)
        reset(toValues(latest))
        setThumbnail({ file: null, url: latest.thumbnail_url, key: latest.thumbnail_s3_key })
        setMedia(null)
        setHideMedia(false)
        return
      }
    }

    let image = thumbnail
    if (thumbnail.file) {
      setThumbError(null)
      setThumbProgress(0)
      try {
        const up = await tutorialsService.uploadThumbnail(thumbnail.file, setThumbProgress)
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

    const payload: TutorialFormData = {
      title: data.title.trim(),
      // An empty link on an edit removes the saved one
      url: data.url.trim() || (mode === 'edit' && tutorial?.url ? '' : undefined),
      // A removed file no longer decides the type; the link (or a new file) does
      type: detectType(media, hideMedia ? null : tutorial?.media_mime_type ?? null, data.url),
      // The saved file was removed and nothing replaces it: clear it
      ...(hideMedia && !media && tutorial?.media_url ? { media_url: null } : {}),
      // An empty string clears the text of an existing tutorial
      description: data.description.trim() || (mode === 'edit' ? '' : undefined),
      body: data.body.trim() || (mode === 'edit' ? '' : undefined),
      subject_id: data.subject_id || null,
      display_screens: data.display_screens,
      thumbnail_url: image.url,
      thumbnail_s3_key: image.key,
      display_order: data.display_order ?? undefined,
      is_active: data.is_active,
      publish_status: data.publish_status,
    }
    try {
      const res = savedId.current ? await tutorialsService.update(savedId.current, payload) : await tutorialsService.create(payload)
      if (!res.success) throw new Error(res.message || 'Failed to save tutorial')
      savedId.current = res.data?._id ?? savedId.current
      opened.current = null // our own save is not someone else's change
    } catch (err) {
      setFailure(apiErrorMessage(err, mode === 'create' ? 'The tutorial could not be created. Please try again.' : 'The tutorial could not be updated. Please try again.'))
      return
    }

    if (media && savedId.current) {
      setMediaError(null)
      setMediaProgress(0)
      try {
        await tutorialsService.uploadMedia(savedId.current, media, setMediaProgress)
      } catch (err) {
        setMediaError(`The tutorial was saved, but the file was not uploaded: ${apiErrorMessage(err, 'the upload failed.')} Save again to retry.`)
        focusFirstInvalid(formRef.current)
        return
      } finally {
        setMediaProgress(null)
      }
    }
    toast.success(mode === 'create' ? 'Tutorial created successfully' : 'Tutorial updated successfully')
    leave('/content/tutorials')
  }

  const uploading = thumbProgress !== null || mediaProgress !== null
  const hasMedia = !!tutorial?.media_url && !hideMedia

  return (
    <>
      <EditorPage
        title={mode === 'create' ? 'Add Tutorial' : 'Edit Tutorial'}
        description={mode === 'create' ? 'Add a free tutorial visible to app users.' : 'Update the tutorial details.'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Tutorials', href: '/content/tutorials' },
          { label: mode === 'create' ? 'Add Tutorial' : tutorial?.title || 'Edit' },
        ]}
        cancelHref="/content/tutorials"
        saveLabel={mode === 'create' ? 'Add Tutorial' : 'Update Tutorial'}
        savingLabel={uploading ? 'Uploading...' : mode === 'create' ? 'Creating...' : 'Updating...'}
        saving={busy}
        dirty={dirty}
        problems={Object.keys(errors).length}
        failure={failure}
        readOnly={readOnly}
        onSubmit={handleSubmit(save, () => { setFailure(null); focusFirstInvalid(formRef.current) })}
      >
        <div ref={formRef} className="space-y-6">
          <EditorSection id="basics" title="Basics">
            <Field id="title" label="Title" required error={errors.title?.message} counter={{ value: v.title.length, max: 300 }}>
              {(c) => <TextInput {...c} placeholder="e.g. How to study Anatomy effectively" disabled={busy} {...register('title')} />}
            </Field>
            <Field id="description" label="Short Description" error={errors.description?.message} counter={{ value: v.description.length, max: 500 }}>
              {(c) => <TextInput {...c} placeholder="Brief one-liner shown below title" disabled={busy} {...register('description')} />}
            </Field>
            <Field id="body" label="Body Text" error={errors.body?.message} counter={{ value: v.body.length, max: 5000 }} hint="Optional detailed content. Shown in the app when the user opens this tutorial.">
              {(c) => <Textarea {...c} rows={5} placeholder="Detailed explanation or instructions shown when user taps the tutorial..." disabled={busy} className="bg-card aria-invalid:border-danger" {...register('body')} />}
            </Field>
          </EditorSection>

          <EditorSection id="content" title="Content">
            <Field
              id="url"
              label="External URL"
              error={errors.url?.message}
              hint={tutorial?.url && !v.url ? 'The saved link is removed when you save.' : 'Optional link (e.g. YouTube video). You can also upload a file below.'}
            >
              {(c) => <TextInput {...c} type="url" inputMode="url" placeholder="https://youtube.com/... (optional)" disabled={busy} {...register('url')} />}
            </Field>
            <ImageField
              label="Thumbnail Image"
              value={thumbnail}
              onChange={(x) => { setThumbnail(x); setThumbError(null) }}
              aspect={16 / 9}
              noCrop
              uploadLabel="Upload thumbnail"
              cropTitle=""
              progress={thumbProgress}
              error={thumbError ?? undefined}
              disabled={busy || readOnly}
            />
            <div className="space-y-1.5">
              <Label className="block text-[13px] font-medium" id="media-label">Media File</Label>
              <div role="group" aria-labelledby="media-label" aria-invalid={mediaError ? true : undefined} tabIndex={mediaError ? -1 : undefined} className="max-w-[420px] outline-none">
                {media ? (
                  <MediaRow video={media.type.startsWith('video/')} name={media.name} detail={`${fileSize(media.size / 1048576)}, uploaded when you save`} onRemove={() => { setMedia(null); setMediaError(null) }} disabled={busy} />
                ) : hasMedia ? (
                  <MediaRow
                    video={!!tutorial?.media_mime_type?.startsWith('video/')}
                    name="Current file"
                    href={tutorial?.media_url}
                    detail={[tutorial?.media_file_size_mb ? fileSize(tutorial.media_file_size_mb) : 'Uploaded', tutorial?.media_mime_type].filter(Boolean).join(', ')}
                    onRemove={() => setHideMedia(true)}
                    disabled={busy}
                  />
                ) : (
                  <FileUpload
                    accept={{ 'video/mp4': ['.mp4'], 'video/quicktime': ['.mov'], 'video/webm': ['.webm'], 'application/pdf': ['.pdf'] }}
                    maxSize={500 * 1024 * 1024}
                    maxFiles={1}
                    value={[]}
                    onChange={(files) => { if (files[0]) { setMedia(files[0]); setMediaError(null) } }}
                    disabled={busy || readOnly}
                    label="Upload video or PDF"
                    description="MP4, MOV, WebM, or PDF. Max 500MB."
                  />
                )}
              </div>
              {mediaProgress !== null && (
                <div className="max-w-[420px] space-y-1" role="status">
                  <Progress value={mediaProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">Uploading file... {mediaProgress}%</p>
                </div>
              )}
              {mediaError && <p className="text-[13px] text-danger">{mediaError}</p>}
              {hideMedia && !media && <p className="text-xs text-muted-foreground">The current file is removed when you save. Upload another file to replace it.</p>}
            </div>
          </EditorSection>

          <EditorSection id="placement" title="Placement" description="Where it shows in the app.">
            <Field id="subject_id" label="Subject">
              {(c) => (
                <Controller name="subject_id" control={control} render={({ field }) => (
                  <RefPicker control={c} value={field.value} onChange={field.onChange} list={subjects} noneLabel="All Subjects" emptyText="No subjects found." missingLabel="Inactive or deleted subject" disabled={busy} />
                )} />
              )}
            </Field>
            <Controller name="display_screens" control={control} render={({ field }) => (
              <fieldset aria-invalid={errors.display_screens ? true : undefined} tabIndex={errors.display_screens ? -1 : undefined} className="space-y-1.5 outline-none">
                <legend className="mb-1.5 text-[13px] font-medium">Display On Screens<span className="text-danger" aria-hidden="true"> *</span></legend>
                <div className="grid gap-2 rounded-md border border-input bg-card p-3 sm:grid-cols-3">
                  {SCREENS.map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                      <Checkbox checked={field.value.includes(s.id)} onCheckedChange={(c) => field.onChange(c === true ? [...field.value, s.id] : field.value.filter((x) => x !== s.id))} disabled={busy} />
                      {s.label}
                    </label>
                  ))}
                </div>
                {errors.display_screens && <p className="text-[13px] text-danger">{errors.display_screens.message}</p>}
              </fieldset>
            )} />
            <Field id="display_order" label="Display Order" error={errors.display_order?.message} className="max-w-[320px]">
              {(c) => <UnitInput {...c} min={0} step={1} inputMode="numeric" placeholder="0" disabled={busy} {...register('display_order', { setValueAs: asNumber })} />}
            </Field>
          </EditorSection>

          <EditorSection id="publishing" title="Publishing">
            <Controller name="is_active" control={control} render={({ field }) => (
              <SwitchRow id="is_active" label="Active" description={field.value ? 'Tutorial is visible' : 'Tutorial is hidden'} checked={field.value} onChange={field.onChange} disabled={busy} />
            )} />
            <Field id="publish_status" label="Publish Status" hint="Only published tutorials are visible to app users." className="max-w-[320px]">
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

function MediaRow({ video, name, detail, href, onRemove, disabled }: { video: boolean; name: string; detail: string; href?: string | null; onRemove: () => void; disabled?: boolean }) {
  const Icon = video ? FileVideo : FileText
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5">
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        {href
          ? <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">{name}<ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /></a>
          : <p className="truncate text-sm font-medium">{name}</p>}
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-danger hover:text-danger" aria-label="Remove file" disabled={disabled} onClick={onRemove}><Trash2 /></Button>
    </div>
  )
}
