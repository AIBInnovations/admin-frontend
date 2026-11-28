import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { apiErrorMessage } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { endOfIstDay } from '@/lib/format'
import { bannersService, type Banner, type BannerFormData, type BannerType, type LinkType } from '@/services/banners.service'
import {
  EditorPage, EditorSection, EditorSkeleton, RecordError, focusFirstInvalid, useEditorExit, useRecord, useStaleCheck,
} from '@/components/forms/editor/EditorPage'
import { Field, Note, SelectControl, SwitchRow, TextInput, UnitInput } from '@/components/forms/editor/fields'
import { EVERYONE, RefPicker, VisibilityFields, useOptions, visibilityError, visibilityPayload, type VisibilityValue } from '@/components/forms/editor/pickers'
import { ImageField, NO_IMAGE, type ImageValue } from '@/components/forms/editor/ImageField'
import { storedDay, toIstInputs } from '@/components/forms/editor/ist'
import { loadComboPackages, loadEbooks, loadPackagesOfType, loadPublishedWorkshops, loadUpcomingSessions } from '@/components/banners/targets'

type LinkAction = 'none' | 'external_url' | 'theory_package' | 'practical_package' | 'combo_package' | 'ebook' | 'live_session' | 'workshop'

const ACTIONS: { value: LinkAction; label: string; help: string }[] = [
  { value: 'none', label: 'No Action', help: 'Banner will be display-only, no navigation on tap.' },
  { value: 'external_url', label: 'External URL', help: 'Opens an external URL in the browser when tapped.' },
  { value: 'theory_package', label: 'Theory Package', help: 'Navigates to the selected theory package screen when tapped.' },
  { value: 'practical_package', label: 'Practical Package', help: 'Navigates to the selected practical package screen when tapped.' },
  { value: 'combo_package', label: 'Combo Package', help: 'Navigates to the selected combo package when tapped.' },
  { value: 'ebook', label: 'Book', help: 'Opens the selected book details page when tapped.' },
  { value: 'live_session', label: 'Live Session', help: 'Opens the selected live session details when tapped.' },
  { value: 'workshop', label: 'Workshop', help: 'Opens the selected workshop when tapped.' },
]

const TARGET: Partial<Record<LinkAction, { label: string; placeholder: string; empty: string; missing: string; error: string }>> = {
  theory_package: { label: 'Select Theory Package', placeholder: 'Select a theory package', empty: 'No theory packages found', missing: 'This package is inactive or deleted', error: 'Please select a package' },
  practical_package: { label: 'Select Practical Package', placeholder: 'Select a practical package', empty: 'No practical packages found', missing: 'This package is inactive or deleted', error: 'Please select a package' },
  combo_package: { label: 'Select Combo Package', placeholder: 'Select a combo package', empty: 'No combo packages found', missing: 'This package is inactive or deleted', error: 'Please select a package' },
  ebook: { label: 'Select Book', placeholder: 'Select a book', empty: 'No ebooks found', missing: 'This book is unavailable or deleted', error: 'Please select a book' },
  live_session: { label: 'Select Live Session', placeholder: 'Select a session', empty: 'No scheduled sessions found', missing: 'This session has ended or is not published', error: 'Please select a session' },
  workshop: { label: 'Select Workshop', placeholder: 'Select a workshop', empty: 'No published workshops found', missing: 'This workshop is not published', error: 'Please select a workshop' },
}

interface BannerFormValues {
  title: string
  subtitle: string
  action: LinkAction
  target: string
  click_url: string
  start_date: string
  end_date: string
  display_order: number | null
  is_active: boolean
  publish_status: 'draft' | 'published'
}

const isUrl = (s: string) => { try { return /^https?:$/.test(new URL(s).protocol) } catch { return false } }

const schema = z.custom<BannerFormValues>().superRefine((d, ctx) => {
  const fail = (path: keyof BannerFormValues, message: string) => ctx.addIssue({ code: 'custom', message, path: [path] })
  if (d.title.trim().length < 2) fail('title', 'Title is required')
  if (d.title.trim().length > 200) fail('title', 'Keep the title under 200 characters')
  if (d.subtitle.trim().length > 300) fail('subtitle', 'Keep the subtitle under 300 characters')
  if (d.action === 'external_url' && !isUrl(d.click_url.trim())) fail('click_url', d.click_url.trim() ? 'Must be a valid URL, starting with https://' : 'Click URL is required')
  const target = TARGET[d.action]
  if (target && !d.target) fail('target', target.error)
  if (!d.start_date) fail('start_date', 'Start date is required')
  if (d.start_date && d.end_date && d.end_date < d.start_date) fail('end_date', 'End date is before the start date')
  if (d.display_order != null && (!Number.isInteger(d.display_order) || d.display_order < 0)) fail('display_order', 'Enter a whole number, 0 or more')
})

function actionOf(b: Banner): LinkAction {
  if (b.banner_type && b.banner_type !== 'generic') return b.banner_type
  if (b.click_url && b.link_type === 'external') return 'external_url'
  return 'none'
}
function targetOf(b: Banner): string {
  switch (actionOf(b)) {
    case 'theory_package': case 'practical_package': case 'combo_package': return b.target_package_id || ''
    case 'ebook': return b.target_book_id || ''
    case 'live_session': return b.target_session_id || ''
    case 'workshop': return b.target_workshop_id || ''
    default: return ''
  }
}
const BLANK = (): BannerFormValues => ({
  title: '', subtitle: '', action: 'none', target: '', click_url: '', start_date: toIstInputs(new Date()).date, end_date: '', display_order: null, is_active: true, publish_status: 'draft',
})
const toValues = (b: Banner): BannerFormValues => ({
  title: b.title, subtitle: b.subtitle || '', action: actionOf(b), target: targetOf(b), click_url: b.click_url || '',
  start_date: storedDay(b.start_date), end_date: storedDay(b.end_date), display_order: b.display_order ?? null, is_active: b.is_active, publish_status: b.publish_status || 'draft',
})
const toVisibility = (b: Banner): VisibilityValue => ({ to: b.visible_to || 'all', subjects: b.visible_to_subjects || [], packages: b.visible_to_packages || [] })
const fingerprint = (b: Banner) => JSON.stringify([toValues(b), toVisibility(b), b.image_url])
const asNumber = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))

export function BannerEditorPage() {
  const { bannerId } = useParams<{ bannerId: string }>()
  const mode = bannerId ? 'edit' : 'create'
  const { record: banner, loading, error, reload, setRecord } = useRecord(bannerId, (id) => bannersService.getById(id))

  if (mode === 'edit' && loading && !banner) return <EditorSkeleton />
  if (mode === 'edit' && !banner) {
    return <RecordError status={error?.status ?? null} message={error?.message ?? ''} noun="banner" back={{ label: 'Back to banners', href: '/content/banners' }} onRetry={reload} />
  }
  return <BannerForm key={bannerId ?? 'new'} mode={mode} banner={banner} onReplace={setRecord} />
}

function BannerForm({ mode, banner, onReplace }: { mode: 'create' | 'edit'; banner: Banner | null; onReplace: (b: Banner) => void }) {
  const { hasPermission } = useAuth()
  const readOnly = !hasPermission(mode === 'create' ? 'banners.create' : 'banners.update')
  const opened = useRef(banner)
  const formRef = useRef<HTMLDivElement>(null)
  const [visibility, setVisibility] = useState<VisibilityValue>(banner ? toVisibility(banner) : EVERYONE)
  const [image, setImage] = useState<ImageValue>(banner ? { file: null, url: banner.image_url, key: banner.image_s3_key } : NO_IMAGE)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [tried, setTried] = useState(false)
  const [defaults] = useState<BannerFormValues>(() => (banner ? toValues(banner) : BLANK()))

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting, isDirty } } = useForm<BannerFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: defaults,
    shouldFocusError: false,
  })
  const v = watch()
  const busy = isSubmitting
  const dirty = isDirty || !!image.file || image.url !== (banner?.image_url ?? null) || JSON.stringify(visibility) !== JSON.stringify(banner ? toVisibility(banner) : EVERYONE)
  const leave = useEditorExit(dirty && !readOnly)
  const stale = useStaleCheck<Banner>(fingerprint)

  const theory = useOptions(loadPackagesOfType('theory'), v.action === 'theory_package')
  const practical = useOptions(loadPackagesOfType('practical'), v.action === 'practical_package')
  const combo = useOptions(loadComboPackages, v.action === 'combo_package')
  const ebooks = useOptions(loadEbooks, v.action === 'ebook')
  const sessions = useOptions(loadUpcomingSessions, v.action === 'live_session')
  const workshops = useOptions(loadPublishedWorkshops, v.action === 'workshop')
  const lists = { theory_package: theory, practical_package: practical, combo_package: combo, ebook: ebooks, live_session: sessions, workshop: workshops }
  const target = TARGET[v.action]

  const noImage = !image.file && !image.url
  const imageError = uploadError ?? (tried && noImage ? 'Banner image is required' : undefined)
  const visError = tried ? visibilityError(visibility) : undefined
  const problems = Object.keys(errors).length + (tried && noImage ? 1 : 0) + (visError ? 1 : 0)
  const today = toIstInputs(new Date()).date

  const onInvalid = () => { setTried(true); setFailure(null); focusFirstInvalid(formRef.current) }

  const save = async (data: BannerFormValues) => {
    setTried(true)
    setFailure(null)
    if (noImage || visibilityError(visibility)) { focusFirstInvalid(formRef.current); return }

    if (mode === 'edit' && banner) {
      const { answer, latest } = await stale.check(opened.current, () => bannersService.getById(banner._id))
      if (answer === 'keep') return
      if (answer === 'reload' && latest) {
        opened.current = latest
        onReplace(latest)
        reset(toValues(latest))
        setVisibility(toVisibility(latest))
        setImage({ file: null, url: latest.image_url, key: latest.image_s3_key })
        return
      }
    }

    let picture = image
    if (image.file) {
      setUploadError(null)
      setProgress(0)
      try {
        const up = await bannersService.uploadImage(image.file, setProgress)
        picture = { file: null, url: up.imageUrl, key: up.s3Key }
        setImage(picture)
      } catch (err) {
        setUploadError(`The image was not uploaded: ${apiErrorMessage(err, 'the upload failed.')} Nothing was saved. Save again to retry.`)
        focusFirstInvalid(formRef.current)
        return
      } finally {
        setProgress(null)
      }
    }

    const type: BannerType = data.action === 'none' || data.action === 'external_url' ? 'generic' : data.action
    const link: LinkType = data.action === 'none' ? 'none' : data.action === 'external_url' ? 'external' : 'internal'
    const isPackage = data.action === 'theory_package' || data.action === 'practical_package' || data.action === 'combo_package'
    const payload: BannerFormData = {
      title: data.title.trim(),
      // An empty string clears the subtitle of an existing banner
      subtitle: data.subtitle.trim() || (mode === 'edit' ? '' : undefined),
      image_url: picture.url || '',
      image_s3_key: picture.key || undefined,
      click_url: data.action === 'external_url' ? data.click_url.trim() : undefined,
      link_type: link,
      banner_type: type,
      target_package_id: isPackage ? data.target : null,
      target_book_id: data.action === 'ebook' ? data.target : null,
      target_session_id: data.action === 'live_session' ? data.target : null,
      target_workshop_id: data.action === 'workshop' ? data.target : null,
      ...visibilityPayload(visibility),
      display_order: data.display_order ?? undefined,
      is_active: data.is_active,
      publish_status: data.publish_status,
      start_date: data.start_date,
      // The whole last day, in India time. Removing a saved end date sends
      // null: the banner then runs with no end.
      end_date: data.end_date ? endOfIstDay(data.end_date) : banner?.end_date ? null : undefined,
    }
    try {
      const res = mode === 'create' ? await bannersService.create(payload) : await bannersService.update(banner!._id, payload)
      if (!res.success) throw new Error(res.message || 'Failed to save banner')
      toast.success(mode === 'create' ? 'Banner created successfully' : 'Banner updated successfully')
      leave('/content/banners')
    } catch (err) {
      setFailure(apiErrorMessage(err, mode === 'create' ? 'The banner could not be created. Please try again.' : 'The banner could not be updated. Please try again.'))
    }
  }

  return (
    <>
      <EditorPage
        title={mode === 'create' ? 'Add Banner' : 'Edit Banner'}
        description={mode === 'create' ? 'Create a new promotional banner.' : 'Update the banner details.'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Banners', href: '/content/banners' },
          { label: mode === 'create' ? 'Add Banner' : banner?.title || 'Edit' },
        ]}
        cancelHref="/content/banners"
        saveLabel={mode === 'create' ? 'Add Banner' : 'Update Banner'}
        savingLabel={progress !== null ? 'Uploading...' : mode === 'create' ? 'Creating...' : 'Updating...'}
        saving={busy}
        dirty={dirty}
        problems={problems}
        failure={failure}
        readOnly={readOnly}
        onSubmit={handleSubmit(save, onInvalid)}
      >
        <div ref={formRef} className="space-y-6">
          <EditorSection id="basics" title="Basics">
            <Field id="title" label="Title" required error={errors.title?.message} counter={{ value: v.title.length, max: 200 }}>
              {(c) => <TextInput {...c} placeholder="Banner title" disabled={busy} {...register('title')} />}
            </Field>
            <Field id="subtitle" label="Subtitle" error={errors.subtitle?.message} counter={{ value: v.subtitle.length, max: 300 }}>
              {(c) => <TextInput {...c} placeholder="Optional subtitle" disabled={busy} {...register('subtitle')} />}
            </Field>
            <ImageField
              label="Banner Image"
              required
              value={image}
              onChange={(x) => { setImage(x); setUploadError(null) }}
              aspect={16 / 9}
              uploadLabel="Upload banner image"
              hint="JPEG, PNG, or WebP. Max 5MB. Will be cropped to banner ratio."
              cropTitle="Crop Banner Image"
              cropDescription="Adjust the crop area to fit the banner dimensions (16:9 ratio)."
              progress={progress}
              error={imageError}
              disabled={busy || readOnly}
            />
          </EditorSection>

          <EditorSection id="action" title="Click Action" description="What opens when a student taps the banner.">
            <Field id="action" label="Banner Click Action" hint={ACTIONS.find((a) => a.value === v.action)?.help}>
              {(c) => (
                <Controller name="action" control={control} render={({ field }) => (
                  <SelectControl control={c} value={field.value} onChange={(x) => { field.onChange(x); setValue('target', '', { shouldDirty: true }) }} disabled={busy} choices={ACTIONS} />
                )} />
              )}
            </Field>
            {v.action === 'external_url' && (
              <Field id="click_url" label="Click URL" required error={errors.click_url?.message}>
                {(c) => <TextInput {...c} type="url" inputMode="url" placeholder="https://..." disabled={busy} {...register('click_url')} />}
              </Field>
            )}
            {target && (
              <Field id="target" label={target.label} required error={errors.target?.message}>
                {(c) => (
                  <Controller name="target" control={control} render={({ field }) => (
                    <RefPicker
                      key={v.action}
                      control={c}
                      value={field.value}
                      onChange={field.onChange}
                      list={lists[v.action as keyof typeof lists]}
                      placeholder={target.placeholder}
                      emptyText={target.empty}
                      missingLabel={target.missing}
                      disabled={busy}
                    />
                  )} />
                )}
              </Field>
            )}
          </EditorSection>

          <EditorSection id="access" title="Access" description="Who sees it in the app.">
            <VisibilityFields noun="Banner" value={visibility} onChange={setVisibility} error={visError} disabled={busy} />
          </EditorSection>

          <EditorSection id="dates" title="Dates and order" description="India time. The end date is the last day it shows.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="start_date" label="Start Date" required error={errors.start_date?.message}>
                {(c) => <TextInput {...c} type="date" disabled={busy} {...register('start_date')} />}
              </Field>
              <Field id="end_date" label="End Date" error={errors.end_date?.message}>
                {(c) => <TextInput {...c} type="date" min={v.start_date || undefined} disabled={busy} {...register('end_date')} />}
              </Field>
              <Field id="display_order" label="Order" error={errors.display_order?.message} hint={mode === 'create' ? 'Leave empty to put it last.' : undefined}>
                {(c) => <UnitInput {...c} min={0} step={1} inputMode="numeric" disabled={busy} {...register('display_order', { setValueAs: asNumber })} />}
              </Field>
            </div>
            {v.end_date && v.end_date < today && <Note tone="warning">The end date has passed, so this banner does not show.</Note>}
            {banner?.end_date && !v.end_date && <p className="text-xs text-muted-foreground">No end date: the banner keeps showing until you turn it off.</p>}
          </EditorSection>

          <EditorSection id="publishing" title="Publishing">
            <Controller name="is_active" control={control} render={({ field }) => (
              <SwitchRow id="is_active" label="Active" description={field.value ? 'Banner is visible' : 'Banner is hidden'} checked={field.value} onChange={field.onChange} disabled={busy} />
            )} />
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
