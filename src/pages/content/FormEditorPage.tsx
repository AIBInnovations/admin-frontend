import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, FileText, Link2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CopyButton, ErrorState, StatusPill, apiErrorMessage } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { formsService, type Form, type FormFormData, type FormTemplate } from '@/services/forms.service'
import {
  EditorPage, EditorSection, EditorSkeleton, RecordError, focusFirstInvalid, useEditorExit, useRecord, useStaleCheck,
} from '@/components/forms/editor/EditorPage'
import { Field, Note, SelectControl, SwitchRow, TextInput, UnitInput } from '@/components/forms/editor/fields'
import { RefPicker, loadSubjects, useOptions } from '@/components/forms/editor/pickers'
import { ImageField, NO_IMAGE, type ImageValue } from '@/components/forms/editor/ImageField'
import { Tag } from '@/components/forms/editor/list'
import { ExamSlots } from '@/components/forms/ExamSlots'
import { FormPreview } from '@/components/forms/FormPreview'
import { ProductCode } from '@/components/common/ProductCode'

const STORE_BASE_URL = 'https://pgmeessentials.com'

function slugify(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

interface FormValues {
  template_id: string
  subject_id: string
  title: string
  description: string
  exam_process: string
  payment_amount: number | null
  exam_slots: string[]
  display_order: number | null
  is_active: boolean
  publish_status: 'draft' | 'published'
}

const schemaFor = (mode: 'create' | 'edit') => z.custom<FormValues>().superRefine((d, ctx) => {
  const fail = (path: keyof FormValues, message: string) => ctx.addIssue({ code: 'custom', message, path: [path] })
  // The template cannot change later, so an old form whose template was deleted can still be saved
  if (mode === 'create' && !d.template_id) fail('template_id', 'Template is required')
  if (!d.subject_id) fail('subject_id', 'Subject is required')
  if (d.title.trim().length < 2) fail('title', 'Title is required')
  if (d.title.trim().length > 300) fail('title', 'Keep the title under 300 characters')
  if (d.description.trim().length > 2000) fail('description', 'Keep the description under 2000 characters')
  if (d.exam_process.trim().length > 10000) fail('exam_process', 'Keep the exam process under 10000 characters')
  if (d.payment_amount != null && (Number.isNaN(d.payment_amount) || d.payment_amount < 0)) fail('payment_amount', 'Enter 0 or more')
  if (d.display_order != null && (!Number.isInteger(d.display_order) || d.display_order < 0)) fail('display_order', 'Enter a whole number, 0 or more')
})

const BLANK: FormValues = { template_id: '', subject_id: '', title: '', description: '', exam_process: '', payment_amount: 0, exam_slots: [], display_order: 0, is_active: true, publish_status: 'draft' }
const refId = (ref: { _id: string } | string | null | undefined) => (ref && typeof ref === 'object' ? ref._id : ref || '')
const toValues = (f: Form): FormValues => ({
  template_id: refId(f.template_id), subject_id: refId(f.subject_id), title: f.title, description: f.description || '', exam_process: f.exam_process || '',
  payment_amount: f.payment_amount || 0, exam_slots: f.exam_slots || [], display_order: f.display_order ?? null, is_active: f.is_active, publish_status: f.publish_status || 'draft',
})
const fingerprint = (f: Form) => JSON.stringify([toValues(f), f.banner_url])
const asNumber = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))

export function FormEditorPage() {
  const { formId } = useParams<{ formId: string }>()
  const mode = formId ? 'edit' : 'create'
  const { record: form, loading, error, reload, setRecord } = useRecord(formId, (id) => formsService.getById(id))

  // Templates drive the fields and the preview, so the form waits for them
  const [templates, setTemplates] = useState<FormTemplate[] | null>(null)
  const [templateError, setTemplateError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    setTemplateError(null)
    formsService.getTemplates()
      .then((res) => {
        if (!alive) return
        if (!res.success || !res.data) throw new Error(res.message || 'Failed to load options')
        setTemplates(res.data.templates || [])
      })
      .catch((e) => { if (alive) setTemplateError(apiErrorMessage(e, 'Failed to load options')) })
    return () => { alive = false }
  }, [tick])

  if (mode === 'edit' && !loading && !form) {
    return <RecordError status={error?.status ?? null} message={error?.message ?? ''} noun="form" back={{ label: 'Back to forms', href: '/content/forms' }} onRetry={reload} />
  }
  if (templateError && !templates) return <ErrorState title="The form templates could not be loaded" message={templateError} onRetry={() => setTick((t) => t + 1)} back={{ label: 'Back to forms', href: '/content/forms' }} />
  if (!templates || (mode === 'edit' && !form)) return <EditorSkeleton />
  return <FormBuilder key={formId ?? 'new'} mode={mode} form={form} templates={templates} onReplace={setRecord} />
}

function FormBuilder({ mode, form, templates, onReplace }: { mode: 'create' | 'edit'; form: Form | null; templates: FormTemplate[]; onReplace: (f: Form) => void }) {
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('forms.update')
  const readOnly = mode === 'create' ? !hasPermission('forms.create') : !canUpdate
  const opened = useRef(form)
  const formRef = useRef<HTMLDivElement>(null)
  const [banner, setBanner] = useState<ImageValue>(form ? { file: null, url: form.banner_url, key: form.banner_s3_key } : NO_IMAGE)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [preview, setPreview] = useState(true)
  const [zohoItemId, setZohoItemId] = useState(form?.zoho_item_id ?? null)
  const [zohoBusy, setZohoBusy] = useState(false)
  const [defaults] = useState<FormValues>(() => (form ? toValues(form) : BLANK))

  const { register, handleSubmit, control, watch, setValue, getValues, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schemaFor(mode)) as never,
    defaultValues: defaults,
    shouldFocusError: false,
  })
  const v = watch()
  const busy = isSubmitting
  const dirty = isDirty || !!banner.file || banner.url !== (form?.banner_url ?? null)
  const leave = useEditorExit(dirty && !readOnly)
  const stale = useStaleCheck<Form>(fingerprint)
  const subjects = useOptions(loadSubjects(false))

  const template = templates.find((t) => t._id === v.template_id)
  // A template that was switched off is not in the list; the form still knows its name
  const ownTemplate = form && typeof form.template_id === 'object' ? (form.template_id as Partial<FormTemplate>) : null
  const slug = template?.slug ?? (ownTemplate?._id === v.template_id ? ownTemplate?.slug : undefined)
  const fields = useMemo(() => [...(template?.fields ?? ownTemplate?.fields ?? [])].sort((a, b) => a.display_order - b.display_order), [template, ownTemplate])
  const examiner = slug === 'examiner'
  const payment = examiner ? 0 : v.payment_amount || 0
  const slotKeys = fields.filter((f) => f.type === 'radio' && !(f.options?.length > 0)).map((f) => f.field_key)

  // The template's title and description fill in until the admin types their own
  const filled = useRef<{ title: string; description: string }>({ title: '', description: '' })
  const pickTemplate = (id: string) => {
    setValue('template_id', id, { shouldDirty: true, shouldValidate: !!errors.template_id })
    const t = templates.find((x) => x._id === id)
    if (mode !== 'create' || !t) return
    const now = getValues()
    if (!now.title || now.title === filled.current.title) setValue('title', t.default_title || '', { shouldDirty: true })
    if (!now.description || now.description === filled.current.description) setValue('description', t.default_description || '', { shouldDirty: true })
    filled.current = { title: t.default_title || '', description: t.default_description || '' }
  }

  useEffect(() => {
    if (!banner.file) { setBannerPreview(banner.url); return }
    const url = URL.createObjectURL(banner.file)
    setBannerPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [banner.file, banner.url])

  const subjectSlug = slugify(subjects.options.find((s) => s.id === v.subject_id)?.name ?? '')
  const formSlug = form?.slug || (v.title ? slugify(v.title) : '')
  const shareUrl = !subjectSlug ? null : formSlug ? `${STORE_BASE_URL}/packages?subject=${subjectSlug}&form=${formSlug}` : `${STORE_BASE_URL}/packages?subject=${subjectSlug}`

  const save = async (data: FormValues) => {
    setFailure(null)
    if (mode === 'edit' && form) {
      const { answer, latest } = await stale.check(opened.current, () => formsService.getById(form._id))
      if (answer === 'keep') return
      if (answer === 'reload' && latest) {
        opened.current = latest
        onReplace(latest)
        reset(toValues(latest))
        setBanner({ file: null, url: latest.banner_url, key: latest.banner_s3_key })
        return
      }
    }
    let image = banner
    if (banner.file) {
      setUploadError(null)
      setProgress(0)
      try {
        const up = await formsService.uploadImage(banner.file, setProgress)
        image = { file: null, url: up.imageUrl, key: up.s3Key }
        setBanner(image)
      } catch (err) {
        setUploadError(`The banner was not uploaded: ${apiErrorMessage(err, 'the upload failed.')} Nothing was saved. Save again to retry.`)
        focusFirstInvalid(formRef.current)
        return
      } finally {
        setProgress(null)
      }
    }
    const payload: FormFormData = {
      template_id: data.template_id,
      subject_id: data.subject_id,
      title: data.title.trim(),
      // An empty string clears the description of an existing form
      description: data.description.trim() || (mode === 'edit' ? '' : undefined),
      exam_process: data.exam_process.trim() || null,
      banner_url: image.url || null,
      banner_s3_key: image.key || null,
      payment_amount: examiner ? null : data.payment_amount || null,
      is_active: data.is_active,
      publish_status: data.publish_status,
      display_order: data.display_order ?? undefined,
      exam_slots: examiner ? data.exam_slots : undefined,
    }
    try {
      const res = mode === 'create' ? await formsService.create(payload) : await formsService.update(form!._id, payload)
      if (!res.success) throw new Error(res.message || 'Failed to save form')
      toast.success(mode === 'create' ? 'Form created successfully' : 'Form updated successfully')
      leave('/content/forms')
    } catch (err) {
      setFailure(apiErrorMessage(err, mode === 'create' ? 'The form could not be created. Please try again.' : 'The form could not be updated. Please try again.'))
    }
  }

  const createZohoItem = async () => {
    if (!form || zohoBusy) return
    setZohoBusy(true)
    try {
      const res = await formsService.createZohoItem(form._id)
      if (!res.success || !res.data?.zoho_item_id) throw new Error(res.message || 'Failed to create item')
      setZohoItemId(res.data.zoho_item_id)
      toast.success('Zoho Books item created')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to create item'))
    } finally {
      setZohoBusy(false)
    }
  }

  return (
    <>
      <EditorPage
        title={mode === 'create' ? 'Create Form' : 'Edit Form'}
        description={mode === 'create' ? 'Create a new form from a template and assign it to a subject.' : 'Update form details.'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Forms', href: '/content/forms' },
          { label: mode === 'create' ? 'Create Form' : form?.title || 'Edit' },
        ]}
        cancelHref="/content/forms"
        saveLabel={mode === 'create' ? 'Create' : 'Save'}
        savingLabel={progress !== null ? 'Uploading...' : mode === 'create' ? 'Creating...' : 'Saving...'}
        saving={busy}
        dirty={dirty}
        problems={Object.keys(errors).length}
        failure={failure}
        readOnly={readOnly}
        onSubmit={handleSubmit(save, () => { setFailure(null); focusFirstInvalid(formRef.current) })}
        extra={
          <>
            {form && <Button asChild variant="ghost"><Link to={`/content/forms/${form._id}/submissions`}><FileText aria-hidden="true" />View Submissions</Link></Button>}
            <Button
              type="button"
              variant="ghost"
              aria-expanded={preview}
              onClick={() => {
                const next = !preview
                setPreview(next)
                // On a narrow screen the preview sits below the fields
                if (next && !window.matchMedia('(min-width: 1280px)').matches) setTimeout(() => document.getElementById('form-preview')?.scrollIntoView({ behavior: 'smooth' }), 50)
              }}
            >
              {preview ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}{preview ? 'Hide preview' : 'Preview'}
            </Button>
          </>
        }
        aside={preview ? (
          <section id="form-preview" aria-label="Preview">
            <p className="mb-3 text-[13px] text-muted-foreground">How this form will appear to users on the website.</p>
            <FormPreview
              templateName={template?.name ?? ownTemplate?.name ?? ''}
              fields={fields}
              title={v.title}
              description={v.description}
              examProcess={v.exam_process}
              bannerUrl={bannerPreview}
              payment={payment}
              examiner={examiner}
              slots={v.exam_slots}
            />
          </section>
        ) : undefined}
      >
        <div ref={formRef} className="space-y-6">
          <EditorSection id="basics" title="Basics" stacked={preview}>
            {mode === 'edit' && (
              <p className="flex flex-wrap items-center gap-2 text-sm"><span className="text-muted-foreground">Product ID</span><ProductCode code={form?.product_code} /></p>
            )}
            <Field id="template_id" label="Template" required error={errors.template_id?.message} hint={mode === 'edit' ? 'The template cannot change after the form is created.' : undefined}>
              {(c) => (
                <SelectControl
                  control={c}
                  value={v.template_id}
                  onChange={pickTemplate}
                  disabled={busy || mode === 'edit'}
                  placeholder={mode === 'edit' ? 'Deleted template' : templates.length === 0 ? 'No templates found' : 'Select template'}
                  choices={[
                    ...templates.map((t) => ({ value: t._id, label: t.name })),
                    ...(ownTemplate?._id && !templates.some((t) => t._id === ownTemplate._id) ? [{ value: ownTemplate._id, label: ownTemplate.name || 'Deleted template' }] : []),
                  ]}
                />
              )}
            </Field>
            <Field id="subject_id" label="Subject" required error={errors.subject_id?.message}>
              {(c) => (
                <Controller name="subject_id" control={control} render={({ field }) => (
                  <RefPicker control={c} value={field.value} onChange={field.onChange} list={subjects} placeholder="Select subject" emptyText="No subjects found." missingLabel="Deleted subject" disabled={busy} />
                )} />
              )}
            </Field>
            {shareUrl && (
              <div className="flex min-w-0 items-start gap-2 rounded-md border border-border bg-background px-3 py-2">
                <Link2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="min-w-0 flex-1 break-all font-mono text-xs text-muted-foreground">{shareUrl}</p>
                <CopyButton value={shareUrl} label="link" />
              </div>
            )}
            <Field id="title" label="Title" required error={errors.title?.message} counter={{ value: v.title.length, max: 300 }}>
              {(c) => <TextInput {...c} placeholder="Form title" disabled={busy} {...register('title')} />}
            </Field>
            <Field id="description" label="Description" error={errors.description?.message} counter={{ value: v.description.length, max: 2000 }}>
              {(c) => <Textarea {...c} rows={3} placeholder="Form description" disabled={busy} className="bg-card aria-invalid:border-danger" {...register('description')} />}
            </Field>
            <Field id="exam_process" label="Exam Process" error={errors.exam_process?.message} counter={{ value: v.exam_process.length, max: 10000 }} hint="Detailed description of the examination process. This will be shown to users before they fill the form.">
              {(c) => <Textarea {...c} rows={6} placeholder="Describe the exam process in detail..." disabled={busy} className="bg-card aria-invalid:border-danger" {...register('exam_process')} />}
            </Field>
            <ImageField
              label="Banner Image"
              value={banner}
              onChange={(x) => { setBanner(x); setUploadError(null) }}
              aspect={16 / 9}
              uploadLabel="Upload banner image"
              hint="Banner image (16:9 ratio). JPEG, PNG, or WebP. Max 5MB."
              cropTitle="Crop Banner Image"
              progress={progress}
              error={uploadError ?? undefined}
              disabled={busy || readOnly}
            />
          </EditorSection>

          {v.template_id && (
            <EditorSection id="fields" title="Fields" description="These come from the template." stacked={preview}>
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">This template has no fields.</p>
              ) : (
                <ol className="divide-y divide-border rounded-md border border-border">
                  {fields.map((f) => (
                    <li key={f.field_key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <span className="min-w-0 break-words text-sm">{f.label}{f.required && <span className="text-danger" aria-hidden="true"> *</span>}</span>
                      <span className="flex gap-1.5">
                        <Tag>{f.type === 'radio' ? (f.options?.length ? `Choice, ${f.options.length} options` : 'Choice, exam slots') : f.type === 'email' ? 'Email' : 'Text'}</Tag>
                        <Tag>{f.required ? 'Required' : 'Optional'}</Tag>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </EditorSection>
          )}

          {!examiner && (
            <EditorSection id="payment" title="Payment" stacked={preview}>
              <Field id="payment_amount" label="Payment Amount (INR, optional)" error={errors.payment_amount?.message} hint="If set, a Zoho payment link will be generated automatically on submission." className="max-w-[320px]">
                {(c) => <UnitInput {...c} prefix="₹" min={0} step="0.01" placeholder="0" disabled={busy} {...register('payment_amount', { setValueAs: asNumber })} />}
              </Field>
            </EditorSection>
          )}

          {examiner && (
            <EditorSection id="slots" title="Exam Slots" stacked={preview}>
              <Controller name="exam_slots" control={control} render={({ field }) => (
                <ExamSlots slots={field.value} onChange={field.onChange} saved={form?.exam_slots ?? []} formId={form?._id} slotFieldKeys={slotKeys} disabled={busy || readOnly} />
              )} />
              {v.exam_slots.length === 0 && <Note tone="warning">Without slots, examiners cannot choose when they are available.</Note>}
            </EditorSection>
          )}

          <EditorSection id="publishing" title="Publishing" stacked={preview}>
            <Field id="display_order" label="Display Order" error={errors.display_order?.message} className="max-w-[320px]">
              {(c) => <UnitInput {...c} min={0} step={1} inputMode="numeric" placeholder="0" disabled={busy} {...register('display_order', { setValueAs: asNumber })} />}
            </Field>
            <Controller name="is_active" control={control} render={({ field }) => (
              <SwitchRow id="is_active" label="Active" description={field.value ? 'Students can open this form once it is published' : 'This form is switched off'} checked={field.value} onChange={field.onChange} disabled={busy} />
            )} />
            <Field id="publish_status" label="Publish Status" hint="Draft content is only visible to admins. Publish when ready for users." className="max-w-[320px]">
              {(c) => (
                <Controller name="publish_status" control={control} render={({ field }) => (
                  <SelectControl control={c} value={field.value} onChange={field.onChange} disabled={busy} choices={[{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }]} />
                )} />
              )}
            </Field>
            {mode === 'edit' && payment > 0 && (
              <div className="rounded-md border border-border px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Zoho Books Item</p>
                  <StatusPill tone={zohoItemId ? 'success' : 'warning'}>{zohoItemId ? 'Synced' : 'Not Created'}</StatusPill>
                </div>
                {zohoItemId ? (
                  <p className="mt-1 flex items-center gap-1 break-all font-mono text-xs text-muted-foreground">{zohoItemId}<CopyButton value={zohoItemId} label="item id" /></p>
                ) : (
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                    <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">No Zoho Books item exists for this form. Invoices require an item.</p>
                    {canUpdate && (
                      <Button type="button" variant="outline" size="sm" className="bg-card" disabled={zohoBusy || busy} onClick={createZohoItem}>
                        {zohoBusy && <Loader2 aria-hidden="true" className="animate-spin" />}Create Item
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </EditorSection>
        </div>
      </EditorPage>
      {stale.dock}
    </>
  )
}
