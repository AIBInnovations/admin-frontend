import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { HomeSection, HomeSectionFormData } from '@/services/homeSections.service'

const hexColorRegex = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/

const sectionSchema = z.object({
  title: z.string().max(200).optional().or(z.literal('')),
  subtitle: z.string().max(300).optional().or(z.literal('')),
  background_color: z.string().regex(hexColorRegex, 'Invalid hex (e.g. #FF0000)').optional().or(z.literal('')),
  text_color: z.string().regex(hexColorRegex, 'Invalid hex (e.g. #FF0000)').optional().or(z.literal('')),
  display_order: z.number().int().min(0).optional().or(z.nan()),
  is_active: z.boolean(),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
})

type SectionFormValues = z.infer<typeof sectionSchema>

interface HomeSectionFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: HomeSectionFormData) => Promise<void>
  section?: HomeSection | null
  mode: 'create' | 'edit'
}

function ColorSwatch({ color }: { color: string }) {
  const isValid = hexColorRegex.test(color)
  return (
    <div
      className="h-8 w-8 rounded border border-border shrink-0"
      style={{ backgroundColor: isValid ? color : '#e5e7eb' }}
    />
  )
}

export function HomeSectionFormModal({ open, onClose, onSubmit, section, mode }: HomeSectionFormModalProps) {
  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<SectionFormValues>({
    resolver: zodResolver(sectionSchema),
    defaultValues: {
      title: '', subtitle: '',
      background_color: '', text_color: '',
      display_order: NaN, is_active: true,
      start_date: '', end_date: '',
    },
  })

  const isActive = watch('is_active')
  const bgColor = watch('background_color') || ''
  const txtColor = watch('text_color') || ''

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && section) {
        reset({
          title: section.title || '',
          subtitle: section.subtitle || '',
          background_color: section.background_color || '',
          text_color: section.text_color || '',
          display_order: section.display_order,
          is_active: section.is_active,
          start_date: section.start_date ? new Date(section.start_date).toISOString().split('T')[0] : '',
          end_date: section.end_date ? new Date(section.end_date).toISOString().split('T')[0] : '',
        })
      } else {
        reset({
          title: '', subtitle: '',
          background_color: '', text_color: '',
          display_order: NaN, is_active: true,
          start_date: '', end_date: '',
        })
      }
    }
  }, [open, mode, section, reset])

  const handleFormSubmit = async (data: SectionFormValues) => {
    const formData: HomeSectionFormData = {
      title: data.title || undefined,
      subtitle: data.subtitle || undefined,
      background_color: data.background_color || undefined,
      text_color: data.text_color || undefined,
      display_order: typeof data.display_order === 'number' && !isNaN(data.display_order) ? data.display_order : undefined,
      is_active: data.is_active,
      start_date: data.start_date || undefined,
      end_date: data.end_date || undefined,
    }
    await onSubmit(formData)
    onClose()
  }

  const handleClose = () => { if (!isSubmitting) onClose() }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Home Section' : 'Edit Home Section'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new section on the app home screen.'
              : 'Update the section details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Section title (optional)" disabled={isSubmitting} {...register('title')} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input id="subtitle" placeholder="Optional subtitle" disabled={isSubmitting} {...register('subtitle')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="background_color">Background Color</Label>
              <div className="flex items-center gap-2">
                <Input id="background_color" placeholder="#FFFFFF" disabled={isSubmitting} {...register('background_color')} />
                <ColorSwatch color={bgColor} />
              </div>
              {errors.background_color && <p className="text-sm text-red-500">{errors.background_color.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="text_color">Text Color</Label>
              <div className="flex items-center gap-2">
                <Input id="text_color" placeholder="#000000" disabled={isSubmitting} {...register('text_color')} />
                <ColorSwatch color={txtColor} />
              </div>
              {errors.text_color && <p className="text-sm text-red-500">{errors.text_color.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input id="start_date" type="date" disabled={isSubmitting} {...register('start_date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input id="end_date" type="date" disabled={isSubmitting} {...register('end_date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_order">Order</Label>
              <Input id="display_order" type="number" min={0} disabled={isSubmitting} {...register('display_order', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-sm">Active</Label>
              <p className="text-xs text-muted-foreground">
                {isActive ? 'Section is visible on the home screen' : 'Section is hidden'}
              </p>
            </div>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(c) => setValue('is_active', c)}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Add Section' : 'Update Section'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
