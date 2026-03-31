import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { Tutorial, TutorialFormData } from '@/services/tutorials.service'
import { Subject, subjectsService } from '@/services/subjects.service'

const tutorialSchema = z.object({
  title: z.string().min(2, 'Title is required').max(300),
  url: z.string().url('Must be a valid URL'),
  type: z.enum(['video', 'pdf']),
  description: z.string().max(1000).optional().or(z.literal('')),
  display_order: z.number().int().min(0).optional().or(z.nan()),
  is_active: z.boolean(),
  publish_status: z.enum(['draft', 'published']).default('draft'),
})

type TutorialFormValues = z.infer<typeof tutorialSchema>

interface TutorialFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: TutorialFormData) => Promise<void>
  tutorial?: Tutorial | null
  mode: 'create' | 'edit'
}

export function TutorialFormModal({ open, onClose, onSubmit, tutorial, mode }: TutorialFormModalProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')

  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<TutorialFormValues>({
    resolver: zodResolver(tutorialSchema),
    defaultValues: {
      title: '', url: '', type: 'video', description: '',
      display_order: NaN, is_active: true, publish_status: 'draft',
    },
  })

  const isActive = watch('is_active')

  useEffect(() => {
    if (open) {
      fetchSubjects()
      if (mode === 'edit' && tutorial) {
        reset({
          title: tutorial.title,
          url: tutorial.url,
          type: tutorial.type,
          description: tutorial.description || '',
          display_order: tutorial.display_order,
          is_active: tutorial.is_active,
          publish_status: tutorial.publish_status || 'draft',
        })
        const subjectRef = tutorial.subject_id
        if (subjectRef && typeof subjectRef === 'object' && '_id' in subjectRef) {
          setSelectedSubjectId(subjectRef._id)
        } else if (typeof subjectRef === 'string') {
          setSelectedSubjectId(subjectRef)
        } else {
          setSelectedSubjectId('')
        }
      } else {
        reset({
          title: '', url: '', type: 'video', description: '',
          display_order: NaN, is_active: true, publish_status: 'draft',
        })
        setSelectedSubjectId('')
      }
    }
  }, [open, mode, tutorial, reset])

  const fetchSubjects = async () => {
    setSubjectsLoading(true)
    try {
      const response = await subjectsService.getSubjects({ is_active: true, limit: 100 })
      if (response.success && response.data) {
        setSubjects(response.data.entities || [])
      }
    } catch {
      console.error('Failed to fetch subjects')
    }
    setSubjectsLoading(false)
  }

  const handleFormSubmit = async (data: TutorialFormValues) => {
    const formData: TutorialFormData = {
      title: data.title,
      url: data.url,
      type: data.type,
      description: data.description || undefined,
      subject_id: selectedSubjectId && selectedSubjectId !== 'none' ? selectedSubjectId : null,
      display_order: data.display_order && !isNaN(data.display_order) ? data.display_order : undefined,
      is_active: data.is_active,
      publish_status: data.publish_status,
    }
    await onSubmit(formData)
  }

  const handleClose = () => { if (!isSubmitting) onClose() }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Tutorial' : 'Edit Tutorial'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a free tutorial link (video or PDF) visible to all users.'
              : 'Update the tutorial details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input id="title" placeholder="e.g. Introduction to Anatomy - Free Lecture" disabled={isSubmitting} {...register('title')} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL <span className="text-red-500">*</span></Label>
            <Input id="url" placeholder="https://..." disabled={isSubmitting} {...register('url')} />
            {errors.url && <p className="text-sm text-red-500">{errors.url.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Type <span className="text-red-500">*</span></Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Select
              value={selectedSubjectId}
              onValueChange={setSelectedSubjectId}
              disabled={isSubmitting || subjectsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={subjectsLoading ? 'Loading subjects...' : 'All Subjects (optional)'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject._id} value={subject._id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Optionally restrict this tutorial to a specific subject.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description..."
              disabled={isSubmitting}
              rows={3}
              {...register('description')}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              min={0}
              placeholder="0"
              disabled={isSubmitting}
              {...register('display_order', { valueAsNumber: true })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-sm">Active</Label>
              <p className="text-xs text-muted-foreground">{isActive ? 'Tutorial is visible' : 'Tutorial is hidden'}</p>
            </div>
            <Switch id="is_active" checked={isActive} onCheckedChange={(c) => setValue('is_active', c)} disabled={isSubmitting} />
          </div>

          <div className="space-y-2">
            <Label>Publish Status</Label>
            <Controller
              name="publish_status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Only published tutorials are visible to app users.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Add Tutorial' : 'Update Tutorial'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
