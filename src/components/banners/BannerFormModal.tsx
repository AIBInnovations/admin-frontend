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
import { Banner, BannerFormData } from '@/services/banners.service'

const bannerSchema = z.object({
  title: z.string().min(2, 'Title is required').max(200),
  subtitle: z.string().max(300).optional().or(z.literal('')),
  image_url: z.string().url('Must be a valid URL'),
  click_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  display_order: z.number().int().min(0).optional().or(z.nan()),
  is_active: z.boolean(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().or(z.literal('')),
})

type BannerFormValues = z.infer<typeof bannerSchema>

interface BannerFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: BannerFormData) => Promise<void>
  banner?: Banner | null
  mode: 'create' | 'edit'
}

export function BannerFormModal({ open, onClose, onSubmit, banner, mode }: BannerFormModalProps) {
  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      title: '', subtitle: '', image_url: '', click_url: '',
      display_order: NaN, is_active: true, start_date: '', end_date: '',
    },
  })

  const isActive = watch('is_active')

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && banner) {
        reset({
          title: banner.title,
          subtitle: banner.subtitle || '',
          image_url: banner.image_url,
          click_url: banner.click_url || '',
          display_order: banner.display_order,
          is_active: banner.is_active,
          start_date: banner.start_date ? new Date(banner.start_date).toISOString().split('T')[0] : '',
          end_date: banner.end_date ? new Date(banner.end_date).toISOString().split('T')[0] : '',
        })
      } else {
        reset({
          title: '', subtitle: '', image_url: '', click_url: '',
          display_order: NaN, is_active: true,
          start_date: new Date().toISOString().split('T')[0], end_date: '',
        })
      }
    }
  }, [open, mode, banner, reset])

  const handleFormSubmit = async (data: BannerFormValues) => {
    try {
      const formData: BannerFormData = {
        title: data.title,
        subtitle: data.subtitle || undefined,
        image_url: data.image_url,
        click_url: data.click_url || undefined,
        display_order: data.display_order && !isNaN(data.display_order) ? data.display_order : undefined,
        is_active: data.is_active,
        start_date: data.start_date,
        end_date: data.end_date || undefined,
      }
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleClose = () => { if (!isSubmitting) onClose() }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Banner' : 'Edit Banner'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Create a new promotional banner.' : 'Update the banner details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input id="title" placeholder="Banner title" disabled={isSubmitting} {...register('title')} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input id="subtitle" placeholder="Optional subtitle" disabled={isSubmitting} {...register('subtitle')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL <span className="text-red-500">*</span></Label>
            <Input id="image_url" placeholder="https://..." disabled={isSubmitting} {...register('image_url')} />
            {errors.image_url && <p className="text-sm text-red-500">{errors.image_url.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="click_url">Click URL</Label>
            <Input id="click_url" placeholder="https://..." disabled={isSubmitting} {...register('click_url')} />
            {errors.click_url && <p className="text-sm text-red-500">{errors.click_url.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date <span className="text-red-500">*</span></Label>
              <Input id="start_date" type="date" disabled={isSubmitting} {...register('start_date')} />
              {errors.start_date && <p className="text-sm text-red-500">{errors.start_date.message}</p>}
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
              <p className="text-xs text-muted-foreground">{isActive ? 'Banner is visible' : 'Banner is hidden'}</p>
            </div>
            <Switch id="is_active" checked={isActive} onCheckedChange={(c) => setValue('is_active', c)} disabled={isSubmitting} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Add Banner' : 'Update Banner'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
