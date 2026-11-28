import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/components/common/detail'
import { endOfIstDay } from '@/lib/format'
import { HomeSection, HomeSectionFormData } from '@/services/homeSections.service'
import { EditorSection, focusFirstInvalid } from '@/components/forms/editor/EditorPage'
import { Field, Note, SelectControl, SwitchRow, TextInput, UnitInput } from '@/components/forms/editor/fields'
import { EVERYONE, VisibilityFields, visibilityError, visibilityPayload, type VisibilityValue } from '@/components/forms/editor/pickers'
import { storedDay } from '@/components/forms/editor/ist'
import { ColorInput, hexProblem } from './ColorInput'

interface SectionFormValues {
  title: string
  subtitle: string
  background_color: string
  text_color: string
  display_order: number | null
  is_active: boolean
  publish_status: 'draft' | 'published'
  start_date: string
  end_date: string
}

const schema = z.custom<SectionFormValues>().superRefine((d, ctx) => {
  const fail = (path: keyof SectionFormValues, message: string) => ctx.addIssue({ code: 'custom', message, path: [path] })
  if (d.title.trim().length > 200) fail('title', 'Keep the title under 200 characters')
  if (d.subtitle.trim().length > 300) fail('subtitle', 'Keep the subtitle under 300 characters')
  for (const key of ['background_color', 'text_color'] as const) {
    const problem = hexProblem(d[key].trim())
    if (problem) fail(key, problem)
  }
  if (d.start_date && d.end_date && d.end_date < d.start_date) fail('end_date', 'End date is before the start date')
  if (d.display_order != null && (!Number.isInteger(d.display_order) || d.display_order < 0)) fail('display_order', 'Enter a whole number, 0 or more')
})

const BLANK: SectionFormValues = { title: '', subtitle: '', background_color: '', text_color: '', display_order: null, is_active: true, publish_status: 'draft', start_date: '', end_date: '' }
const toValues = (s: HomeSection): SectionFormValues => ({
  title: s.title || '', subtitle: s.subtitle || '', background_color: s.background_color || '', text_color: s.text_color || '',
  display_order: s.display_order ?? null, is_active: s.is_active, publish_status: s.publish_status || 'draft',
  start_date: storedDay(s.start_date), end_date: storedDay(s.end_date),
})
const asNumber = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v))

interface HomeSectionFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: HomeSectionFormData) => Promise<void>
  section?: HomeSection | null
  mode: 'create' | 'edit'
}

/** Opens as a full page (the Dialog's page variant). */
export function HomeSectionFormModal({ open, onClose, onSubmit, section, mode }: HomeSectionFormModalProps) {
  const root = useRef<HTMLFormElement>(null)
  const [visibility, setVisibility] = useState<VisibilityValue>(EVERYONE)
  const [tried, setTried] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting: busy } } = useForm<SectionFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: BLANK,
    shouldFocusError: false,
  })
  const v = watch()
  const saved = mode === 'edit' ? section : null

  useEffect(() => {
    if (!open) return
    reset(saved ? toValues(saved) : BLANK)
    setVisibility(saved ? { to: saved.visible_to || 'all', subjects: saved.visible_to_subjects || [], packages: saved.visible_to_packages || [] } : EVERYONE)
    setTried(false)
    setFailure(null)
  }, [open, saved, reset])

  const visError = tried ? visibilityError(visibility) : undefined
  const onInvalid = () => { setTried(true); focusFirstInvalid(root.current) }

  const save = async (d: SectionFormValues) => {
    setTried(true)
    setFailure(null)
    if (visibilityError(visibility)) { focusFirstInvalid(root.current); return }
    try {
      await onSubmit({
        // An empty string clears the text of an existing section
        title: d.title.trim() || (saved ? '' : undefined),
        subtitle: d.subtitle.trim() || (saved ? '' : undefined),
        // A removed colour or date is sent as null, which clears it
        background_color: d.background_color.trim() || (saved?.background_color ? null : undefined),
        text_color: d.text_color.trim() || (saved?.text_color ? null : undefined),
        ...visibilityPayload(visibility),
        display_order: d.display_order ?? undefined,
        is_active: d.is_active,
        publish_status: d.publish_status,
        start_date: d.start_date || (saved?.start_date ? null : undefined),
        end_date: d.end_date ? endOfIstDay(d.end_date) : saved?.end_date ? null : undefined,
      })
      onClose()
    } catch (e) {
      setFailure(apiErrorMessage(e, 'The section could not be saved. Please try again.'))
    }
  }


  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose() }}>
      <DialogContent size="wide">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Home Section' : 'Edit Home Section'}</DialogTitle>
          <DialogDescription>{mode === 'create' ? 'Create a new section on the app home screen.' : 'Update the section details.'}</DialogDescription>
        </DialogHeader>

        <form ref={root} noValidate onSubmit={handleSubmit(save, onInvalid)} className="space-y-6">
          <EditorSection title="Basics">
            <Field id="hs-title" label="Title" error={errors.title?.message} counter={{ value: v.title.length, max: 200 }}>
              {(c) => <TextInput {...c} placeholder="Section title (optional)" disabled={busy} {...register('title')} />}
            </Field>
            <Field id="hs-subtitle" label="Subtitle" error={errors.subtitle?.message} counter={{ value: v.subtitle.length, max: 300 }}>
              {(c) => <TextInput {...c} placeholder="Optional subtitle" disabled={busy} {...register('subtitle')} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="hs-bg" label="Background Color" error={errors.background_color?.message}>
                {(c) => <ColorInput {...c} swatch={v.background_color} onPick={(h) => setValue('background_color', h, { shouldDirty: true, shouldValidate: tried })} placeholder="#FFFFFF" disabled={busy} {...register('background_color')} />}
              </Field>
              <Field id="hs-text" label="Text Color" error={errors.text_color?.message}>
                {(c) => <ColorInput {...c} swatch={v.text_color} onPick={(h) => setValue('text_color', h, { shouldDirty: true, shouldValidate: tried })} placeholder="#000000" disabled={busy} {...register('text_color')} />}
              </Field>
            </div>
          </EditorSection>

          <EditorSection title="Access" description="Who sees it in the app.">
            <VisibilityFields noun="Section" value={visibility} onChange={setVisibility} error={visError} disabled={busy} />
          </EditorSection>

          <EditorSection title="Dates and order" description="India time. The end date is the last day it shows.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="hs-start" label="Start Date" error={errors.start_date?.message}>
                {(c) => <TextInput {...c} type="date" disabled={busy} {...register('start_date')} />}
              </Field>
              <Field id="hs-end" label="End Date" error={errors.end_date?.message}>
                {(c) => <TextInput {...c} type="date" min={v.start_date || undefined} disabled={busy} {...register('end_date')} />}
              </Field>
              <Field id="hs-order" label="Order" error={errors.display_order?.message}>
                {(c) => <UnitInput {...c} min={0} step={1} inputMode="numeric" disabled={busy} {...register('display_order', { setValueAs: asNumber })} />}
              </Field>
            </div>
          </EditorSection>

          <EditorSection title="Publishing">
            <Controller name="is_active" control={control} render={({ field }) => (
              <SwitchRow id="hs-active" label="Active" description={field.value ? 'Section is visible on the home screen' : 'Section is hidden'} checked={field.value} onChange={field.onChange} disabled={busy} />
            )} />
            <Field id="hs-publish" label="Publish Status" hint="Draft content is only visible to admins. Publish when ready for users." className="max-w-[320px]">
              {(c) => (
                <Controller name="publish_status" control={control} render={({ field }) => (
                  <SelectControl control={c} value={field.value} onChange={field.onChange} disabled={busy} choices={[{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }]} />
                )} />
              )}
            </Field>
          </EditorSection>

          {failure && <Note tone="danger">{failure}</Note>}
          <DialogFooter>
            <Button type="button" variant="outline" className="bg-card" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy ? <><Loader2 aria-hidden="true" className="animate-spin" />{mode === 'create' ? 'Creating...' : 'Updating...'}</> : mode === 'create' ? 'Add Section' : 'Update Section'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
