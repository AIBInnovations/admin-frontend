import { useEffect, useState } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
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
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Package, PackageFormData } from '@/services/packages.service'
import { Subject, subjectsService } from '@/services/subjects.service'
import { PackageType, packageTypesService } from '@/services/packageTypes.service'

const tierSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  duration_days: z.number({ error: 'Required' }).int().min(1, 'Min 1 day'),
  price: z.number({ error: 'Required' }).min(0, 'Min 0'),
  display_order: z.number().int().min(0).optional().or(z.nan()),
})

const packageSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  subject_id: z.string().min(1, 'Subject is required'),
  package_type_id: z.string().min(1, 'Package type is required'),
  price: z.number({ error: 'Price is required' }).min(0, 'Price must be non-negative'),
  original_price: z.number().min(0).optional().nullable(),
  is_on_sale: z.boolean(),
  sale_price: z.number().min(0).optional().nullable(),
  sale_discount_percent: z.number().min(0).max(100).optional().nullable(),
  sale_end_date: z.string().optional().or(z.literal('')),
  duration_days: z.number({ error: 'Duration is required' }).int().min(1, 'Minimum 1 day'),
  features: z.string().max(2000).optional().or(z.literal('')),
  display_order: z.number().int().min(0).optional().or(z.nan()),
  is_active: z.boolean(),
  tiers: z.array(tierSchema),
}).refine(
  (data) => {
    if (!data.is_on_sale) return true
    if (data.tiers.length > 0) {
      return data.sale_discount_percent != null && data.sale_discount_percent > 0
    }
    return data.sale_price != null && data.sale_price > 0
  },
  {
    message: 'Sale pricing is required when on sale',
    path: ['sale_price'],
  },
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
      sale_price: null, sale_discount_percent: null, sale_end_date: '',
      duration_days: 365, features: '', display_order: 0, is_active: true,
      tiers: [],
    },
  })

  const { fields: tierFields, append: appendTier, remove: removeTier } = useFieldArray({
    control,
    name: 'tiers',
  })

  const isOnSale = watch('is_on_sale')
  const isActive = watch('is_active')
  const tiers = watch('tiers')
  const hasTiers = tiers.length > 0

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
        const existingTiers = (pkg.tiers || []).map((t, i) => ({
          name: t.name,
          duration_days: t.duration_days,
          price: t.price,
          display_order: t.display_order ?? i,
        }))
        reset({
          name: pkg.name,
          description: pkg.description,
          subject_id: typeof pkg.subject_id === 'object' ? pkg.subject_id._id : pkg.subject_id,
          package_type_id: typeof pkg.package_type_id === 'object' ? pkg.package_type_id._id : pkg.package_type_id,
          price: pkg.price,
          original_price: pkg.original_price,
          is_on_sale: pkg.is_on_sale,
          sale_price: pkg.sale_price,
          sale_discount_percent: pkg.sale_discount_percent,
          sale_end_date: pkg.sale_end_date ? pkg.sale_end_date.split('T')[0] : '',
          duration_days: pkg.duration_days,
          features: pkg.features || '',
          display_order: pkg.display_order,
          is_active: pkg.is_active,
          tiers: existingTiers,
        })
      } else {
        reset({
          name: '', description: '', subject_id: defaultSubjectId || '', package_type_id: '',
          price: 0, original_price: null, is_on_sale: false,
          sale_price: null, sale_discount_percent: null, sale_end_date: '',
          duration_days: 365, features: '', display_order: 0, is_active: true,
          tiers: [],
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
        duration_days: data.duration_days,
        features: data.features || undefined,
        display_order: data.display_order || undefined,
        is_active: data.is_active,
        tiers: data.tiers.length > 0
          ? data.tiers.map((t, i) => ({ ...t, display_order: t.display_order || i }))
          : [],
      }

      // Sale pricing: multi-tier uses discount %, single-tier uses absolute sale_price
      if (data.is_on_sale) {
        if (data.tiers.length > 0) {
          formData.sale_discount_percent = data.sale_discount_percent
          formData.sale_price = undefined
        } else {
          formData.sale_price = data.sale_price
          formData.sale_discount_percent = undefined
        }
        formData.sale_end_date = data.sale_end_date || undefined
      } else {
        formData.sale_price = undefined
        formData.sale_discount_percent = undefined
        formData.sale_end_date = undefined
      }

      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleClose = () => { if (!isSubmitting) onClose() }

  const addTier = () => {
    appendTier({ name: '', duration_days: 90, price: 0, display_order: tierFields.length })
  }

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

          {/* Price + Duration (base/fallback fields) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Base Price (INR) <span className="text-red-500">*</span></Label>
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

          {hasTiers && (
            <p className="text-xs text-muted-foreground -mt-2">
              Base price and duration are used as fallback when tiers are empty. Each tier defines its own price and duration.
            </p>
          )}

          {/* Pricing Tiers */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Pricing Tiers</Label>
                <p className="text-sm text-muted-foreground">
                  {hasTiers
                    ? `${tiers.length} tier${tiers.length > 1 ? 's' : ''} configured`
                    : 'No tiers — single price/duration package'}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addTier} disabled={isSubmitting || tiers.length >= 10}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Tier
              </Button>
            </div>

            {tierFields.map((field, index) => (
              <div key={field.id} className="rounded-md border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Tier {index + 1}</span>
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeTier(index)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="e.g., 3 Months"
                      disabled={isSubmitting}
                      {...register(`tiers.${index}.name`)}
                    />
                    {errors.tiers?.[index]?.name && (
                      <p className="text-xs text-red-500">{errors.tiers[index].name?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Duration (days) <span className="text-red-500">*</span></Label>
                    <Input
                      type="number" min={1}
                      disabled={isSubmitting}
                      {...register(`tiers.${index}.duration_days`, { valueAsNumber: true })}
                    />
                    {errors.tiers?.[index]?.duration_days && (
                      <p className="text-xs text-red-500">{errors.tiers[index].duration_days?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Price (INR) <span className="text-red-500">*</span></Label>
                    <Input
                      type="number" min={0}
                      disabled={isSubmitting}
                      {...register(`tiers.${index}.price`, { valueAsNumber: true })}
                    />
                    {errors.tiers?.[index]?.price && (
                      <p className="text-xs text-red-500">{errors.tiers[index].price?.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Order</Label>
                    <Input
                      type="number" min={0}
                      disabled={isSubmitting}
                      {...register(`tiers.${index}.display_order`, { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>
            ))}
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
                if (!checked) {
                  setValue('sale_price', null)
                  setValue('sale_discount_percent', null)
                  setValue('sale_end_date', '')
                }
              }}
              disabled={isSubmitting}
            />
          </div>

          {/* Sale Pricing — conditional on single-tier vs multi-tier */}
          {isOnSale && (
            <div className="grid grid-cols-2 gap-4">
              {hasTiers ? (
                <div className="space-y-2">
                  <Label htmlFor="sale_discount_percent">Discount % <span className="text-red-500">*</span></Label>
                  <Input
                    id="sale_discount_percent" type="number" min={0} max={100} step={0.1}
                    placeholder="e.g., 20"
                    disabled={isSubmitting}
                    {...register('sale_discount_percent', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">Applied uniformly to all tier prices</p>
                  {errors.sale_price && <p className="text-sm text-red-500">{errors.sale_price.message}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="sale_price">Sale Price (INR) <span className="text-red-500">*</span></Label>
                  <Input id="sale_price" type="number" min={0} disabled={isSubmitting} {...register('sale_price', { valueAsNumber: true })} />
                  {errors.sale_price && <p className="text-sm text-red-500">{errors.sale_price.message}</p>}
                </div>
              )}
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
