import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { Module, ModuleFormData } from '@/services/modules.service'
import { Series, seriesService } from '@/services/series.service'

const moduleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  series_id: z.string().min(1, 'Series is required'),
  display_order: z.number().int().min(0).optional().or(z.nan()),
  is_active: z.boolean(),
})

type ModuleFormValues = z.infer<typeof moduleSchema>

interface ModuleFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ModuleFormData) => Promise<void>
  module?: Module | null
  mode: 'create' | 'edit'
  defaultSeriesId?: string
}

export function ModuleFormModal({ open, onClose, onSubmit, module: mod, mode, defaultSeriesId }: ModuleFormModalProps) {
  const [seriesList, setSeriesList] = useState<Series[]>([])

  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      name: '', description: '', series_id: '',
      display_order: 0, is_active: true,
    },
  })

  const isActive = watch('is_active')

  // Fetch series for dropdown
  useEffect(() => {
    if (open) {
      seriesService.getAll({ limit: 100 }).then((res) => {
        if (res.success && res.data) setSeriesList(res.data.entities)
      })
    }
  }, [open])

  // Reset form
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && mod) {
        reset({
          name: mod.name,
          description: mod.description,
          series_id: typeof mod.series_id === 'object' ? mod.series_id._id : mod.series_id,
          display_order: mod.display_order,
          is_active: mod.is_active,
        })
      } else {
        reset({
          name: '', description: '', series_id: defaultSeriesId || '',
          display_order: 0, is_active: true,
        })
      }
    }
  }, [open, mode, mod, reset, defaultSeriesId])

  const handleFormSubmit = async (data: ModuleFormValues) => {
    try {
      const formData: ModuleFormData = {
        name: data.name,
        description: data.description,
        series_id: data.series_id,
        display_order: data.display_order || undefined,
        is_active: data.is_active,
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Module' : 'Edit Module'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new module within a series.' : 'Update the module details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input id="name" placeholder="e.g., Shoulder Joint Module" disabled={isSubmitting} {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <Textarea id="description" placeholder="Module description..." rows={3} disabled={isSubmitting} {...register('description')} />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          {/* Series */}
          <div className="space-y-2">
            <Label>Series <span className="text-red-500">*</span></Label>
            <Controller
              name="series_id" control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting || (mode === 'create' && !!defaultSeriesId)}>
                  <SelectTrigger><SelectValue placeholder="Select series" /></SelectTrigger>
                  <SelectContent>
                    {seriesList.map((s) => (
                      <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.series_id && <p className="text-sm text-red-500">{errors.series_id.message}</p>}
          </div>

          {/* Display Order */}
          <div className="space-y-2">
            <Label htmlFor="display_order">Display Order</Label>
            <Input id="display_order" type="number" min={0} disabled={isSubmitting} {...register('display_order', { valueAsNumber: true })} />
            <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-base">Active Status</Label>
              <p className="text-sm text-muted-foreground">
                {isActive ? 'Module is visible to users' : 'Module is hidden from users'}
              </p>
            </div>
            <Switch id="is_active" checked={isActive} onCheckedChange={(checked) => setValue('is_active', checked)} disabled={isSubmitting} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Create Module' : 'Update Module'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
