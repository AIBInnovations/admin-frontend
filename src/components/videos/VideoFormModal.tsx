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
import { Badge } from '@/components/ui/badge'
import { Loader2, Upload, X, FileVideo, Link2, FileText, Tag, Check, ChevronsUpDown, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarqueeText } from '@/components/common/MarqueeText'
import { Video, VideoFormData, ReleaseMode } from '@/services/videos.service'
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
  publish_status: z.enum(['draft', 'published']),
  subtitle_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  transcript_url: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  // Datetime-local value ('YYYY-MM-DDTHH:mm'). Empty string means no schedule.
  scheduled_release_at: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})?$/, 'Invalid date format')
    .optional()
    .or(z.literal('')),
  release_mode: z.enum(['immediate', 'scheduled']),
})

type VideoFormValues = z.infer<typeof videoSchema>

export type UploadPhase = 'uploading' | 'completing' | 'confirming'

interface VideoFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (
    data: VideoFormData,
    file?: File,
    onProgress?: (percent: number) => void,
    onPhaseChange?: (phase: UploadPhase) => void,
    releaseMode?: ReleaseMode,
  ) => Promise<void>
  video?: Video | null
  mode: 'create' | 'edit'
  defaultModuleId?: string
}

// Convert ISO string to datetime-local value ('YYYY-MM-DDTHH:mm') in the
// admin's local timezone — same semantics as UpcomingVideoModal.
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function VideoFormModal({ open, onClose, onSubmit, video, mode, defaultModuleId }: VideoFormModalProps) {
  const [modules, setModules] = useState<Module[]>([])
  const [faculty, setFaculty] = useState<FacultyOption[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [availableTags, setAvailableTags] = useState<VideoTag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadPhase, setUploadPhase] = useState<UploadPhase | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [modulePopoverOpen, setModulePopoverOpen] = useState(false)
  const [facultyPopoverOpen, setFacultyPopoverOpen] = useState(false)

  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      title: '', description: '', module_id: '', faculty_id: '',
      display_order: 0, is_free: false, publish_status: 'draft' as const,
      subtitle_url: '', transcript_url: '',
      scheduled_release_at: '', release_mode: 'immediate',
    },
  })

  const isFree = watch('is_free')
  const releaseMode = watch('release_mode')
  const scheduledValue = watch('scheduled_release_at')

  const isUpcomingEdit = mode === 'edit' && video?.processing_status === 'upcoming'
  const showReleaseControls = isUpcomingEdit && !!videoFile

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
      setUploadError(null)
      setUploadPhase(null)
      if (mode === 'edit' && video) {
        reset({
          title: video.title,
          description: video.description,
          module_id: typeof video.module_id === 'object' ? video.module_id._id : video.module_id,
          faculty_id: video.faculty_id && typeof video.faculty_id === 'object' ? video.faculty_id._id : '',
          display_order: video.display_order ?? 0,
          is_free: video.is_free,
          publish_status: video.publish_status || 'draft',
          subtitle_url: video.subtitle_url || '',
          transcript_url: video.transcript_url || '',
          scheduled_release_at: isoToLocalInput(video.scheduled_release_at),
          // Default release_mode: honor a future scheduled date; otherwise
          // release immediately (no point in "keep scheduled" when the date
          // has already passed).
          release_mode:
            video.scheduled_release_at &&
            new Date(video.scheduled_release_at) > new Date()
              ? 'scheduled'
              : 'immediate',
        })
      } else {
        reset({
          title: '', description: '', module_id: defaultModuleId || '', faculty_id: '',
          display_order: 0, is_free: false, publish_status: 'draft' as const,
          subtitle_url: '', transcript_url: '',
          scheduled_release_at: '', release_mode: 'immediate',
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
    setUploadPhase(null)
    setUploadError(null)

    try {
      // Build the scheduled date payload. The field only has meaning for
      // upcoming videos; for any other edit/create path we omit it so the
      // backend doesn't overwrite an existing value.
      //   - Upcoming + no file: metadata edit. Send whatever is in the field
      //     (ISO string, or null to clear the schedule).
      //   - Upcoming + file + immediate: scheduled_release_at will be cleared
      //     server-side regardless; we still send null for consistency.
      //   - Upcoming + file + scheduled: we send the (possibly edited) date
      //     so the backend writes the new value on upload.
      let scheduledIso: string | null | undefined = undefined
      if (isUpcomingEdit) {
        if (videoFile && data.release_mode === 'immediate') {
          scheduledIso = null
        } else if (data.scheduled_release_at) {
          const parsed = new Date(data.scheduled_release_at)
          scheduledIso = isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
        } else {
          scheduledIso = null
        }
      }

      const formData: VideoFormData = {
        title: data.title,
        description: data.description,
        module_id: data.module_id,
        faculty_id: data.faculty_id || undefined,
        display_order: data.display_order,
        is_free: data.is_free,
        publish_status: data.publish_status,
        subtitle_url: data.subtitle_url || undefined,
        transcript_url: data.transcript_url || undefined,
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        ...(scheduledIso !== undefined ? { scheduled_release_at: scheduledIso } : {}),
      }
      const releaseModeForUpload: ReleaseMode | undefined =
        isUpcomingEdit && videoFile ? data.release_mode : undefined

      await onSubmit(
        formData,
        videoFile || undefined,
        (pct) => setUploadProgress(pct),
        (phase) => setUploadPhase(phase),
        releaseModeForUpload,
      )
      setUploadProgress(null)
      setUploadPhase(null)
      onClose()
    } catch (error: any) {
      console.error('Form submission error:', error)
      setUploadError(error?.message || 'Upload failed. Please try again.')
      setUploadProgress(null)
      setUploadPhase(null)
    }
  }

  const handleClose = () => { if (!isSubmitting) onClose() }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? 'Upload Video'
              : isUpcomingEdit
                ? 'Edit Upcoming Video'
                : 'Edit Video'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Upload a new video to a module.'
              : isUpcomingEdit
                ? 'Edit the announcement, upload the actual file when ready, and choose how it should be released.'
                : 'Update the video details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
          {/* Video File (create, or edit when upcoming) */}
          {(mode === 'create' || isUpcomingEdit) && (
            <div className="space-y-2">
              <Label>
                Video File {mode === 'create' && <span className="text-red-500">*</span>}
                {isUpcomingEdit && <span className="text-xs font-normal text-muted-foreground ml-2">(optional — leave empty to edit metadata only)</span>}
              </Label>
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

          {/* Release timing (upcoming edit only) */}
          {isUpcomingEdit && (
            <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900/50 dark:bg-orange-950/20">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <Label className="text-sm font-medium">Release Timing</Label>
              </div>

              {showReleaseControls && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">When the file finishes processing…</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <label
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
                        releaseMode === 'immediate'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      <input
                        type="radio"
                        value="immediate"
                        className="mt-0.5"
                        checked={releaseMode === 'immediate'}
                        onChange={() => setValue('release_mode', 'immediate')}
                        disabled={isSubmitting}
                      />
                      <div className="flex-1 space-y-0.5">
                        <p className="text-sm font-medium">Release immediately</p>
                        <p className="text-xs text-muted-foreground">
                          Video becomes visible to users as soon as processing completes. The scheduled date will be cleared.
                        </p>
                      </div>
                    </label>
                    <label
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
                        releaseMode === 'scheduled'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50',
                      )}
                    >
                      <input
                        type="radio"
                        value="scheduled"
                        className="mt-0.5"
                        checked={releaseMode === 'scheduled'}
                        onChange={() => setValue('release_mode', 'scheduled')}
                        disabled={isSubmitting}
                      />
                      <div className="flex-1 space-y-0.5">
                        <p className="text-sm font-medium">Keep scheduled release</p>
                        <p className="text-xs text-muted-foreground">
                          Process now, but keep the video hidden from users until the scheduled date below.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Scheduled date input — always visible for upcoming edits,
                  but only meaningful when no file is uploaded OR release mode
                  is 'scheduled'. Disabled when 'immediate' is chosen to make
                  the relationship clear. */}
              <div className="space-y-2">
                <Label htmlFor="scheduled_release_at" className="text-xs">
                  Release Date {!videoFile && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="scheduled_release_at"
                  type="datetime-local"
                  disabled={isSubmitting || (showReleaseControls && releaseMode === 'immediate')}
                  {...register('scheduled_release_at')}
                />
                <p className="text-xs text-muted-foreground">
                  {showReleaseControls && releaseMode === 'immediate'
                    ? 'Scheduled date is ignored when releasing immediately.'
                    : scheduledValue && new Date(scheduledValue) < new Date()
                      ? 'This date is in the past — the video will be visible as soon as it is ready.'
                      : 'Users will see an "Upcoming" placeholder until this date arrives.'}
                </p>
                {errors.scheduled_release_at && (
                  <p className="text-sm text-red-500">{errors.scheduled_release_at.message}</p>
                )}
              </div>
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
                  <Popover open={modulePopoverOpen} onOpenChange={setModulePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline" role="combobox"
                        disabled={isSubmitting || (mode === 'create' && !!defaultModuleId)}
                        className="w-full justify-between font-normal h-9"
                      >
                        <MarqueeText>
                          {field.value
                            ? (() => {
                                const m = modules.find(m => m._id === field.value)
                                return m ? `${m.name}${typeof m.series_id === 'object' ? ` (${m.series_id.name})` : ''}` : 'Select module'
                              })()
                            : 'Select module'}
                        </MarqueeText>
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search modules..." />
                        <CommandList>
                          <CommandEmpty>No modules found.</CommandEmpty>
                          <CommandGroup>
                            {modules.map((m) => (
                              <CommandItem
                                key={m._id}
                                value={`${m.name}${typeof m.series_id === 'object' ? ` (${m.series_id.name})` : ''}`}
                                onSelect={() => {
                                  field.onChange(m._id)
                                  setModulePopoverOpen(false)
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', field.value === m._id ? 'opacity-100' : 'opacity-0')} />
                                <span className="flex items-center gap-2">
                                  {m.name}{typeof m.series_id === 'object' ? ` (${m.series_id.name})` : ''}
                                  {m.publish_status === 'draft' && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Draft</span>
                                  )}
                                  {m.is_active === false && (
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
              {errors.module_id && <p className="text-sm text-red-500">{errors.module_id.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Faculty</Label>
              <Controller
                name="faculty_id" control={control}
                render={({ field }) => (
                  <Popover open={facultyPopoverOpen} onOpenChange={setFacultyPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline" role="combobox"
                        disabled={isSubmitting}
                        className="w-full justify-between font-normal h-9"
                      >
                        <MarqueeText>
                          {field.value ? faculty.find(f => f._id === field.value)?.name || 'Select faculty' : 'None'}
                        </MarqueeText>
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search faculty..." />
                        <CommandList>
                          <CommandEmpty>No faculty found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="None"
                              onSelect={() => {
                                field.onChange('')
                                setFacultyPopoverOpen(false)
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', !field.value ? 'opacity-100' : 'opacity-0')} />
                              None
                            </CommandItem>
                            {faculty.map((f) => (
                              <CommandItem
                                key={f._id}
                                value={f.name}
                                onSelect={() => {
                                  field.onChange(f._id)
                                  setFacultyPopoverOpen(false)
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', field.value === f._id ? 'opacity-100' : 'opacity-0')} />
                                {f.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
          {(uploadPhase !== null || uploadProgress !== null) && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {uploadPhase === 'confirming'
                    ? 'Saving record and starting processing...'
                    : uploadPhase === 'completing'
                      ? 'Assembling file on server...'
                      : 'Uploading to cloud...'}
                </span>
                {uploadPhase !== 'completing' && uploadPhase !== 'confirming' && <span>{uploadProgress ?? 0}%</span>}
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full bg-primary rounded-full transition-all duration-300${
                    uploadPhase === 'completing' || uploadPhase === 'confirming' ? ' animate-pulse' : ''
                  }`}
                  style={{ width: uploadPhase === 'completing' || uploadPhase === 'confirming' ? '100%' : `${uploadProgress ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload error message */}
          {uploadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              {uploadError}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || (mode === 'create' && !videoFile)}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' || videoFile ? `Uploading...${uploadProgress != null ? ` ${uploadProgress}%` : ''}` : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Upload Video' : videoFile ? 'Upload & Update Video' : 'Update Video'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
