import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Controller, useFieldArray, useForm, type Control, type FieldErrors, type UseFormRegister, type UseFormSetValue } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { apiErrorMessage } from '@/components/common/detail'
import { useAuth } from '@/contexts/AuthContext'
import { homeSectionsService, type HomeSectionItem } from '@/services/homeSections.service'
import { ColorInput } from '@/components/homeSections/ColorInput'
import { BLANK_ITEM, itemSchema, knowsRoute, toItemPayload, toItemValues, type ClickAction, type ItemFormValues } from '@/components/homeSections/itemForm'
import { loadEbooks, loadPackagesOfType, loadUpcomingSessions } from '@/components/banners/targets'
import {
  EditorPage, EditorSection, EditorSkeleton, RecordError, focusFirstInvalid, useEditorExit, useRecord, useStaleCheck,
} from '@/components/forms/editor/EditorPage'
import { Field, SelectControl, SwitchRow, TextInput, UnitInput } from '@/components/forms/editor/fields'
import { RefPicker, useOptions } from '@/components/forms/editor/pickers'
import { ImageField, NO_IMAGE, type ImageValue } from '@/components/forms/editor/ImageField'

const ACTIONS: { value: ClickAction; label: string; help: string }[] = [
  { value: 'none', label: 'No Action', help: 'No navigation on tap.' },
  { value: 'external_url', label: 'External URL', help: 'Opens an external URL in the browser.' },
  { value: 'theory_package', label: 'Theory Package', help: 'Navigates to the selected theory package screen.' },
  { value: 'practical_package', label: 'Practical Package', help: 'Navigates to the selected practical package screen.' },
  { value: 'ebook', label: 'Book', help: 'Opens the selected book details page.' },
  { value: 'live_session', label: 'Live Session', help: 'Opens the selected live session details.' },
]
const TARGET: Partial<Record<ClickAction, { label: string; placeholder: string; empty: string; missing: string }>> = {
  theory_package: { label: 'Select Theory Package', placeholder: 'Select a theory package', empty: 'No theory packages found', missing: 'This package is inactive or deleted' },
  practical_package: { label: 'Select Practical Package', placeholder: 'Select a practical package', empty: 'No practical packages found', missing: 'This package is inactive or deleted' },
  ebook: { label: 'Select Book', placeholder: 'Select a book', empty: 'No ebooks found', missing: 'This book is unavailable or deleted' },
  live_session: { label: 'Select Live Session', placeholder: 'Select a session', empty: 'No scheduled sessions found', missing: 'This session has ended or is not published' },
}
const fingerprint = (i: HomeSectionItem) => JSON.stringify([toItemValues(i), i.image_url, i.icon_url])
const asNumber = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))

async function loadCardTypes() {
  const res = await homeSectionsService.getCardTypes()
  if (!res.success || !res.data) throw new Error(res.message || 'Card types could not be loaded.')
  return res.data.card_types.map((t) => ({ id: t.key, name: t.label, sub: t.description }))
}

export function HomeSectionItemEditorPage() {
  const { sectionId, itemId } = useParams<{ sectionId: string; itemId: string }>()
  const mode = itemId ? 'edit' : 'create'
  const section = useRecord(sectionId, (id) => homeSectionsService.getById(id))
  const item = useRecord(itemId, (id) => homeSectionsService.getItemById(sectionId!, id))

  if ((section.loading && !section.record) || (item.loading && !item.record)) return <EditorSkeleton />
  if (!section.record) {
    return <RecordError status={section.error?.status ?? null} message={section.error?.message ?? ''} noun="home section" back={{ label: 'Back to home sections', href: '/content/home-sections' }} onRetry={section.reload} />
  }
  if (mode === 'edit' && !item.record) {
    return <RecordError status={item.error?.status ?? null} message={item.error?.message ?? ''} noun="item" back={{ label: 'Back to the section', href: `/content/home-sections/${sectionId}` }} onRetry={item.reload} />
  }
  return <ItemForm key={itemId ?? 'new'} mode={mode} sectionId={sectionId!} sectionTitle={section.record.title || 'Untitled Section'} item={item.record} onReplace={item.setRecord} />
}

interface ItemFormProps { mode: 'create' | 'edit'; sectionId: string; sectionTitle: string; item: HomeSectionItem | null; onReplace: (i: HomeSectionItem) => void }

function ItemForm({ mode, sectionId, sectionTitle, item, onReplace }: ItemFormProps) {
  const { hasPermission } = useAuth()
  const readOnly = !hasPermission(mode === 'create' ? 'home-sections.create' : 'home-sections.update')
  const back = `/content/home-sections/${sectionId}`
  const opened = useRef(item)
  const formRef = useRef<HTMLDivElement>(null)
  const [image, setImage] = useState<ImageValue>(item ? { file: null, url: item.image_url, key: item.image_s3_key } : NO_IMAGE)
  const [icon, setIcon] = useState<ImageValue>(item ? { file: null, url: item.icon_url, key: item.icon_s3_key } : NO_IMAGE)
  const [progress, setProgress] = useState<{ what: 'image' | 'icon'; pct: number } | null>(null)
  const [uploadError, setUploadError] = useState<{ what: 'image' | 'icon'; text: string } | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [defaults] = useState<ItemFormValues>(() => (item ? toItemValues(item) : BLANK_ITEM()))

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting, isDirty } } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema) as never,
    defaultValues: defaults,
    shouldFocusError: false,
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'metadata' })
  const v = watch()
  const busy = isSubmitting
  const dirty = isDirty || !!image.file || !!icon.file || image.url !== (item?.image_url ?? null) || icon.url !== (item?.icon_url ?? null)
  const leave = useEditorExit(dirty && !readOnly)
  const stale = useStaleCheck<HomeSectionItem>(fingerprint)
  const cardTypes = useOptions(loadCardTypes)

  const problems = Object.entries(errors).reduce((n, [key, e]) => {
    if (key === 'metadata' && Array.isArray(e)) return n + e.reduce((m: number, row) => m + (row ? Object.keys(row).length : 0), 0)
    if ((key === 'primary' || key === 'secondary') && e) return n + Object.keys(e).length
    return n + 1
  }, 0)

  const upload = async (what: 'image' | 'icon', value: ImageValue, set: (x: ImageValue) => void): Promise<ImageValue | null> => {
    if (!value.file) return value
    setUploadError(null)
    setProgress({ what, pct: 0 })
    try {
      const up = await homeSectionsService.uploadItemImage(sectionId, value.file, (pct) => setProgress({ what, pct }))
      // Kept, so a failed save does not upload the same picture again
      const next = { file: null, url: up.imageUrl, key: up.s3Key }
      set(next)
      return next
    } catch (err) {
      setUploadError({ what, text: `The ${what} was not uploaded: ${apiErrorMessage(err, 'the upload failed.')} Nothing was saved. Save again to retry.` })
      focusFirstInvalid(formRef.current)
      return null
    } finally {
      setProgress(null)
    }
  }

  const save = async (data: ItemFormValues) => {
    setFailure(null)
    if (mode === 'edit' && item) {
      const { answer, latest } = await stale.check(opened.current, () => homeSectionsService.getItemById(sectionId, item._id))
      if (answer === 'keep') return
      if (answer === 'reload' && latest) {
        opened.current = latest
        onReplace(latest)
        reset(toItemValues(latest))
        setImage({ file: null, url: latest.image_url, key: latest.image_s3_key })
        setIcon({ file: null, url: latest.icon_url, key: latest.icon_s3_key })
        return
      }
    }
    const img = await upload('image', image, setImage)
    if (!img) return
    const ico = await upload('icon', icon, setIcon)
    if (!ico) return

    // A removed picture is sent as null, which clears it
    const gone = (saved: string | null | undefined) => (item && saved ? null : undefined)
    const payload = toItemPayload(data, item, {
      image_url: img.url ?? gone(item?.image_url), image_s3_key: img.key ?? gone(item?.image_url),
      icon_url: ico.url ?? gone(item?.icon_url), icon_s3_key: ico.key ?? gone(item?.icon_url),
    })
    try {
      const res = mode === 'create' ? await homeSectionsService.createItem(sectionId, payload) : await homeSectionsService.updateItem(sectionId, item!._id, payload)
      if (!res.success) throw new Error(res.message || 'Failed to save item')
      toast.success(mode === 'create' ? 'Item created successfully' : 'Item updated successfully')
      leave(back)
    } catch (err) {
      setFailure(apiErrorMessage(err, mode === 'create' ? 'The item could not be created. Please try again.' : 'The item could not be updated. Please try again.'))
    }
  }

  const colour = (key: 'tag_color' | 'background_color' | 'text_color' | 'border_color' | 'button_color' | 'button_text_color', label: string, placeholder: string) => (
    <Field id={key} label={label} error={errors[key]?.message}>
      {(c) => <ColorInput {...c} swatch={v[key]} onPick={(h) => setValue(key, h, { shouldDirty: true, shouldValidate: !!errors[key] })} placeholder={placeholder} disabled={busy} {...register(key)} />}
    </Field>
  )
  const removedMedia = item && ((item.image_url && !image.url && !image.file) || (item.icon_url && !icon.url && !icon.file))

  return (
    <>
      <EditorPage
        title={mode === 'edit' ? 'Edit Item' : 'Add Item'}
        description={mode === 'edit' ? 'Update this home section item.' : 'Add a new item to this section.'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Content' },
          { label: 'Home Sections', href: '/content/home-sections' },
          { label: sectionTitle, href: back },
          { label: mode === 'edit' ? item?.title || 'Untitled' : 'Add Item' },
        ]}
        cancelHref={back}
        saveLabel={mode === 'edit' ? 'Update' : 'Create'}
        savingLabel={progress ? 'Uploading...' : mode === 'edit' ? 'Updating...' : 'Creating...'}
        saving={busy}
        dirty={dirty}
        problems={problems}
        failure={failure}
        readOnly={readOnly}
        onSubmit={handleSubmit(save, () => { setFailure(null); focusFirstInvalid(formRef.current) })}
      >
        <div ref={formRef} className="space-y-6">
          <EditorSection id="card" title="Card Type" description={cardTypes.options.find((t) => t.id === v.card_type)?.sub}>
            <Field id="card_type" label="Card Type" required error={errors.card_type?.message}>
              {(c) => (
                <Controller name="card_type" control={control} render={({ field }) => (
                  <RefPicker control={c} value={field.value} onChange={field.onChange} list={cardTypes} missingLabel={field.value} disabled={busy} />
                )} />
              )}
            </Field>
          </EditorSection>

          <EditorSection id="content" title="Content">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="title" label="Title" error={errors.title?.message}>{(c) => <TextInput {...c} placeholder="Item title" disabled={busy} {...register('title')} />}</Field>
              <Field id="subtitle" label="Subtitle" error={errors.subtitle?.message}>{(c) => <TextInput {...c} placeholder="Item subtitle" disabled={busy} {...register('subtitle')} />}</Field>
            </div>
            <Field id="description" label="Description" error={errors.description?.message} counter={{ value: v.description.length, max: 2000 }}>
              {(c) => <Textarea {...c} rows={3} placeholder="Item description" disabled={busy} className="bg-card aria-invalid:border-danger" {...register('description')} />}
            </Field>
          </EditorSection>

          <EditorSection id="tag" title="Tag">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="tag_label" label="Tag Label" error={errors.tag_label?.message}>{(c) => <TextInput {...c} placeholder="e.g. New, Popular" disabled={busy} {...register('tag_label')} />}</Field>
              {colour('tag_color', 'Tag Color', '#FF5733')}
            </div>
          </EditorSection>

          <EditorSection id="media" title="Media">
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageField label="Image" value={image} onChange={(x) => { setImage(x); setUploadError(null) }} aspect={16 / 9} uploadLabel="Upload image" cropTitle="Crop Image" progress={progress?.what === 'image' ? progress.pct : null} error={uploadError?.what === 'image' ? uploadError.text : undefined} disabled={busy || readOnly} />
              <ImageField label="Icon" value={icon} onChange={(x) => { setIcon(x); setUploadError(null) }} aspect={1} maxMb={2} uploadLabel="Upload icon" cropTitle="Crop Icon" progress={progress?.what === 'icon' ? progress.pct : null} error={uploadError?.what === 'icon' ? uploadError.text : undefined} disabled={busy || readOnly} previewClassName="max-w-[200px]" />
            </div>
            {removedMedia && <p className="text-xs text-muted-foreground">The removed picture is cleared when you save.</p>}
          </EditorSection>

          <EditorSection id="styling" title="Styling">
            <div className="grid gap-4 sm:grid-cols-3">
              {colour('background_color', 'Background Color', '#FFFFFF')}
              {colour('text_color', 'Text Color', '#000000')}
              {colour('border_color', 'Border Color', '#E5E7EB')}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {colour('button_color', 'Button Color', '#3B82F6')}
              {colour('button_text_color', 'Button Text Color', '#FFFFFF')}
            </div>
          </EditorSection>

          <EditorSection id="primary" title="Primary Action">
            <ActionFields side="primary" register={register} control={control} setValue={setValue} errors={errors} values={v} keptRoute={item?.internal_route} disabled={busy} />
          </EditorSection>
          <EditorSection id="secondary" title="Secondary Action">
            <ActionFields side="secondary" register={register} control={control} setValue={setValue} errors={errors} values={v} keptRoute={item?.secondary_internal_route} disabled={busy} />
          </EditorSection>

          <EditorSection
            id="metadata"
            title="Metadata"
            action={<Button type="button" variant="outline" size="sm" className="bg-card" disabled={busy} onClick={() => append({ label: '', value: '', icon_url: '' })}><Plus aria-hidden="true" />Add Entry</Button>}
          >
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">No entries.</p>
            ) : fields.map((f, i) => (
              <div key={f.id} className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-start sm:border-0 sm:p-0">
                <Field id={`meta-${i}-label`} label="Label" error={errors.metadata?.[i]?.label?.message}>{(c) => <TextInput {...c} placeholder="Label" disabled={busy} {...register(`metadata.${i}.label` as const)} />}</Field>
                <Field id={`meta-${i}-value`} label="Value" error={errors.metadata?.[i]?.value?.message}>{(c) => <TextInput {...c} placeholder="Value" disabled={busy} {...register(`metadata.${i}.value` as const)} />}</Field>
                <Field id={`meta-${i}-icon`} label="Icon URL">{(c) => <TextInput {...c} placeholder="Icon URL (optional)" disabled={busy} {...register(`metadata.${i}.icon_url` as const)} />}</Field>
                <Button type="button" variant="ghost" size="icon" className="text-danger hover:text-danger sm:mt-6" aria-label={`Remove entry ${i + 1}`} disabled={busy} onClick={() => remove(i)}><Trash2 /></Button>
              </div>
            ))}
          </EditorSection>

          <EditorSection id="settings" title="Settings">
            <Field id="display_order" label="Display Order" error={errors.display_order?.message} className="max-w-[320px]">
              {(c) => <UnitInput {...c} min={0} step={1} inputMode="numeric" disabled={busy} {...register('display_order', { setValueAs: asNumber })} />}
            </Field>
            <Controller name="is_active" control={control} render={({ field }) => (
              <SwitchRow id="is_active" label="Active" description={field.value ? 'Item is visible' : 'Item is hidden'} checked={field.value} onChange={field.onChange} disabled={busy} />
            )} />
          </EditorSection>
        </div>
      </EditorPage>
      {stale.dock}
    </>
  )
}

interface ActionFieldsProps {
  side: 'primary' | 'secondary'
  register: UseFormRegister<ItemFormValues>
  control: Control<ItemFormValues>
  setValue: UseFormSetValue<ItemFormValues>
  errors: FieldErrors<ItemFormValues>
  values: ItemFormValues
  keptRoute?: string | null
  disabled?: boolean
}

function ActionFields({ side, register, control, setValue, errors, values, keptRoute, disabled }: ActionFieldsProps) {
  const a = values[side]
  const second = side === 'secondary'
  const target = TARGET[a.action]
  const theory = useOptions(loadPackagesOfType('theory'), a.action === 'theory_package')
  const practical = useOptions(loadPackagesOfType('practical'), a.action === 'practical_package')
  const ebooks = useOptions(loadEbooks, a.action === 'ebook')
  const sessions = useOptions(loadUpcomingSessions, a.action === 'live_session')
  const lists = { theory_package: theory, practical_package: practical, ebook: ebooks, live_session: sessions }
  const choices = keptRoute && !knowsRoute(keptRoute)
    ? [...ACTIONS, { value: 'other' as ClickAction, label: 'Other screen', help: `Opens ${keptRoute} in the app. It stays as it is unless you choose another action.` }]
    : ACTIONS
  const err = errors[side]
  return (
    <>
      <Field id={`${side}-button`} label={`${second ? 'Secondary ' : ''}Button Text`} error={err?.button_text?.message}>
        {(c) => <TextInput {...c} placeholder="e.g. View Details" disabled={disabled} {...register(`${side}.button_text` as const)} />}
      </Field>
      <Field id={`${side}-action`} label={`${second ? 'Secondary ' : ''}Click Action`} hint={choices.find((x) => x.value === a.action)?.help}>
        {(c) => (
          <Controller name={`${side}.action` as const} control={control} render={({ field }) => (
            <SelectControl control={c} value={field.value} onChange={(x) => { field.onChange(x); setValue(`${side}.target` as const, '', { shouldDirty: true }) }} disabled={disabled} choices={choices} />
          )} />
        )}
      </Field>
      {a.action === 'external_url' && (
        <Field id={`${side}-url`} label="External URL" required error={err?.url?.message}>
          {(c) => <TextInput {...c} type="url" inputMode="url" placeholder="https://..." disabled={disabled} {...register(`${side}.url` as const)} />}
        </Field>
      )}
      {target && (
        <Field id={`${side}-target`} label={target.label} required error={err?.target?.message}>
          {(c) => (
            <Controller name={`${side}.target` as const} control={control} render={({ field }) => (
              <RefPicker key={a.action} control={c} value={field.value} onChange={field.onChange} list={lists[a.action as keyof typeof lists]} placeholder={target.placeholder} emptyText={target.empty} missingLabel={target.missing} disabled={disabled} />
            )} />
          )}
        </Field>
      )}
    </>
  )
}
