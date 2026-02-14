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
import { Badge } from '@/components/ui/badge'
import { Loader2, Upload, X, FileVideo, Link2, FileText, Tag } from 'lucide-react'
import { Video, VideoFormData } from '@/services/videos.service'
import { Module, modulesService } from '@/services/modules.service'
import { VideoTag, videoTagsService } from '@/services/videoTags.service'
import { apiService } from '@/services/api.service'

interface FacultyOption {
  _id: string
  name: string
}

const videoSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(300),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  module_id: z.string().min(1, 'Module is required'),
  faculty_id: z.string().optional().or(z.literal('')),
  display_order: z.coerce.number().int().min(0, 'Must be 0 or greater').default(0),
  is_free: z.boolean(),
  subtitle_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  transcript_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
})

type VideoFormValues = z.infer<typeof videoSchema>

interface VideoFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: VideoFormData, file?: File, onProgress?: (percent: number) => void) => Promise<void>
  video?: Video | null
  mode: 'create' | 'edit'
  defaultModuleId?: string
}

export function VideoFormModal({ open, onClose, onSubmit, video, mode, defaultModuleId }: VideoFormModalProps) {
  const [modules, setModules] = useState<Module[]>([])
  const [faculty, setFaculty] = useState<FacultyOption[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [availableTags, setAvailableTags] = useState<VideoTag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      title: '', description: '', module_id: '', faculty_id: '',
      display_order: 0, is_free: false, subtitle_url: '', transcript_url: '',
    },
  })

  const isFree = watch('is_free')

  // Fetch dropdown data
  useEffect(() => {
    if (open) {
      modulesService.getAll({ limit: 100, sort_by: 'name', sort_order: 'asc' }).then((res) => {
        if (res.success && res.data) setModules(res.data.entities)
      })
      apiService.get<{ entities: FacultyOption[] }>('admin/faculty?limit=100&sort_by=name&sort_order=asc').then((res) => {
        if (res.success && res.data) setFaculty(res.data.entities || [])
      })
      videoTagsService.getAll({ limit: 100, sort_by: 'name', sort_order: 'asc' }).then((res) => {
        if (res.success && res.data) setAvailableTags(res.data.entities || [])
      })
    }
  }, [open])

  // Reset form
  useEffect(() => {
    if (open) {
      setVideoFile(null)
      setSelectedTagIds([])
      if (mode === 'edit' && video) {
        reset({
          title: video.title,
          description: video.description,
          module_id: typeof video.module_id === 'object' ? video.module_id._id : video.module_id,
          faculty_id: video.faculty_id && typeof video.faculty_id === 'object' ? video.faculty_id._id : '',
          display_order: video.display_order ?? 0,
          is_free: video.is_free,
          subtitle_url: video.subtitle_url || '',
          transcript_url: video.transcript_url || '',
        })
      } else {
        reset({
          title: '', description: '', module_id: defaultModuleId || '', faculty_id: '',
          display_order: 0, is_free: false, subtitle_url: '', transcript_url: '',
        })
      }
    }
  }, [open, mode, video, reset, defaultModuleId])

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handleFormSubmit = async (data: VideoFormValues) => {
    if (mode === 'create' && !videoFile) return
    setUploadProgress(null)

    try {
      const formData: VideoFormData = {
        title: data.title,
        description: data.description,
        module_id: data.module_id,
        faculty_id: data.faculty_id || undefined,
        display_order: data.display_order,
        is_free: data.is_free,
        subtitle_url: data.subtitle_url || undefined,
        transcript_url: data.transcript_url || undefined,
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      }
      await onSubmit(formData, videoFile || undefined, (pct) => setUploadProgress(pct))
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setUploadProgress(null)
    }
  }

  const handleClose = () => { if (!isSubmitting) onClose() }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Upload Video' : 'Edit Video'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Upload a new video to a module.' : 'Update the video details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
          {/* Video File (create only) */}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label>Video File <span className="text-red-500">*</span></Label>
              {!videoFile ? (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-6 text-sm hover:bg-muted/50 hover:border-primary/30 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">Click to choose video file</span>
                  <span className="text-xs text-muted-foreground">MP4, MOV, AVI, MKV, WebM (up to 10 GB)</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    disabled={isSubmitting}
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                  <FileVideo className="h-5 w-5 shrink-0 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{videoFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setVideoFile(null)}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input id="title" placeholder="e.g., Introduction to Anatomy" disabled={isSubmitting} {...register('title')} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <Textarea id="description" placeholder="Brief description of the video content..." rows={3} disabled={isSubmitting} {...register('description')} />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          {/* Module + Faculty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Module <span className="text-red-500">*</span></Label>
              <Controller
                name="module_id" control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting || (mode === 'create' && !!defaultModuleId)}>
                    <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                    <SelectContent>
                      {modules.map((m) => (
                        <SelectItem key={m._id} value={m._id}>
                          {m.name}{typeof m.series_id === 'object' ? ` (${m.series_id.name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.module_id && <p className="text-sm text-red-500">{errors.module_id.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Faculty</Label>
              <Controller
                name="faculty_id" control={control}
                render={({ field }) => (
                  <Select value={field.value || 'none'} onValueChange={(v) => field.onChange(v === 'none' ? '' : v)} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {faculty.map((f) => (
                        <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Display Order + Free Toggle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order" type="number" min={0}
                placeholder="0" disabled={isSubmitting}
                {...register('display_order')}
              />
              <p className="text-xs text-muted-foreground">Order within the module (0 = auto)</p>
              {errors.display_order && <p className="text-sm text-red-500">{errors.display_order.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Access</Label>
              <div className="flex items-center justify-between rounded-lg border p-3 h-10 box-content">
                <Label htmlFor="is_free" className="text-sm font-normal cursor-pointer">
                  {isFree ? 'Free — no purchase needed' : 'Paid — requires purchase'}
                </Label>
                <Switch
                  id="is_free" checked={isFree}
                  onCheckedChange={(checked) => setValue('is_free', checked)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Subtitle + Transcript URLs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subtitle_url" className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> Subtitle URL
              </Label>
              <Input
                id="subtitle_url"
                placeholder="https://example.com/subtitles.vtt"
                disabled={isSubmitting}
                {...register('subtitle_url')}
              />
              {errors.subtitle_url && <p className="text-sm text-red-500">{errors.subtitle_url.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="transcript_url" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Transcript URL
              </Label>
              <Input
                id="transcript_url"
                placeholder="https://example.com/transcript.pdf"
                disabled={isSubmitting}
                {...register('transcript_url')}
              />
              {errors.transcript_url && <p className="text-sm text-red-500">{errors.transcript_url.message}</p>}
            </div>
          </div>

          {/* Tags */}
          {availableTags.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Tags
              </Label>
              <div className="flex flex-wrap gap-2 rounded-lg border p-3 min-h-[42px]">
                {availableTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag._id)
                  return (
                    <button
                      key={tag._id}
                      type="button"
                      onClick={() => toggleTag(tag._id)}
                      disabled={isSubmitting}
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {tag.name}
                      {tag.category && (
                        <span className={`ml-1.5 ${isSelected ? 'opacity-70' : 'opacity-50'}`}>
                          ({tag.category})
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {selectedTagIds.length > 0 && (
                <p className="text-xs text-muted-foreground">{selectedTagIds.length} tag{selectedTagIds.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}

          {/* Edit mode info */}
          {mode === 'edit' && video && (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <div className="grid grid-cols-3 gap-2">
                {video.duration_seconds > 0 && (
                  <div>
                    <span className="font-medium text-foreground">Duration:</span>{' '}
                    {Math.floor(video.duration_seconds / 60)}m {video.duration_seconds % 60}s
                  </div>
                )}
                {video.file_size_mb > 0 && (
                  <div>
                    <span className="font-medium text-foreground">Size:</span>{' '}
                    {video.file_size_mb.toFixed(1)} MB
                  </div>
                )}
                <div>
                  <span className="font-medium text-foreground">Views:</span>{' '}
                  {video.view_count.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="font-medium text-foreground">Status:</span>{' '}
                <span className={
                  video.processing_status === 'ready' ? 'text-emerald-600'
                    : video.processing_status === 'failed' ? 'text-red-600'
                      : 'text-amber-600'
                }>
                  {video.processing_status}
                </span>
              </div>
            </div>
          )}

          {/* Upload progress bar */}
          {uploadProgress !== null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{uploadProgress < 100 ? 'Uploading to cloud...' : 'Finalizing...'}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || (mode === 'create' && !videoFile)}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Uploading...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Upload Video' : 'Update Video'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
