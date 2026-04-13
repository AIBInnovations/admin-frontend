import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
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
import { Loader2, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Series, SeriesFormData, seriesService } from '@/services/series.service'
import { Package, packagesService } from '@/services/packages.service'
import { ImageUploadWithCrop } from '@/components/common/ImageUploadWithCrop'

const seriesSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  package_id: z.string().min(1, 'Package is required'),
  display_order: z.number().int().min(0).optional().or(z.nan()),
  is_active: z.boolean(),
  publish_status: z.enum(['draft', 'published']),
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
  const [packagePopoverOpen, setPackagePopoverOpen] = useState(false)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)

  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<SeriesFormValues>({
    resolver: zodResolver(seriesSchema),
    defaultValues: {
      name: '', description: '', package_id: '',
      display_order: 0, is_active: true, publish_status: 'draft' as const,
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
      setThumbnailFile(null)
      if (mode === 'edit' && series) {
        reset({
          name: series.name,
          description: series.description,
          package_id: typeof series.package_id === 'object' ? series.package_id._id : series.package_id,
          display_order: series.display_order,
          is_active: series.is_active,
          publish_status: series.publish_status || 'draft',
        })
      } else {
        reset({
          name: '', description: '', package_id: defaultPackageId || '',
          display_order: 0, is_active: true, publish_status: 'draft' as const,
        })
      }
    }
  }, [open, mode, series, reset, defaultPackageId])

  /**
   * Upload thumbnail to S3 via presigned URL (3-step flow)
   */
  const uploadThumbnail = async (file: File): Promise<{ thumbnail_url: string; thumbnail_s3_key: string } | null> => {
    const mimeType = file.type || 'image/jpeg'

    const urlRes = await seriesService.getThumbnailUploadUrl(mimeType)
    if (!urlRes.success || !urlRes.data) {
      throw new Error(urlRes.message || 'Failed to get thumbnail upload URL')
    }
    const { uploadUrl, s3Key, thumbnailUrl } = urlRes.data

    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': mimeType },
    })

    return { thumbnail_url: thumbnailUrl, thumbnail_s3_key: s3Key }
  }

  const handleFormSubmit = async (data: SeriesFormValues) => {
    try {
      // Upload thumbnail first if provided
      let thumbnailData: { thumbnail_url: string; thumbnail_s3_key: string } | null = null
      if (thumbnailFile) {
        thumbnailData = await uploadThumbnail(thumbnailFile)
      }

      const formData: SeriesFormData = {
        name: data.name,
        description: data.description,
        package_id: data.package_id,
        display_order: data.display_order || undefined,
        is_active: data.is_active,
        publish_status: data.publish_status,
        ...(thumbnailData && {
          thumbnail_url: thumbnailData.thumbnail_url,
          thumbnail_s3_key: thumbnailData.thumbnail_s3_key,
        }),
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
      <DialogContent className="sm:max-w-[540px]">
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
                <Popover open={packagePopoverOpen} onOpenChange={setPackagePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline" role="combobox"
                      disabled={isSubmitting || (mode === 'create' && !!defaultPackageId)}
                      className="w-full justify-between font-normal h-9"
                    >
                      <span className="truncate">
                        {field.value ? packages.find(p => p._id === field.value)?.name || 'Select package' : 'Select package'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search packages..." />
                      <CommandList>
                        <CommandEmpty>No packages found.</CommandEmpty>
                        <CommandGroup>
                          {packages.map((p) => (
                            <CommandItem
                              key={p._id}
                              value={p.name}
                              onSelect={() => {
                                field.onChange(p._id)
                                setPackagePopoverOpen(false)
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', field.value === p._id ? 'opacity-100' : 'opacity-0')} />
                              <span className="flex items-center gap-2">
                                {p.name}
                                {p.publish_status === 'draft' && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Draft</span>
                                )}
                                {p.is_active === false && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">Inactive</span>
                                )}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
            <p className="text-xs text-muted-foreground">
              All items shown including drafts and inactive
            </p>
            {errors.package_id && <p className="text-sm text-red-500">{errors.package_id.message}</p>}
          </div>

          {/* Thumbnail */}
          <div className="space-y-2">
            <Label>Thumbnail</Label>
            <ImageUploadWithCrop
              value={thumbnailFile}
              onChange={setThumbnailFile}
              aspectRatio={16 / 9}
              maxSize={5 * 1024 * 1024}
              label="Upload thumbnail"
              description="Recommended ratio: 16:9. Max 5MB. JPEG, PNG, or WebP."
              disabled={isSubmitting}
              currentImageUrl={mode === 'edit' ? series?.thumbnail_url : undefined}
            />
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

          {/* Publish Status */}
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
