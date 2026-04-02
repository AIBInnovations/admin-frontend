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
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2, Plus, Trash2, Check, ChevronsUpDown, ImageIcon, Film } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Package, PackageFormData, packagesService } from '@/services/packages.service'
import { Subject, subjectsService } from '@/services/subjects.service'
import { PackageType, packageTypesService } from '@/services/packageTypes.service'
import { FileUpload } from '@/components/common/FileUpload'
import { ImageUploadWithCrop } from '@/components/common/ImageUploadWithCrop'
import { toast } from 'sonner'

const tierSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  duration_days: z.number({ error: 'Required' }).int().min(1, 'Min 1 day'),
  price: z.number({ error: 'Required' }).min(0, 'Min 0'),
  original_price: z.number().min(0).optional().nullable().or(z.nan()),
  display_order: z.number().int().min(0).optional().or(z.nan()),
})

const packageSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  subject_id: z.string().min(1, 'Subject is required'),
  package_type_id: z.string().min(1, 'Package type is required'),
  price: z.number({ error: 'Price is required' }).min(0, 'Price must be non-negative'),
  original_price: z.number().min(0).optional().nullable().or(z.nan()),
  is_on_sale: z.boolean(),
  sale_price: z.number().min(0).optional().nullable().or(z.nan()),
  sale_discount_percent: z.number().min(0).max(100).optional().nullable().or(z.nan()),
  sale_end_date: z.string().optional().or(z.literal('')),
  duration_days: z.number({ error: 'Duration is required' }).int().min(1, 'Minimum 1 day'),
  features: z.string().max(2000).optional().or(z.literal('')),
  display_order: z.number().int().min(0).optional().or(z.nan()),
  is_active: z.boolean(),
  publish_status: z.enum(['draft', 'published']),
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
  const [trailerFile, setTrailerFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [videoLecturesThumbnailFile, setVideoLecturesThumbnailFile] = useState<File | null>(null)
  const [notesThumbnailFile, setNotesThumbnailFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [isReplacingTrailer, setIsReplacingTrailer] = useState(false)
  const [subjectPopoverOpen, setSubjectPopoverOpen] = useState(false)
  const [typePopoverOpen, setTypePopoverOpen] = useState(false)

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
      publish_status: 'draft' as const,
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
      setTrailerFile(null)
      setThumbnailFile(null)
      setVideoLecturesThumbnailFile(null)
      setNotesThumbnailFile(null)
      setUploadProgress(null)
      setIsReplacingTrailer(false)
      if (mode === 'edit' && pkg) {
        const existingTiers = (pkg.tiers || []).map((t, i) => ({
          name: t.name,
          duration_days: t.duration_days,
          price: t.price,
          original_price: t.original_price ?? null,
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
          publish_status: pkg.publish_status || 'draft',
          tiers: existingTiers,
        })
      } else {
        reset({
          name: '', description: '', subject_id: defaultSubjectId || '', package_type_id: '',
          price: 0, original_price: null, is_on_sale: false,
          sale_price: null, sale_discount_percent: null, sale_end_date: '',
          duration_days: 365, features: '', display_order: 0, is_active: true,
          publish_status: 'draft' as const,
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
        publish_status: data.publish_status,
        tiers: data.tiers.length > 0
          ? data.tiers.map((t, i) => ({ ...t, original_price: t.original_price || null, display_order: t.display_order || i }))
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

      // Upload trailer and thumbnail if provided (edit mode only, since we need the package ID)
      if (mode === 'edit' && pkg?._id) {
        if (trailerFile) {
          try {
            setUploadProgress(0)
            await packagesService.uploadTrailer(pkg._id, trailerFile, setUploadProgress)
            toast.success('Trailer uploaded successfully')
          } catch (err) {
            console.error('Trailer upload error:', err)
            toast.error('Failed to upload trailer video')
          } finally {
            setUploadProgress(null)
          }
        }

        if (thumbnailFile) {
          try {
            await packagesService.uploadThumbnail(pkg._id, thumbnailFile)
            toast.success('Thumbnail uploaded successfully')
          } catch (err) {
            console.error('Thumbnail upload error:', err)
            toast.error('Failed to upload thumbnail')
          }
        }

        if (videoLecturesThumbnailFile) {
          try {
            await packagesService.uploadSectionThumbnail(pkg._id, videoLecturesThumbnailFile, 'video_lectures')
            toast.success('Video lectures thumbnail uploaded')
          } catch (err) {
            console.error('Video lectures thumbnail upload error:', err)
            toast.error('Failed to upload video lectures thumbnail')
          }
        }

        if (notesThumbnailFile) {
          try {
            await packagesService.uploadSectionThumbnail(pkg._id, notesThumbnailFile, 'notes')
            toast.success('Notes thumbnail uploaded')
          } catch (err) {
            console.error('Notes thumbnail upload error:', err)
            toast.error('Failed to upload notes thumbnail')
          }
        }
      }

      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleClose = () => { if (!isSubmitting) onClose() }

  const addTier = () => {
    appendTier({ name: '', duration_days: 90, price: 0, original_price: null, display_order: tierFields.length })
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

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
          {/* ── Basic Info ── */}
          <fieldset className="rounded-lg border p-4 space-y-4">
            <legend className="px-2 text-sm font-semibold text-muted-foreground">Basic Info</legend>

            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input id="name" placeholder="e.g., Anatomy Complete Course" disabled={isSubmitting} {...register('name')} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
              <Textarea id="description" placeholder="Package description..." rows={3} disabled={isSubmitting} {...register('description')} />
              {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject <span className="text-red-500">*</span></Label>
                <Controller
                  name="subject_id" control={control}
                  render={({ field }) => (
                    <Popover open={subjectPopoverOpen} onOpenChange={setSubjectPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline" role="combobox"
                          disabled={isSubmitting || (mode === 'create' && !!defaultSubjectId)}
                          className="w-full justify-between font-normal h-9"
                        >
                          <span className="truncate">
                            {field.value ? subjects.find(s => s._id === field.value)?.name || 'Select subject' : 'Select subject'}
                          </span>
                          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[260px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search subjects..." />
                          <CommandList>
                            <CommandEmpty>No subjects found.</CommandEmpty>
                            <CommandGroup>
                              {subjects.map((s) => (
                                <CommandItem
                                  key={s._id}
                                  value={s.name}
                                  onSelect={() => {
                                    field.onChange(s._id)
                                    setSubjectPopoverOpen(false)
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', field.value === s._id ? 'opacity-100' : 'opacity-0')} />
                                  {s.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.subject_id && <p className="text-sm text-red-500">{errors.subject_id.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Package Type <span className="text-red-500">*</span></Label>
                <Controller
                  name="package_type_id" control={control}
                  render={({ field }) => (
                    <Popover open={typePopoverOpen} onOpenChange={setTypePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline" role="combobox"
                          disabled={isSubmitting}
                          className="w-full justify-between font-normal h-9"
                        >
                          <span className="truncate">
                            {field.value ? packageTypes.find(t => t._id === field.value)?.name || 'Select type' : 'Select type'}
                          </span>
                          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[260px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search types..." />
                          <CommandList>
                            <CommandEmpty>No types found.</CommandEmpty>
                            <CommandGroup>
                              {packageTypes.map((t) => (
                                <CommandItem
                                  key={t._id}
                                  value={t.name}
                                  onSelect={() => {
                                    field.onChange(t._id)
                                    setTypePopoverOpen(false)
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', field.value === t._id ? 'opacity-100' : 'opacity-0')} />
                                  {t.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.package_type_id && <p className="text-sm text-red-500">{errors.package_type_id.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="features">Features</Label>
              <Textarea id="features" placeholder="One feature per line..." rows={3} disabled={isSubmitting} {...register('features')} />
              <p className="text-xs text-muted-foreground">Enter features separated by commas or new lines</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input id="display_order" type="number" min={0} disabled={isSubmitting} {...register('display_order', { valueAsNumber: true })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
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

            <div className="space-y-2">
              <Label>Publish Status</Label>
              <Select
                value={watch('publish_status')}
                onValueChange={(value) => setValue('publish_status', value as 'draft' | 'published')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Draft content is only visible to admins. Publish when ready for users.
              </p>
            </div>
          </fieldset>

          {/* ── Pricing ── */}
          <fieldset className="rounded-lg border p-4 space-y-4">
            <legend className="px-2 text-sm font-semibold text-muted-foreground">Pricing</legend>

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
              <p className="text-xs text-muted-foreground">
                Base price and duration are used as fallback when tiers are empty. Each tier defines its own price and duration.
              </p>
            )}

            {/* Pricing Tiers */}
            <div className="rounded-md border bg-muted/20 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Pricing Tiers</Label>
                  <p className="text-xs text-muted-foreground">
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
                <div key={field.id} className="rounded-md border bg-background p-3 space-y-2">
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
                  <div className="grid grid-cols-5 gap-3">
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
                      <Label className="text-xs">Compare At</Label>
                      <Input
                        type="number" min={0}
                        placeholder="MRP"
                        disabled={isSubmitting}
                        {...register(`tiers.${index}.original_price`, { valueAsNumber: true })}
                      />
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
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="is_on_sale" className="text-sm font-medium">On Sale</Label>
                <p className="text-xs text-muted-foreground">
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
          </fieldset>

          {/* ── Media (edit mode only) ── */}
          {mode === 'edit' && (
            <fieldset className="rounded-lg border p-4 space-y-4">
              <legend className="px-2 text-sm font-semibold text-muted-foreground">Media</legend>

              {/* Trailer + Package Thumbnail side by side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Trailer Video */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-xs">Trailer Video</Label>
                  </div>
                  {pkg?.trailer_video_url && !isReplacingTrailer ? (
                    <div className="rounded-md border p-3 bg-muted/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-green-600">✓</span>
                        <a
                          href={pkg.trailer_video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline truncate"
                        >
                          Trailer uploaded
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button" variant="outline" size="sm"
                          onClick={() => setIsReplacingTrailer(true)}
                          disabled={isSubmitting}
                          className="text-xs h-7"
                        >
                          Replace
                        </Button>
                        <Button
                          type="button" variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={isSubmitting}
                          onClick={async () => {
                            if (!confirm('Delete the trailer video?')) return
                            try {
                              await packagesService.deleteTrailer(pkg._id)
                              toast.success('Trailer deleted')
                              pkg.trailer_video_url = null
                            } catch {
                              toast.error('Failed to delete trailer')
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <FileUpload
                        accept={{ 'video/*': ['.mp4', '.mov', '.avi', '.webm'] }}
                        maxSize={500 * 1024 * 1024}
                        maxFiles={1}
                        value={trailerFile ? [trailerFile] : []}
                        onChange={(files) => setTrailerFile(files[0] || null)}
                        label="Upload trailer"
                        description="Max 500MB."
                        disabled={isSubmitting}
                      />
                      {uploadProgress !== null && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Package Thumbnail */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-xs">Package Thumbnail</Label>
                  </div>
                  <ImageUploadWithCrop
                    value={thumbnailFile}
                    onChange={setThumbnailFile}
                    aspectRatio={16 / 9}
                    maxSize={5 * 1024 * 1024}
                    label="Upload image"
                    description="16:9 ratio. Max 5MB."
                    disabled={isSubmitting}
                    currentImageUrl={pkg?.thumbnail_url}
                    onDelete={async () => {
                      if (!confirm('Delete the thumbnail image?')) return
                      try {
                        await packagesService.deleteThumbnail(pkg!._id)
                        toast.success('Thumbnail deleted')
                        pkg!.thumbnail_url = null
                      } catch {
                        toast.error('Failed to delete thumbnail')
                      }
                    }}
                  />
                </div>
              </div>

              <hr className="border-dashed" />

              {/* Section Thumbnails side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-xs">Video Lectures Thumbnail</Label>
                  </div>
                  <ImageUploadWithCrop
                    value={videoLecturesThumbnailFile}
                    onChange={setVideoLecturesThumbnailFile}
                    aspectRatio={16 / 9}
                    maxSize={5 * 1024 * 1024}
                    label="Upload image"
                    description="16:9 ratio."
                    disabled={isSubmitting}
                    currentImageUrl={pkg?.video_lectures_thumbnail_url}
                    onDelete={async () => {
                      if (!confirm('Delete video lectures thumbnail?')) return
                      try {
                        await packagesService.deleteSectionThumbnail(pkg!._id, 'video_lectures')
                        toast.success('Thumbnail deleted')
                        pkg!.video_lectures_thumbnail_url = null
                      } catch {
                        toast.error('Failed to delete thumbnail')
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-xs">Notes Thumbnail</Label>
                  </div>
                  <ImageUploadWithCrop
                    value={notesThumbnailFile}
                    onChange={setNotesThumbnailFile}
                    aspectRatio={16 / 9}
                    maxSize={5 * 1024 * 1024}
                    label="Upload image"
                    description="16:9 ratio."
                    disabled={isSubmitting}
                    currentImageUrl={pkg?.notes_thumbnail_url}
                    onDelete={async () => {
                      if (!confirm('Delete notes thumbnail?')) return
                      try {
                        await packagesService.deleteSectionThumbnail(pkg!._id, 'notes')
                        toast.success('Thumbnail deleted')
                        pkg!.notes_thumbnail_url = null
                      } catch {
                        toast.error('Failed to delete thumbnail')
                      }
                    }}
                  />
                </div>
              </div>
            </fieldset>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || uploadProgress !== null}>
              {isSubmitting || uploadProgress !== null ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadProgress !== null ? `Uploading ${uploadProgress}%` : mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
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
