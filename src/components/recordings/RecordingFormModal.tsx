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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Upload, X, FileVideo } from 'lucide-react'
import { Recording, RecordingFormData } from '@/services/recordings.service'
import { LiveSession, liveSessionsService } from '@/services/liveSessions.service'

const recordingSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  session_id: z.string().optional().or(z.literal('')),
})

type RecordingFormValues = z.infer<typeof recordingSchema>

interface RecordingFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: RecordingFormData, file?: File, onProgress?: (percent: number) => void) => Promise<void>
  recording?: Recording | null
  mode: 'create' | 'edit'
}

export function RecordingFormModal({ open, onClose, onSubmit, recording, mode }: RecordingFormModalProps) {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

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

    try {
      const formData: RecordingFormData = {
        title: data.title,
        description: data.description || '',
        session_id: data.session_id || undefined,
      }
      await onSubmit(formData, videoFile || undefined, (pct) => setUploadProgress(pct))
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setUploadProgress(null)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
              render={({ field }) => (
                <Select
                  value={field.value || 'none'}
                  onValueChange={(v) => field.onChange(v === 'none' ? '' : v)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select session (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No session</SelectItem>
                    {sessions.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.title}
                        {s.scheduled_start_time && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({new Date(s.scheduled_start_time).toLocaleDateString()})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
