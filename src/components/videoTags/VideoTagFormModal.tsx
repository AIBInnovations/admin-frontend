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
import { Loader2 } from 'lucide-react'
import { VideoTag, VideoTagFormData } from '@/services/videoTags.service'

const videoTagSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  category: z.string().max(100).optional().or(z.literal('')),
})

type VideoTagFormValues = z.infer<typeof videoTagSchema>

interface VideoTagFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: VideoTagFormData) => Promise<void>
  tag?: VideoTag | null
  mode: 'create' | 'edit'
}

export function VideoTagFormModal({ open, onClose, onSubmit, tag, mode }: VideoTagFormModalProps) {
  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<VideoTagFormValues>({
    resolver: zodResolver(videoTagSchema),
    defaultValues: { name: '', category: '' },
  })

  // Reset form
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && tag) {
        reset({ name: tag.name, category: tag.category || '' })
      } else {
        reset({ name: '', category: '' })
      }
    }
  }, [open, mode, tag, reset])

  const handleFormSubmit = async (data: VideoTagFormValues) => {
    try {
      const formData: VideoTagFormData = {
        name: data.name,
        category: data.category || undefined,
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
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Tag' : 'Edit Tag'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new video tag.' : 'Update the tag details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input id="name" placeholder="e.g., Cardiology" disabled={isSubmitting} {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" placeholder="e.g., Specialty" disabled={isSubmitting} {...register('category')} />
            {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
            <p className="text-xs text-muted-foreground">Optional grouping for the tag</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Create Tag' : 'Update Tag'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
