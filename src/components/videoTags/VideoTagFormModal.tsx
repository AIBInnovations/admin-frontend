import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { apiErrorMessage } from '@/components/common/detail'
import { VideoTag, VideoTagFormData } from '@/services/videoTags.service'
import { focusFirstInvalid } from '@/components/forms/editor/EditorPage'
import { Field, Note, TextInput } from '@/components/forms/editor/fields'

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Keep the name under 100 characters'),
  category: z.string().trim().max(100, 'Keep the category under 100 characters'),
})
type Values = z.infer<typeof schema>

interface VideoTagFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: VideoTagFormData) => Promise<void>
  tag?: VideoTag | null
  mode: 'create' | 'edit'
  /** Categories already in use, offered while typing. */
  categories?: string[]
  readOnly?: boolean
}

/** Opens as a full page (the Dialog's page variant). */
export function VideoTagFormModal({ open, onClose, onSubmit, tag, mode, categories = [], readOnly }: VideoTagFormModalProps) {
  const root = useRef<HTMLFormElement>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting: busy } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', category: '' },
    shouldFocusError: false,
  })

  useEffect(() => {
    if (!open) return
    setFailure(null)
    reset(mode === 'edit' && tag ? { name: tag.name, category: tag.category || '' } : { name: '', category: '' })
  }, [open, mode, tag, reset])

  const save = async (data: Values) => {
    setFailure(null)
    try {
      // An empty string clears the category of an existing tag
      await onSubmit({ name: data.name, category: data.category || (mode === 'edit' && tag?.category ? '' : undefined) })
      onClose()
    } catch (e) {
      setFailure(apiErrorMessage(e, 'The tag could not be saved. Please try again.'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose() }} guardUnsaved={!readOnly}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Tag' : 'Edit Tag'}</DialogTitle>
          <DialogDescription>{mode === 'create' ? 'Add a new video tag.' : 'Update the tag details below.'}</DialogDescription>
        </DialogHeader>
        <form ref={root} noValidate onSubmit={handleSubmit(save, () => focusFirstInvalid(root.current))} className="space-y-6">
          <fieldset disabled={readOnly} className="grid gap-4 rounded-xl border border-border bg-card p-5 shadow-card sm:grid-cols-2">
            <Field id="tag-name" label="Name" required error={errors.name?.message}>
              {(c) => <TextInput {...c} placeholder="e.g., Cardiology" disabled={busy} {...register('name')} />}
            </Field>
            <Field id="tag-category" label="Category" error={errors.category?.message} hint="Optional grouping for the tag">
              {(c) => <TextInput {...c} list="tag-categories" placeholder="e.g., Specialty" disabled={busy} {...register('category')} />}
            </Field>
            <datalist id="tag-categories">{categories.map((x) => <option key={x} value={x} />)}</datalist>
          </fieldset>
          {failure && <Note tone="danger">{failure}</Note>}
          <DialogFooter>
            <Button type="button" variant="outline" className="bg-card" onClick={onClose} disabled={busy}>{readOnly ? 'Back' : 'Cancel'}</Button>
            {!readOnly && (
              <Button type="submit" disabled={busy}>
                {busy ? <><Loader2 aria-hidden="true" className="animate-spin" />{mode === 'create' ? 'Creating...' : 'Updating...'}</> : mode === 'create' ? 'Create Tag' : 'Update Tag'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
