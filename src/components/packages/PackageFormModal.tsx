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
import { Package, PackageFormData } from '@/services/packages.service'
import { Subject, subjectsService } from '@/services/subjects.service'
import { PackageType, packageTypesService } from '@/services/packageTypes.service'

const packageSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  subject_id: z.string().min(1, 'Subject is required'),
  package_type_id: z.string().min(1, 'Package type is required'),
  price: z.number({ error: 'Price is required' }).min(0, 'Price must be non-negative'),
  original_price: z.number().min(0).optional().nullable(),
  is_on_sale: z.boolean(),
  sale_price: z.number().min(0).optional().nullable(),
  sale_end_date: z.string().optional().or(z.literal('')),
  duration_days: z.number({ error: 'Duration is required' }).int().min(1, 'Minimum 1 day'),
  features: z.string().max(2000).optional().or(z.literal('')),
  display_order: z.number().int().min(0).optional().or(z.nan()),
  is_active: z.boolean(),
}).refine(
  (data) => !data.is_on_sale || (data.sale_price && data.sale_price > 0),
  { message: 'Sale price is required when on sale', path: ['sale_price'] },
)

type PackageFormValues = z.infer<typeof packageSchema>

interface PackageFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: PackageFormData) => Promise<void>
  pkg?: Package | null
  mode: 'create' | 'edit'
  defaultSubjectId?: string
}

export function PackageFormModal({ open, onClose, onSubmit, pkg, mode, defaultSubjectId }: PackageFormModalProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([])

  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: '', description: '', subject_id: '', package_type_id: '',
      price: 0, original_price: null, is_on_sale: false,
      sale_price: null, sale_end_date: '', duration_days: 365,
      features: '', display_order: 0, is_active: true,
    },
  })

  const isOnSale = watch('is_on_sale')
  const isActive = watch('is_active')

  // Fetch dropdown data
  useEffect(() => {
    if (open) {
      subjectsService.getSubjects({ limit: 100, sort_by: 'name', sort_order: 'asc' }).then((res) => {
        if (res.success && res.data) setSubjects(res.data.entities)
      })
      packageTypesService.getAllPublic().then((res) => {
        if (res.success && res.data) setPackageTypes(res.data)
      })
    }
  }, [open])

  // Reset form
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && pkg) {
        reset({
          name: pkg.name,
          description: pkg.description,
          subject_id: typeof pkg.subject_id === 'object' ? pkg.subject_id._id : pkg.subject_id,
          package_type_id: typeof pkg.package_type_id === 'object' ? pkg.package_type_id._id : pkg.package_type_id,
          price: pkg.price,
          original_price: pkg.original_price,
          is_on_sale: pkg.is_on_sale,
          sale_price: pkg.sale_price,
          sale_end_date: pkg.sale_end_date ? pkg.sale_end_date.split('T')[0] : '',
          duration_days: pkg.duration_days,
          features: pkg.features || '',
          display_order: pkg.display_order,
          is_active: pkg.is_active,
        })
      } else {
        reset({
          name: '', description: '', subject_id: defaultSubjectId || '', package_type_id: '',
          price: 0, original_price: null, is_on_sale: false,
          sale_price: null, sale_end_date: '', duration_days: 365,
          features: '', display_order: 0, is_active: true,
        })
      }
    }
  }, [open, mode, pkg, reset, defaultSubjectId])

  const handleFormSubmit = async (data: PackageFormValues) => {
    try {
      const formData: PackageFormData = {
        name: data.name,
        description: data.description,
        subject_id: data.subject_id,
        package_type_id: data.package_type_id,
        price: data.price,
        original_price: data.original_price || undefined,
        is_on_sale: data.is_on_sale,
        sale_price: data.is_on_sale ? data.sale_price : undefined,
        sale_end_date: data.is_on_sale && data.sale_end_date ? data.sale_end_date : undefined,
        duration_days: data.duration_days,
        features: data.features || undefined,
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
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Package' : 'Edit Package'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new course package.' : 'Update the package details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input id="name" placeholder="e.g., Anatomy Complete Course" disabled={isSubmitting} {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <Textarea id="description" placeholder="Package description..." rows={3} disabled={isSubmitting} {...register('description')} />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          {/* Subject + Package Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subject <span className="text-red-500">*</span></Label>
              <Controller
                name="subject_id" control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting || (mode === 'create' && !!defaultSubjectId)}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.subject_id && <p className="text-sm text-red-500">{errors.subject_id.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Package Type <span className="text-red-500">*</span></Label>
              <Controller
                name="package_type_id" control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {packageTypes.map((t) => (
                        <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.package_type_id && <p className="text-sm text-red-500">{errors.package_type_id.message}</p>}
            </div>
          </div>

          {/* Price + Duration */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (INR) <span className="text-red-500">*</span></Label>
              <Input id="price" type="number" min={0} disabled={isSubmitting} {...register('price', { valueAsNumber: true })} />
              {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="original_price">Original Price</Label>
              <Input id="original_price" type="number" min={0} placeholder="MRP" disabled={isSubmitting} {...register('original_price', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_days">Duration (days) <span className="text-red-500">*</span></Label>
              <Input id="duration_days" type="number" min={1} disabled={isSubmitting} {...register('duration_days', { valueAsNumber: true })} />
              {errors.duration_days && <p className="text-sm text-red-500">{errors.duration_days.message}</p>}
            </div>
          </div>

          {/* Sale Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_on_sale" className="text-base">On Sale</Label>
              <p className="text-sm text-muted-foreground">
                {isOnSale ? 'Package is on sale' : 'No sale pricing applied'}
              </p>
            </div>
            <Switch
              id="is_on_sale" checked={isOnSale}
              onCheckedChange={(checked) => {
                setValue('is_on_sale', checked)
                if (!checked) { setValue('sale_price', null); setValue('sale_end_date', '') }
              }}
              disabled={isSubmitting}
            />
          </div>

          {/* Sale Price + End Date */}
          {isOnSale && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sale_price">Sale Price (INR) <span className="text-red-500">*</span></Label>
                <Input id="sale_price" type="number" min={0} disabled={isSubmitting} {...register('sale_price', { valueAsNumber: true })} />
                {errors.sale_price && <p className="text-sm text-red-500">{errors.sale_price.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale_end_date">Sale End Date</Label>
                <Input id="sale_end_date" type="date" disabled={isSubmitting} {...register('sale_end_date')} />
              </div>
            </div>
          )}

          {/* Features */}
          <div className="space-y-2">
            <Label htmlFor="features">Features</Label>
            <Textarea id="features" placeholder="One feature per line..." rows={3} disabled={isSubmitting} {...register('features')} />
            <p className="text-xs text-muted-foreground">Enter features separated by commas or new lines</p>
          </div>

          {/* Display Order + Active */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input id="display_order" type="number" min={0} disabled={isSubmitting} {...register('display_order', { valueAsNumber: true })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="is_active" className="text-sm">Active</Label>
                <p className="text-xs text-muted-foreground">
                  {isActive ? 'Visible to users' : 'Hidden from users'}
                </p>
              </div>
              <Switch
                id="is_active" checked={isActive}
                onCheckedChange={(checked) => setValue('is_active', checked)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Create Package' : 'Update Package'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
