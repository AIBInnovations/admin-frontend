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
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { FileUpload } from '@/components/common/FileUpload'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, X, Image, FileVideo } from 'lucide-react'
import { Tutorial, TutorialFormData, tutorialsService } from '@/services/tutorials.service'
import { Subject, subjectsService } from '@/services/subjects.service'
import { toast } from 'sonner'

const tutorialSchema = z.object({
  title: z.string().min(2, 'Title is required').max(300),
  url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
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
  const [selectedScreens, setSelectedScreens] = useState<string[]>(['notes'])

  // Thumbnail state
  const [thumbnailFile, setThumbnailFile] = useState<File[]>([])
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null)
  const [existingThumbnailS3Key, setExistingThumbnailS3Key] = useState<string | null>(null)
  const [thumbnailProgress, setThumbnailProgress] = useState<number | null>(null)

  // Media file state
  const [mediaFile, setMediaFile] = useState<File[]>([])
  const [existingMediaUrl, setExistingMediaUrl] = useState<string | null>(null)
  const [existingMediaMime, setExistingMediaMime] = useState<string | null>(null)
  const [existingMediaSize, setExistingMediaSize] = useState<number | null>(null)
  const [mediaProgress, setMediaProgress] = useState<number | null>(null)

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
  const tutorialType = watch('type')
  const isUploading = thumbnailProgress !== null || mediaProgress !== null

  useEffect(() => {
    if (open) {
      fetchSubjects()
      setThumbnailFile([])
      setThumbnailProgress(null)
      setMediaFile([])
      setMediaProgress(null)

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
        setSelectedScreens(tutorial.display_screens || ['notes'])
        setExistingThumbnailUrl(tutorial.thumbnail_url)
        setExistingThumbnailS3Key(tutorial.thumbnail_s3_key)
        setExistingMediaUrl(tutorial.media_url)
        setExistingMediaMime(tutorial.media_mime_type)
        setExistingMediaSize(tutorial.media_file_size_mb)
      } else {
        reset({
          title: '', url: '', type: 'video', description: '',
          display_order: NaN, is_active: true, publish_status: 'draft',
        })
        setSelectedSubjectId('')
        setSelectedScreens(['notes'])
        setExistingThumbnailUrl(null)
        setExistingThumbnailS3Key(null)
        setExistingMediaUrl(null)
        setExistingMediaMime(null)
        setExistingMediaSize(null)
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
    let thumbnailUrl = existingThumbnailUrl
    let thumbnailS3Key = existingThumbnailS3Key

    // Upload thumbnail if new file selected
    if (thumbnailFile.length > 0) {
      setThumbnailProgress(0)
      try {
        const result = await tutorialsService.uploadThumbnail(thumbnailFile[0], setThumbnailProgress)
        thumbnailUrl = result.thumbnailUrl
        thumbnailS3Key = result.s3Key
      } catch (err: any) {
        toast.error(err.message || 'Failed to upload thumbnail')
        setThumbnailProgress(null)
        return
      }
      setThumbnailProgress(null)
    }

    const formData: TutorialFormData = {
      title: data.title,
      url: data.url || undefined,
      type: data.type,
      description: data.description || undefined,
      subject_id: selectedSubjectId && selectedSubjectId !== 'none' ? selectedSubjectId : null,
      display_screens: selectedScreens.length > 0 ? selectedScreens : ['notes'],
      thumbnail_url: thumbnailUrl,
      thumbnail_s3_key: thumbnailS3Key,
      display_order: data.display_order && !isNaN(data.display_order) ? data.display_order : undefined,
      is_active: data.is_active,
      publish_status: data.publish_status,
    }
    await onSubmit(formData)
  }

  /**
   * Upload media file after tutorial is created/updated.
   * Called from parent after successful form submit when mediaFile is set.
   */
  const handleMediaUpload = async (tutorialId: string) => {
    if (mediaFile.length === 0) return
    setMediaProgress(0)
    try {
      await tutorialsService.uploadMedia(tutorialId, mediaFile[0], setMediaProgress)
      toast.success('Media file uploaded successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload media file')
    }
    setMediaProgress(null)
  }

  // Expose media upload handler via a wrapper submit
  const handleFullSubmit = async (data: TutorialFormValues) => {
    await handleFormSubmit(data)

    // If media file selected and we're editing an existing tutorial, upload it
    if (mediaFile.length > 0 && mode === 'edit' && tutorial?._id) {
      await handleMediaUpload(tutorial._id)
    }
  }

  const handleClose = () => { if (!isSubmitting && !isUploading) onClose() }

  const mediaAccept = tutorialType === 'video'
    ? { 'video/mp4': ['.mp4'], 'video/quicktime': ['.mov'], 'video/webm': ['.webm'] }
    : { 'application/pdf': ['.pdf'] }

  const mediaLabel = tutorialType === 'video' ? 'Upload video file' : 'Upload PDF file'
  const mediaDesc = tutorialType === 'video'
    ? 'MP4, MOV, or WebM. Max 500MB.'
    : 'PDF files only. Max 100MB.'
  const mediaMaxSize = tutorialType === 'video' ? 500 * 1024 * 1024 : 100 * 1024 * 1024

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Tutorial' : 'Edit Tutorial'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a free tutorial (video or PDF) visible to all users.'
              : 'Update the tutorial details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFullSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input id="title" placeholder="e.g. Introduction to Anatomy - Free Lecture" disabled={isSubmitting || isUploading} {...register('title')} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">External URL</Label>
            <Input id="url" placeholder="https://youtube.com/... (optional)" disabled={isSubmitting || isUploading} {...register('url')} />
            {errors.url && <p className="text-sm text-red-500">{errors.url.message}</p>}
            <p className="text-xs text-muted-foreground">
              Optional external link (e.g. YouTube). You can also upload a file below instead.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Type <span className="text-red-500">*</span></Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting || isUploading}>
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
          </div>

          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <Label>Thumbnail Image</Label>
            {thumbnailFile.length > 0 ? (
              <div className="relative rounded-lg border overflow-hidden">
                <img src={URL.createObjectURL(thumbnailFile[0])} alt="Thumbnail" className="w-full h-32 object-cover" />
                <Button
                  type="button" variant="destructive" size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => setThumbnailFile([])}
                  disabled={isSubmitting || isUploading}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : existingThumbnailUrl ? (
              <div className="relative rounded-lg border overflow-hidden">
                <img src={existingThumbnailUrl} alt="Thumbnail" className="w-full h-32 object-cover" />
                <Button
                  type="button" variant="destructive" size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => { setExistingThumbnailUrl(null); setExistingThumbnailS3Key(null) }}
                  disabled={isSubmitting || isUploading}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <p className="text-xs text-muted-foreground px-3 py-1.5 bg-muted/80">
                  Current thumbnail. Upload a new one to replace.
                </p>
              </div>
            ) : (
              <FileUpload
                accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }}
                maxSize={5 * 1024 * 1024}
                maxFiles={1}
                value={[]}
                onChange={setThumbnailFile}
                disabled={isSubmitting || isUploading}
                label="Upload thumbnail"
                description="JPEG, PNG, or WebP. Max 5MB."
              />
            )}
            {thumbnailProgress !== null && (
              <div className="space-y-1">
                <Progress value={thumbnailProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">Uploading thumbnail... {thumbnailProgress}%</p>
              </div>
            )}
          </div>

          {/* Media File Upload */}
          <div className="space-y-2">
            <Label>{tutorialType === 'video' ? 'Video File' : 'PDF File'}</Label>
            {mediaFile.length > 0 ? (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                {tutorialType === 'video'
                  ? <FileVideo className="h-8 w-8 text-red-500 shrink-0" />
                  : <Image className="h-8 w-8 text-blue-500 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{mediaFile[0].name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(mediaFile[0].size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
                <Button
                  type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                  onClick={() => setMediaFile([])}
                  disabled={isSubmitting || isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : existingMediaUrl ? (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                {existingMediaMime?.startsWith('video/')
                  ? <FileVideo className="h-8 w-8 text-red-500 shrink-0" />
                  : <Image className="h-8 w-8 text-blue-500 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Current file</p>
                  <p className="text-xs text-muted-foreground">
                    {existingMediaSize ? `${existingMediaSize} MB` : 'Uploaded'}
                    {existingMediaMime ? ` · ${existingMediaMime}` : ''}
                  </p>
                </div>
                <Button
                  type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                  onClick={() => { setExistingMediaUrl(null); setExistingMediaMime(null); setExistingMediaSize(null) }}
                  disabled={isSubmitting || isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <FileUpload
                accept={mediaAccept}
                maxSize={mediaMaxSize}
                maxFiles={1}
                value={[]}
                onChange={setMediaFile}
                disabled={isSubmitting || isUploading}
                label={mediaLabel}
                description={mediaDesc}
              />
            )}
            {mediaProgress !== null && (
              <div className="space-y-1">
                <Progress value={mediaProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">Uploading file... {mediaProgress}%</p>
              </div>
            )}
            {mode === 'create' && mediaFile.length > 0 && (
              <p className="text-xs text-amber-600">
                Media file will be uploaded after the tutorial is created. Save first, then the upload begins.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Select
              value={selectedSubjectId}
              onValueChange={setSelectedSubjectId}
              disabled={isSubmitting || isUploading || subjectsLoading}
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

          {/* Display Screens */}
          <div className="space-y-2">
            <Label>Display On Screens <span className="text-red-500">*</span></Label>
            <div className="rounded-lg border p-3 space-y-2">
              {[
                { id: 'home', label: 'Home' },
                { id: 'theory', label: 'Theory' },
                { id: 'practical', label: 'Practical' },
                { id: 'notes', label: 'Notes' },
              ].map((screen) => (
                <label key={screen.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedScreens.includes(screen.id)}
                    onCheckedChange={(checked) => {
                      setSelectedScreens((prev) =>
                        checked
                          ? [...prev, screen.id]
                          : prev.filter((s) => s !== screen.id)
                      )
                    }}
                    disabled={isSubmitting || isUploading}
                  />
                  <span className="text-sm">{screen.label}</span>
                </label>
              ))}
            </div>
            {selectedScreens.length === 0 && (
              <p className="text-xs text-amber-600">Select at least one screen</p>
            )}
            <p className="text-xs text-muted-foreground">
              Choose which app screens will show this tutorial in the "How To" section.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description..."
              disabled={isSubmitting || isUploading}
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order" type="number" min={0} placeholder="0"
              disabled={isSubmitting || isUploading}
              {...register('display_order', { valueAsNumber: true })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-sm">Active</Label>
              <p className="text-xs text-muted-foreground">{isActive ? 'Tutorial is visible' : 'Tutorial is hidden'}</p>
            </div>
            <Switch id="is_active" checked={isActive} onCheckedChange={(c) => setValue('is_active', c)} disabled={isSubmitting || isUploading} />
          </div>

          <div className="space-y-2">
            <Label>Publish Status</Label>
            <Controller
              name="publish_status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting || isUploading}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting || isUploading}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting || isUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isUploading ? 'Uploading...' : mode === 'create' ? 'Creating...' : 'Updating...'}</>
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
