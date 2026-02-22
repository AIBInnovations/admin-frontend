import { useEffect, useState } from 'react'
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
import { Progress } from '@/components/ui/progress'
import { FileUpload } from '@/components/common/FileUpload'
import { ImageCropper } from '@/components/common/ImageCropper'
import { Loader2, X } from 'lucide-react'
import { Banner, BannerFormData, bannersService } from '@/services/banners.service'
import { toast } from 'sonner'

/** Banner aspect ratio: full-width x 140px on phone (~360px wide) ≈ 18:7 */
const BANNER_ASPECT_RATIO = 18 / 7

const bannerSchema = z.object({
  title: z.string().min(2, 'Title is required').max(200),
  subtitle: z.string().max(300).optional().or(z.literal('')),
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
  const [imageFile, setImageFile] = useState<File[]>([])
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [existingS3Key, setExistingS3Key] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [cropperFile, setCropperFile] = useState<File | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Manage preview URL for cropped image
  useEffect(() => {
    if (imageFile.length > 0) {
      const url = URL.createObjectURL(imageFile[0])
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [imageFile])

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      title: '', subtitle: '', click_url: '',
      display_order: NaN, is_active: true, start_date: '', end_date: '',
    },
  })

  const isActive = watch('is_active')

  useEffect(() => {
    if (open) {
      setImageFile([])
      setUploadProgress(null)
      setImageError(null)
      if (mode === 'edit' && banner) {
        reset({
          title: banner.title,
          subtitle: banner.subtitle || '',
          click_url: banner.click_url || '',
          display_order: banner.display_order,
          is_active: banner.is_active,
          start_date: banner.start_date ? new Date(banner.start_date).toISOString().split('T')[0] : '',
          end_date: banner.end_date ? new Date(banner.end_date).toISOString().split('T')[0] : '',
        })
        setExistingImageUrl(banner.image_url)
        setExistingS3Key(banner.image_s3_key)
      } else {
        reset({
          title: '', subtitle: '', click_url: '',
          display_order: NaN, is_active: true,
          start_date: new Date().toISOString().split('T')[0], end_date: '',
        })
        setExistingImageUrl(null)
        setExistingS3Key(null)
      }
    }
  }, [open, mode, banner, reset])

  const hasImage = imageFile.length > 0 || !!existingImageUrl

  const handleFormSubmit = async (data: BannerFormValues) => {
    // Validate image
    if (!hasImage) {
      setImageError('Banner image is required')
      return
    }
    setImageError(null)

    try {
      let imageUrl = existingImageUrl || ''
      let imageS3Key = existingS3Key || undefined

      // Upload new image if selected
      if (imageFile.length > 0) {
        setUploadProgress(0)
        try {
          const result = await bannersService.uploadImage(imageFile[0], setUploadProgress)
          imageUrl = result.imageUrl
          imageS3Key = result.s3Key
        } catch (err: any) {
          toast.error(err.message || 'Failed to upload image')
          setUploadProgress(null)
          return
        }
        setUploadProgress(null)
      }

      const formData: BannerFormData = {
        title: data.title,
        subtitle: data.subtitle || undefined,
        image_url: imageUrl,
        image_s3_key: imageS3Key,
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

  const handleClose = () => { if (!isSubmitting && uploadProgress === null) onClose() }

  const handleRemoveExistingImage = () => {
    setExistingImageUrl(null)
    setExistingS3Key(null)
  }

  const handleFileSelected = (files: File[]) => {
    if (files.length > 0) {
      setCropperFile(files[0])
      setShowCropper(true)
    }
    setImageError(null)
  }

  const handleCropComplete = (croppedFile: File) => {
    setImageFile([croppedFile])
    setShowCropper(false)
    setCropperFile(null)
    setImageError(null)
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    setCropperFile(null)
  }

  const isUploading = uploadProgress !== null

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Banner' : 'Edit Banner'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Create a new promotional banner.' : 'Update the banner details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input id="title" placeholder="Banner title" disabled={isSubmitting || isUploading} {...register('title')} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input id="subtitle" placeholder="Optional subtitle" disabled={isSubmitting || isUploading} {...register('subtitle')} />
          </div>

          {/* Banner Image Upload */}
          <div className="space-y-2">
            <Label>Banner Image <span className="text-red-500">*</span></Label>
            {imageFile.length > 0 ? (
              <div className="relative rounded-lg border overflow-hidden">
                <img src={previewUrl!} alt="Cropped banner" className="w-full h-32 object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => setImageFile([])}
                  disabled={isSubmitting || isUploading}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <p className="text-xs text-muted-foreground px-3 py-1.5 bg-muted/80">
                  Cropped image ready. Click X to choose a different one.
                </p>
              </div>
            ) : existingImageUrl ? (
              <div className="relative rounded-lg border overflow-hidden">
                <img src={existingImageUrl} alt="Banner" className="w-full h-32 object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={handleRemoveExistingImage}
                  disabled={isSubmitting || isUploading}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <p className="text-xs text-muted-foreground px-3 py-1.5 bg-muted/80">
                  Current image. Upload a new one to replace.
                </p>
              </div>
            ) : (
              <FileUpload
                accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }}
                maxSize={5 * 1024 * 1024}
                maxFiles={1}
                value={[]}
                onChange={handleFileSelected}
                disabled={isSubmitting || isUploading}
                label="Upload banner image"
                description="JPEG, PNG, or WebP. Max 5MB. Will be cropped to banner ratio."
              />
            )}
            {uploadProgress !== null && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
              </div>
            )}
            {imageError && <p className="text-sm text-red-500">{imageError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="click_url">Click URL</Label>
            <Input id="click_url" placeholder="https://..." disabled={isSubmitting || isUploading} {...register('click_url')} />
            {errors.click_url && <p className="text-sm text-red-500">{errors.click_url.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date <span className="text-red-500">*</span></Label>
              <Input id="start_date" type="date" disabled={isSubmitting || isUploading} {...register('start_date')} />
              {errors.start_date && <p className="text-sm text-red-500">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input id="end_date" type="date" disabled={isSubmitting || isUploading} {...register('end_date')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_order">Order</Label>
              <Input id="display_order" type="number" min={0} disabled={isSubmitting || isUploading} {...register('display_order', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-sm">Active</Label>
              <p className="text-xs text-muted-foreground">{isActive ? 'Banner is visible' : 'Banner is hidden'}</p>
            </div>
            <Switch id="is_active" checked={isActive} onCheckedChange={(c) => setValue('is_active', c)} disabled={isSubmitting || isUploading} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting || isUploading}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting || isUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isUploading ? 'Uploading...' : mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Add Banner' : 'Update Banner'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Image Cropper Dialog */}
    <ImageCropper
      file={cropperFile}
      open={showCropper}
      onClose={handleCropCancel}
      onCropComplete={handleCropComplete}
      aspectRatio={BANNER_ASPECT_RATIO}
      title="Crop Banner Image"
      description="Adjust the crop area to fit the banner dimensions (18:7 ratio)."
    />
    </>
  )
}
