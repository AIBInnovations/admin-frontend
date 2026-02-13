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
import { Series, SeriesFormData } from '@/services/series.service'
import { Package, packagesService } from '@/services/packages.service'

const seriesSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  package_id: z.string().min(1, 'Package is required'),
  display_order: z.number().int().min(0).optional().or(z.nan()),
  is_active: z.boolean(),
})

type SeriesFormValues = z.infer<typeof seriesSchema>

interface SeriesFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: SeriesFormData) => Promise<void>
  series?: Series | null
  mode: 'create' | 'edit'
  defaultPackageId?: string
}

export function SeriesFormModal({ open, onClose, onSubmit, series, mode, defaultPackageId }: SeriesFormModalProps) {
  const [packages, setPackages] = useState<Package[]>([])

  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<SeriesFormValues>({
    resolver: zodResolver(seriesSchema),
    defaultValues: {
      name: '', description: '', package_id: '',
      display_order: 0, is_active: true,
    },
  })

  const isActive = watch('is_active')

  // Fetch packages for dropdown
  useEffect(() => {
    if (open) {
      packagesService.getAll({ limit: 100 }).then((res) => {
        if (res.success && res.data) setPackages(res.data.entities)
      })
    }
  }, [open])

  // Reset form
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && series) {
        reset({
          name: series.name,
          description: series.description,
          package_id: typeof series.package_id === 'object' ? series.package_id._id : series.package_id,
          display_order: series.display_order,
          is_active: series.is_active,
        })
      } else {
        reset({
          name: '', description: '', package_id: defaultPackageId || '',
          display_order: 0, is_active: true,
        })
      }
    }
  }, [open, mode, series, reset, defaultPackageId])

  const handleFormSubmit = async (data: SeriesFormValues) => {
    try {
      const formData: SeriesFormData = {
        name: data.name,
        description: data.description,
        package_id: data.package_id,
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
          <DialogTitle>{mode === 'create' ? 'Create Series' : 'Edit Series'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new series within a package.' : 'Update the series details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input id="name" placeholder="e.g., Upper Limb Series" disabled={isSubmitting} {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <Textarea id="description" placeholder="Series description..." rows={3} disabled={isSubmitting} {...register('description')} />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          {/* Package */}
          <div className="space-y-2">
            <Label>Package <span className="text-red-500">*</span></Label>
            <Controller
              name="package_id" control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting || (mode === 'create' && !!defaultPackageId)}>
                  <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                  <SelectContent>
                    {packages.map((p) => (
                      <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.package_id && <p className="text-sm text-red-500">{errors.package_id.message}</p>}
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
                {isActive ? 'Series is visible to users' : 'Series is hidden from users'}
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
                <>{mode === 'create' ? 'Create Series' : 'Update Series'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
