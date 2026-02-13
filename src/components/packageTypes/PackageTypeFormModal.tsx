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
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { PackageType, PackageTypeFormData } from '@/services/packageTypes.service'

const packageTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().min(2, 'Description is required').max(500),
  trailer_video_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  thumbnail_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
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
  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PackageTypeFormValues>({
    resolver: zodResolver(packageTypeSchema),
    defaultValues: {
      name: '', description: '', trailer_video_url: '', thumbnail_url: '',
    },
  })

  // Reset form
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && packageType) {
        reset({
          name: packageType.name,
          description: packageType.description,
          trailer_video_url: packageType.trailer_video_url || '',
          thumbnail_url: packageType.thumbnail_url || '',
        })
      } else {
        reset({ name: '', description: '', trailer_video_url: '', thumbnail_url: '' })
      }
    }
  }, [open, mode, packageType, reset])

  const handleFormSubmit = async (data: PackageTypeFormValues) => {
    try {
      const formData: PackageTypeFormData = {
        name: data.name,
        description: data.description,
        trailer_video_url: data.trailer_video_url || null,
        thumbnail_url: data.thumbnail_url || null,
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
      <DialogContent className="sm:max-w-[480px]">
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

          {/* Trailer Video URL */}
          <div className="space-y-2">
            <Label htmlFor="trailer_video_url">Trailer Video URL</Label>
            <Input id="trailer_video_url" placeholder="https://..." disabled={isSubmitting} {...register('trailer_video_url')} />
            {errors.trailer_video_url && <p className="text-sm text-red-500">{errors.trailer_video_url.message}</p>}
          </div>

          {/* Thumbnail URL */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
            <Input id="thumbnail_url" placeholder="https://..." disabled={isSubmitting} {...register('thumbnail_url')} />
            {errors.thumbnail_url && <p className="text-sm text-red-500">{errors.thumbnail_url.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Creating...' : 'Updating...'}</>
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
