import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Upload, X, FileVideo, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Recording, RecordingFormData } from '@/services/recordings.service'
import { LiveSession, liveSessionsService } from '@/services/liveSessions.service'

const recordingSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  session_id: z.string().optional().or(z.literal('')),
})

type RecordingFormValues = z.infer<typeof recordingSchema>

export type RecordingUploadPhase = 'uploading' | 'completing' | 'confirming'

interface RecordingFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: RecordingFormData, file?: File, onProgress?: (percent: number) => void, onPhaseChange?: (phase: RecordingUploadPhase) => void) => Promise<void>
  recording?: Recording | null
  mode: 'create' | 'edit'
}

export function RecordingFormModal({ open, onClose, onSubmit, recording, mode }: RecordingFormModalProps) {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [sessionPopoverOpen, setSessionPopoverOpen] = useState(false)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadPhase, setUploadPhase] = useState<RecordingUploadPhase | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RecordingFormValues>({
    resolver: zodResolver(recordingSchema),
    defaultValues: {
      title: '',
      description: '',
      session_id: '',
    },
  })

  // Fetch sessions for dropdown
  useEffect(() => {
    if (open) {
      liveSessionsService.getAll({ limit: 100, sort_by: 'scheduled_start_time', sort_order: 'desc' }).then((res) => {
        if (res.success && res.data) setSessions(res.data.entities)
      })
    }
  }, [open])

  // Reset form
  useEffect(() => {
    if (open) {
      setVideoFile(null)
      setUploadProgress(null)
      setUploadPhase(null)
      setUploadError(null)
      if (mode === 'edit' && recording) {
        reset({
          title: recording.title,
          description: recording.description,
          session_id: recording.session_id && typeof recording.session_id === 'object' ? recording.session_id._id : '',
        })
      } else {
        reset({
          title: '',
          description: '',
          session_id: '',
        })
      }
    }
  }, [open, mode, recording, reset])

  const handleFormSubmit = async (data: RecordingFormValues) => {
    if (mode === 'create' && !videoFile) return
    setUploadProgress(null)
    setUploadPhase(null)
    setUploadError(null)

    try {
      const formData: RecordingFormData = {
        title: data.title,
        description: data.description || '',
        session_id: data.session_id || undefined,
      }
      await onSubmit(
        formData,
        videoFile || undefined,
        (pct) => setUploadProgress(pct),
        (phase) => setUploadPhase(phase),
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

  const handleClose = () => {
    if (!isSubmitting) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Upload Recording' : 'Edit Recording'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Upload a new session recording.' : 'Update the recording details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
          {/* Video File (create only) */}
          {mode === 'create' && (
            <div className="space-y-2">
              <Label>
                Video File <span className="text-red-500">*</span>
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
                    type="button"
                    variant="ghost"
                    size="icon"
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
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Surgery Masterclass - Session 1"
              disabled={isSubmitting}
              {...register('title')}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the recording..."
              rows={3}
              disabled={isSubmitting}
              {...register('description')}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          {/* Session (optional) */}
          <div className="space-y-2">
            <Label>Session (Optional)</Label>
            <Controller
              name="session_id"
              control={control}
              render={({ field }) => {
                const selectedSession = sessions.find((s) => s._id === field.value)
                return (
                  <Popover open={sessionPopoverOpen} onOpenChange={setSessionPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={sessionPopoverOpen}
                        className="w-full justify-between font-normal"
                        disabled={isSubmitting}
                      >
                        <span className="truncate">
                          {selectedSession
                            ? `${selectedSession.title}${selectedSession.scheduled_start_time ? ` (${new Date(selectedSession.scheduled_start_time).toLocaleDateString()})` : ''}`
                            : field.value ? 'Select session' : 'No session'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search sessions..." />
                        <CommandList>
                          <CommandEmpty>No sessions found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="No session"
                              onSelect={() => {
                                field.onChange('')
                                setSessionPopoverOpen(false)
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', !field.value ? 'opacity-100' : 'opacity-0')} />
                              No session
                            </CommandItem>
                            {sessions.map((s) => (
                              <CommandItem
                                key={s._id}
                                value={`${s.title}${s.scheduled_start_time ? ` (${new Date(s.scheduled_start_time).toLocaleDateString()})` : ''}`}
                                onSelect={() => {
                                  field.onChange(s._id)
                                  setSessionPopoverOpen(false)
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', field.value === s._id ? 'opacity-100' : 'opacity-0')} />
                                {s.title}
                                {s.scheduled_start_time && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({new Date(s.scheduled_start_time).toLocaleDateString()})
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )
              }}
            />
            <p className="text-xs text-muted-foreground">
              You can assign this recording to a session now or later
            </p>
          </div>

          {/* Edit mode info */}
          {mode === 'edit' && recording && (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <div className="grid grid-cols-2 gap-2">
                {recording.duration_seconds > 0 && (
                  <div>
                    <span className="font-medium text-foreground">Duration:</span>{' '}
                    {Math.floor(recording.duration_seconds / 60)}m {recording.duration_seconds % 60}s
                  </div>
                )}
                {recording.file_size_mb > 0 && (
                  <div>
                    <span className="font-medium text-foreground">Size:</span>{' '}
                    {recording.file_size_mb.toFixed(1)} MB
                  </div>
                )}
              </div>
              <div>
                <span className="font-medium text-foreground">Status:</span>{' '}
                <span
                  className={
                    recording.processing_status === 'ready'
                      ? 'text-emerald-600'
                      : recording.processing_status === 'failed'
                        ? 'text-red-600'
                        : 'text-amber-600'
                  }
                >
                  {recording.processing_status}
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
                {uploadPhase === 'uploading' && <span>{uploadProgress ?? 0}%</span>}
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
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || (mode === 'create' && !videoFile)}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'create' ? 'Uploading...' : 'Updating...'}
                </>
              ) : (
                <>{mode === 'create' ? 'Upload Recording' : 'Update Recording'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
