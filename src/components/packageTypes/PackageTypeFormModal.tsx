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
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from '@/components/common/FileUpload'
import { ImageUploadWithCrop } from '@/components/common/ImageUploadWithCrop'
import { Loader2 } from 'lucide-react'
import { PackageType, PackageTypeFormData, packageTypesService } from '@/services/packageTypes.service'
import { toast } from 'sonner'

const packageTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().min(2, 'Description is required').max(500),
})

type PackageTypeFormValues = z.infer<typeof packageTypeSchema>

interface PackageTypeFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: PackageTypeFormData) => Promise<void>
  packageType?: PackageType | null
  mode: 'create' | 'edit'
}

export function PackageTypeFormModal({ open, onClose, onSubmit, packageType, mode }: PackageTypeFormModalProps) {
  const [trailerFile, setTrailerFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PackageTypeFormValues>({
    resolver: zodResolver(packageTypeSchema),
    defaultValues: {
      name: '', description: '',
    },
  })

  // Reset form
  useEffect(() => {
    if (open) {
      setTrailerFile(null)
      setThumbnailFile(null)
      setUploadProgress(null)
      if (mode === 'edit' && packageType) {
        reset({
          name: packageType.name,
          description: packageType.description,
        })
      } else {
        reset({ name: '', description: '' })
      }
    }
  }, [open, mode, packageType, reset])

  const handleFormSubmit = async (data: PackageTypeFormValues) => {
    try {
      const formData: PackageTypeFormData = {
        name: data.name,
        description: data.description,
      }

      // First create/update the package type
      await onSubmit(formData)

      // Then upload trailer and thumbnail if provided
      if (packageType?._id || mode === 'edit') {
        const typeId = packageType!._id

        if (trailerFile) {
          setUploadProgress(0)
          await packageTypesService.uploadTrailer(typeId, trailerFile, setUploadProgress)
          toast.success('Trailer uploaded successfully')
        }

        if (thumbnailFile) {
          await packageTypesService.uploadThumbnail(typeId, thumbnailFile)
          toast.success('Thumbnail uploaded successfully')
        }
      }

      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
      toast.error('Failed to save package type')
    } finally {
      setUploadProgress(null)
    }
  }

  const handleClose = () => { if (!isSubmitting) onClose() }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Package Type' : 'Edit Package Type'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a new package type (e.g. Theory, Practical).'
              : 'Update the package type details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input id="name" placeholder="e.g., Theory" disabled={isSubmitting} {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <Textarea id="description" placeholder="Brief description of this package type..." rows={3} disabled={isSubmitting} {...register('description')} />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          {/* Trailer Video Upload */}
          {mode === 'edit' && (
            <div className="space-y-2">
              <Label>Trailer Video (Optional)</Label>
              <FileUpload
                accept={{ 'video/*': ['.mp4', '.mov', '.avi', '.webm'] }}
                maxSize={500 * 1024 * 1024}
                maxFiles={1}
                value={trailerFile ? [trailerFile] : []}
                onChange={(files) => setTrailerFile(files[0] || null)}
                label="Upload trailer video"
                description="Max 500MB. Drag & drop or click to browse."
                disabled={isSubmitting}
              />
              {uploadProgress !== null && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
              {packageType?.trailer_video_url && !trailerFile && (
                <p className="text-xs text-muted-foreground">
                  Current: {packageType.trailer_video_url.substring(0, 50)}...
                </p>
              )}
            </div>
          )}

          {/* Thumbnail Upload with Crop */}
          {mode === 'edit' && (
            <div className="space-y-2">
              <Label>Thumbnail (Optional)</Label>
              <ImageUploadWithCrop
                value={thumbnailFile}
                onChange={setThumbnailFile}
                aspectRatio={4 / 5}
                maxSize={5 * 1024 * 1024}
                label="Upload thumbnail image"
                description="4:5 aspect ratio. Max 5MB."
                disabled={isSubmitting}
                currentImageUrl={packageType?.thumbnail_url}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || uploadProgress !== null}>
              {isSubmitting || uploadProgress !== null ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadProgress !== null ? `Uploading ${uploadProgress}%` : mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>{mode === 'create' ? 'Create Type' : 'Update Type'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
