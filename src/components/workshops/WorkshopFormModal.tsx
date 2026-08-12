import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { FileUpload } from '@/components/common/FileUpload'
import { ImageCropper } from '@/components/common/ImageCropper'
import { Loader2, Check, ChevronsUpDown, X, Plus, Trash2, CalendarDays, AlertTriangle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarqueeText } from '@/components/common/MarqueeText'
import { subjectsService, Subject } from '@/services/subjects.service'
import { packagesService, Package } from '@/services/packages.service'
import { apiService } from '@/services/api.service'
import type { VisibleTo } from '@/services/liveSessions.service'
import { Workshop, WorkshopFormData, workshopsService } from '@/services/workshops.service'
import { toast } from 'sonner'

// ----------------------------------------------------------------------------
// Schema
// ----------------------------------------------------------------------------

const daySchema = z.object({
  session_id: z.string().optional().nullable(),
  title: z.string().min(3, 'Day title must be at least 3 characters').max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  faculty_id: z.string().optional().or(z.literal('')),
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  // Set when the day already has attendance or a recording — removing it would
  // destroy history, so the backend rejects it and we hide the delete button.
  locked: z.boolean().optional(),
})

const workshopSchema = z
  .object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(200),
    description: z.string().min(1, 'Description is required').max(4000),
    subject_id: z.string().min(1, 'Subject is required'),
    platform: z.enum(['zoom', 'agora', 'teams', 'other']),
    enrollment_mode: z.enum(['open', 'enrollment_required', 'disabled']),
    capacity_mode: z.enum(['limited', 'unlimited']),
    max_seats: z.number().int().min(1).optional().nullable(),
    allow_waitlist: z.boolean(),
    is_free: z.boolean(),
    price: z.number().min(0).optional().nullable(),
    registration_cutoff_mode: z.enum(['first_day', 'custom']),
    registration_closes_date: z.string().optional().or(z.literal('')),
    registration_closes_time: z.string().optional().or(z.literal('')),
    certificate_enabled: z.boolean(),
    certificate_min_days_attended: z.number().int().min(1).optional().nullable(),
    certificate_signatory_name: z.string().max(120).optional().or(z.literal('')),
    certificate_signatory_title: z.string().max(120).optional().or(z.literal('')),
    publish_status: z.enum(['draft', 'published']),
    days: z.array(daySchema).min(1, 'A workshop needs at least one day').max(10, 'At most 10 days'),
  })
  .refine((d) => d.capacity_mode === 'unlimited' || (d.max_seats && d.max_seats > 0), {
    message: 'Seat limit is required for limited capacity',
    path: ['max_seats'],
  })
  .refine((d) => d.is_free || (d.price && d.price > 0), {
    message: 'Price is required for paid workshops',
    path: ['price'],
  })
  .refine(
    (d) =>
      d.registration_cutoff_mode === 'first_day' ||
      (d.registration_closes_date && d.registration_closes_time),
    { message: 'Set a cutoff date and time', path: ['registration_closes_date'] },
  )
  .superRefine((d, ctx) => {
    // Per-day: end after start.
    d.days.forEach((day, i) => {
      if (!day.date || !day.start_time || !day.end_time) return
      const start = new Date(`${day.date}T${day.start_time}:00`)
      const end = new Date(`${day.date}T${day.end_time}:00`)
      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End time must be after start time',
          path: ['days', i, 'end_time'],
        })
      }
    })

    // Across days: no overlap, once sorted chronologically. The backend sorts
    // and renumbers too, so the admin can enter days in any order.
    const spans = d.days
      .filter((day) => day.date && day.start_time && day.end_time)
      .map((day, i) => ({
        i,
        start: new Date(`${day.date}T${day.start_time}:00`).getTime(),
        end: new Date(`${day.date}T${day.end_time}:00`).getTime(),
      }))
      .sort((a, b) => a.start - b.start)

    for (let k = 1; k < spans.length; k += 1) {
      if (spans[k].start < spans[k - 1].end) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'This day overlaps another day of the workshop',
          path: ['days', spans[k].i, 'start_time'],
        })
      }
    }
  })

type WorkshopFormValues = z.infer<typeof workshopSchema>

const emptyDay = () => ({
  session_id: null,
  title: '',
  description: '',
  faculty_id: '',
  date: '',
  start_time: '',
  end_time: '',
  locked: false,
})

const defaultValues: WorkshopFormValues = {
  title: '',
  description: '',
  subject_id: '',
  platform: 'zoom',
  enrollment_mode: 'enrollment_required',
  capacity_mode: 'unlimited',
  max_seats: null,
  allow_waitlist: true,
  is_free: false,
  price: 999,
  registration_cutoff_mode: 'first_day',
  registration_closes_date: '',
  registration_closes_time: '',
  certificate_enabled: true,
  certificate_min_days_attended: null,
  certificate_signatory_name: '',
  certificate_signatory_title: '',
  publish_status: 'draft',
  days: [emptyDay(), emptyDay()],
}

interface WorkshopFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: WorkshopFormData) => Promise<void>
  workshop?: Workshop | null
  mode: 'create' | 'edit'
}

/** Local `YYYY-MM-DD` — avoids the UTC shift `toISOString()` introduces. */
function toLocalDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function toLocalTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function WorkshopFormModal({ open, onClose, onSubmit, workshop, mode }: WorkshopFormModalProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [faculty, setFaculty] = useState<Array<{ _id: string; name: string }>>([])
  const [subjectPopoverOpen, setSubjectPopoverOpen] = useState(false)
  const [openFacultyPopover, setOpenFacultyPopover] = useState<number | null>(null)

  // Thumbnail
  const [thumbnailFile, setThumbnailFile] = useState<File[]>([])
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null)
  const [existingThumbnailS3Key, setExistingThumbnailS3Key] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null)

  // Brochure — a PDF prospectus, independent of the thumbnail image above.
  // `brochureCleared` distinguishes "left the existing one alone" from
  // "explicitly removed it", which a null URL alone cannot express.
  const [brochureFile, setBrochureFile] = useState<File[]>([])
  const [existingBrochureUrl, setExistingBrochureUrl] = useState<string | null>(null)
  const [existingBrochureS3Key, setExistingBrochureS3Key] = useState<string | null>(null)
  const [existingBrochureFilename, setExistingBrochureFilename] = useState<string | null>(null)
  const [brochureCleared, setBrochureCleared] = useState(false)
  const [brochureProgress, setBrochureProgress] = useState<number | null>(null)
  const [cropperFile, setCropperFile] = useState<File | null>(null)
  const [showCropper, setShowCropper] = useState(false)

  // Visibility
  const [visibleTo, setVisibleTo] = useState<VisibleTo>('all')
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([])
  const [visibilitySubjects, setVisibilitySubjects] = useState<Subject[]>([])
  const [packages, setPackages] = useState<Package[]>([])

  const {
    register, handleSubmit, control, reset, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<WorkshopFormValues>({
    resolver: zodResolver(workshopSchema),
    defaultValues,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'days' })

  const isFree = watch('is_free')
  const capacityMode = watch('capacity_mode')
  const certificateEnabled = watch('certificate_enabled')
  const cutoffMode = watch('registration_cutoff_mode')
  const days = watch('days')

  const busy = isSubmitting || uploadProgress !== null

  /** Days sorted chronologically — the order the backend will assign. */
  const orderedDayNumbers = useMemo(() => {
    const withTimes = days
      .map((d, i) => ({
        i,
        t: d.date && d.start_time ? new Date(`${d.date}T${d.start_time}:00`).getTime() : Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => a.t - b.t)
    const map = new Map<number, number>()
    withTimes.forEach((entry, idx) => map.set(entry.i, idx + 1))
    return map
  }, [days])

  const totalMinutes = useMemo(
    () =>
      days.reduce((sum, d) => {
        if (!d.date || !d.start_time || !d.end_time) return sum
        const start = new Date(`${d.date}T${d.start_time}:00`).getTime()
        const end = new Date(`${d.date}T${d.end_time}:00`).getTime()
        return end > start ? sum + Math.round((end - start) / 60000) : sum
      }, 0),
    [days],
  )

  // Thumbnail preview lifecycle
  useEffect(() => {
    if (thumbnailFile.length > 0) {
      const url = URL.createObjectURL(thumbnailFile[0])
      setThumbnailPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setThumbnailPreviewUrl(null)
  }, [thumbnailFile])

  // Reference data
  useEffect(() => {
    if (!open) return
    subjectsService.getSubjects({ limit: 100, sort_by: 'name', sort_order: 'asc' }).then((res) => {
      if (res.success && res.data) setSubjects(res.data.entities)
    })
    apiService
      .get<{ entities: Array<{ _id: string; name: string }> }>('admin/faculty?limit=100')
      .then((res) => {
        if (res.success && res.data) setFaculty(res.data.entities)
      })
    subjectsService.getSubjects({ is_active: true, limit: 100 }).then((res) => {
      if (res.success && res.data) setVisibilitySubjects(res.data.entities || [])
    })
    packagesService.getAll({ is_active: true, limit: 100 }).then((res) => {
      if (res.success && res.data) setPackages(res.data.entities || [])
    })
  }, [open])

  // Populate / reset
  useEffect(() => {
    if (!open) return

    if (mode === 'edit' && workshop) {
      const subjectId = typeof workshop.subject_id === 'object' ? workshop.subject_id._id : workshop.subject_id
      const cutoff = workshop.registration_closes_at ? new Date(workshop.registration_closes_at) : null
      const firstDayStart = workshop.start_date ? new Date(workshop.start_date) : null
      const cutoffIsFirstDay =
        !cutoff || (firstDayStart && Math.abs(cutoff.getTime() - firstDayStart.getTime()) < 60000)

      reset({
        title: workshop.title,
        description: workshop.description || '',
        subject_id: subjectId,
        platform: workshop.platform || 'zoom',
        enrollment_mode: workshop.enrollment_mode,
        capacity_mode: workshop.capacity_mode,
        max_seats: workshop.max_seats,
        allow_waitlist: workshop.allow_waitlist,
        is_free: workshop.is_free,
        price: workshop.is_free ? null : workshop.price,
        registration_cutoff_mode: cutoffIsFirstDay ? 'first_day' : 'custom',
        registration_closes_date: cutoff && !cutoffIsFirstDay ? toLocalDate(cutoff) : '',
        registration_closes_time: cutoff && !cutoffIsFirstDay ? toLocalTime(cutoff) : '',
        certificate_enabled: workshop.certificate_enabled,
        certificate_min_days_attended: workshop.certificate_min_days_attended,
        certificate_signatory_name: workshop.certificate_signatory_name || '',
        certificate_signatory_title: workshop.certificate_signatory_title || '',
        publish_status: workshop.publish_status || 'draft',
        days: (workshop.days || []).map((d) => {
          const start = new Date(d.scheduled_start_time)
          const end = new Date(d.scheduled_end_time)
          return {
            session_id: d.session_id,
            title: d.title,
            description: d.description || '',
            faculty_id: d.faculty_id || '',
            date: toLocalDate(start),
            start_time: toLocalTime(start),
            end_time: toLocalTime(end),
            // A day with history can't be removed — the backend blocks it.
            locked: d.attendee_count > 0 || d.recording_count > 0,
          }
        }),
      })
      setExistingThumbnailUrl(workshop.thumbnail_url)
      setExistingThumbnailS3Key(workshop.thumbnail_s3_key)
      setThumbnailFile([])
      setExistingBrochureUrl(workshop.brochure_url)
      setExistingBrochureS3Key(workshop.brochure_s3_key)
      setExistingBrochureFilename(workshop.brochure_filename)
      setBrochureFile([])
      setBrochureCleared(false)
      setVisibleTo(workshop.visible_to || 'all')
      setSelectedSubjectIds(workshop.visible_to_subjects || [])
      setSelectedPackageIds(workshop.visible_to_packages || [])
    } else {
      reset(defaultValues)
      setExistingThumbnailUrl(null)
      setExistingThumbnailS3Key(null)
      setThumbnailFile([])
      setExistingBrochureUrl(null)
      setExistingBrochureS3Key(null)
      setExistingBrochureFilename(null)
      setBrochureFile([])
      setBrochureCleared(false)
      setVisibleTo('all')
      setSelectedSubjectIds([])
      setSelectedPackageIds([])
    }
  }, [open, mode, workshop, reset])

  const handleFormSubmit = async (data: WorkshopFormValues) => {
    try {
      let thumbnailUrl = existingThumbnailUrl || undefined
      let thumbnailS3Key = existingThumbnailS3Key || undefined

      if (thumbnailFile.length > 0) {
        setUploadProgress(0)
        try {
          const result = await workshopsService.uploadThumbnail(thumbnailFile[0], setUploadProgress)
          thumbnailUrl = result.thumbnailUrl
          thumbnailS3Key = result.s3Key
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to upload thumbnail')
          setUploadProgress(null)
          return
        }
        setUploadProgress(null)
      }

      // Brochure upload — independent of the thumbnail above. Three states:
      // a new file (upload it), explicitly cleared (send null), or untouched
      // (send the existing values back unchanged).
      let brochureUrl: string | null | undefined = existingBrochureUrl || undefined
      let brochureS3Key: string | null | undefined = existingBrochureS3Key || undefined
      let brochureFilename: string | null | undefined = existingBrochureFilename || undefined

      if (brochureCleared && brochureFile.length === 0) {
        brochureUrl = null
        brochureS3Key = null
        brochureFilename = null
      } else if (brochureFile.length > 0) {
        setBrochureProgress(0)
        try {
          const result = await workshopsService.uploadBrochure(brochureFile[0], setBrochureProgress)
          brochureUrl = result.brochureUrl
          brochureS3Key = result.s3Key
          brochureFilename = result.filename
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to upload brochure')
          setBrochureProgress(null)
          return
        }
        setBrochureProgress(null)
      }

      const dayPayload = data.days.map((d) => ({
        session_id: d.session_id || null,
        title: d.title,
        description: d.description || '',
        faculty_id: d.faculty_id || null,
        scheduled_start_time: new Date(`${d.date}T${d.start_time}:00`).toISOString(),
        scheduled_end_time: new Date(`${d.date}T${d.end_time}:00`).toISOString(),
      }))

      // Headline faculty = the distinct faculty across the days.
      const facultyIds = [...new Set(data.days.map((d) => d.faculty_id).filter(Boolean))] as string[]

      const registrationClosesAt =
        data.registration_cutoff_mode === 'custom' &&
        data.registration_closes_date &&
        data.registration_closes_time
          ? new Date(`${data.registration_closes_date}T${data.registration_closes_time}:00`).toISOString()
          : null

      const formData: WorkshopFormData = {
        title: data.title,
        description: data.description,
        subject_id: data.subject_id,
        faculty_ids: facultyIds,
        days: dayPayload,
        thumbnail_url: thumbnailUrl,
        thumbnail_s3_key: thumbnailS3Key,
        brochure_url: brochureUrl,
        brochure_s3_key: brochureS3Key,
        brochure_filename: brochureFilename,
        platform: data.platform,
        is_free: data.is_free,
        price: data.is_free ? 0 : data.price || 0,
        registration_closes_at: registrationClosesAt,
        enrollment_mode: data.enrollment_mode,
        capacity_mode: data.capacity_mode,
        max_seats: data.capacity_mode === 'limited' ? data.max_seats : null,
        allow_waitlist: data.allow_waitlist,
        guaranteed_seats_for_paid: true,
        visible_to: visibleTo,
        visible_to_subjects: visibleTo === 'subject' ? selectedSubjectIds : [],
        visible_to_packages: visibleTo === 'package' ? selectedPackageIds : [],
        certificate_enabled: data.certificate_enabled,
        certificate_min_days_attended: data.certificate_enabled
          ? data.certificate_min_days_attended
          : null,
        certificate_signatory_name: data.certificate_signatory_name || null,
        certificate_signatory_title: data.certificate_signatory_title || null,
        publish_status: data.publish_status,
      }

      await onSubmit(formData)
      onClose()
    } catch (error) {
      // The page-level handler already surfaced a toast; keep the modal open.
      console.error('Workshop form submission error:', error)
    }
  }

  const handleClose = () => {
    if (!busy) onClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Create Workshop' : 'Edit Workshop'}</DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? 'A workshop runs across multiple days. Each day gets its own Zoom meeting; one purchase covers them all.'
                : 'Update the workshop details and its day-by-day schedule.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* ---------------- Basics ---------------- */}
            <div className="space-y-2">
              <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                placeholder="e.g., Advanced Laparoscopic Skills Workshop"
                disabled={busy}
                {...register('title')}
              />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
              <Textarea
                id="description"
                placeholder="What the workshop covers, who it's for, prerequisites..."
                rows={3}
                disabled={busy}
                {...register('description')}
              />
              {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
            </div>

            {/* Thumbnail */}
            <div className="space-y-2">
              <Label>Thumbnail / Banner</Label>
              {thumbnailFile.length > 0 ? (
                <div className="relative rounded-lg border overflow-hidden">
                  <img src={thumbnailPreviewUrl!} alt="Thumbnail preview" className="w-full h-32 object-cover" />
                  <Button
                    type="button" variant="destructive" size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => setThumbnailFile([])}
                    disabled={busy}
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
                    disabled={busy}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <p className="text-xs text-muted-foreground px-3 py-1.5 bg-muted/80">
                    Current thumbnail. Upload new to replace.
                  </p>
                </div>
              ) : (
                <FileUpload
                  accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }}
                  maxSize={5 * 1024 * 1024}
                  maxFiles={1}
                  value={[]}
                  onChange={(files) => { if (files.length > 0) { setCropperFile(files[0]); setShowCropper(true) } }}
                  disabled={busy}
                  label="Upload thumbnail"
                  description="JPEG, PNG, or WebP. Max 5MB."
                />
              )}
              {uploadProgress !== null && (
                <div className="space-y-1">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
                </div>
              )}
            </div>

            {/* Brochure — a downloadable PDF prospectus. Separate field and
                separate upload from the thumbnail above; clearing one leaves
                the other untouched. */}
            <div className="space-y-2">
              <Label>Brochure (PDF)</Label>
              {brochureFile.length > 0 ? (
                <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{brochureFile[0].name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(brochureFile[0].size / (1024 * 1024)).toFixed(1)} MB · will be uploaded on save
                    </p>
                  </div>
                  <Button
                    type="button" variant="destructive" size="icon" className="h-7 w-7 shrink-0"
                    onClick={() => setBrochureFile([])}
                    disabled={busy}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : existingBrochureUrl && !brochureCleared ? (
                <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <a
                      href={existingBrochureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate block text-sm font-medium text-primary hover:underline"
                    >
                      {existingBrochureFilename || 'View current brochure'}
                    </a>
                    <p className="text-xs text-muted-foreground">Current brochure. Upload a new one to replace.</p>
                  </div>
                  <Button
                    type="button" variant="destructive" size="icon" className="h-7 w-7 shrink-0"
                    onClick={() => setBrochureCleared(true)}
                    disabled={busy}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <FileUpload
                  accept={{ 'application/pdf': ['.pdf'] }}
                  maxSize={25 * 1024 * 1024}
                  maxFiles={1}
                  value={[]}
                  onChange={(files) => { if (files.length > 0) { setBrochureFile([files[0]]); setBrochureCleared(false) } }}
                  disabled={busy}
                  label="Upload brochure"
                  description="PDF only. Max 25MB. Shown to everyone, including before enrolling."
                />
              )}
              {brochureProgress !== null && (
                <div className="space-y-1">
                  <Progress value={brochureProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">Uploading brochure... {brochureProgress}%</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject <span className="text-red-500">*</span></Label>
                <Controller
                  name="subject_id"
                  control={control}
                  render={({ field }) => {
                    const selected = subjects.find((s) => s._id === field.value)
                    return (
                      <Popover open={subjectPopoverOpen} onOpenChange={setSubjectPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline" role="combobox" aria-expanded={subjectPopoverOpen}
                            className="w-full justify-between font-normal" disabled={busy}
                          >
                            <MarqueeText>{selected ? selected.name : 'Select subject'}</MarqueeText>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search subjects..." />
                            <CommandList>
                              <CommandEmpty>No subjects found.</CommandEmpty>
                              <CommandGroup>
                                {subjects.map((s) => (
                                  <CommandItem
                                    key={s._id}
                                    value={s.name}
                                    onSelect={() => { field.onChange(s._id); setSubjectPopoverOpen(false) }}
                                  >
                                    <Check className={cn('mr-2 h-4 w-4', field.value === s._id ? 'opacity-100' : 'opacity-0')} />
                                    {s.name}
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
                {errors.subject_id && <p className="text-sm text-red-500">{errors.subject_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Platform</Label>
                <Controller
                  name="platform"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={busy}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="agora">Agora</SelectItem>
                        <SelectItem value="teams">Teams</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Zoom creates one meeting per day automatically.
                </p>
              </div>
            </div>

            {/* ---------------- Day builder ---------------- */}
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base">Schedule</Label>
                  <Badge variant="secondary" className="text-[10px]">
                    {fields.length} day{fields.length === 1 ? '' : 's'}
                    {totalMinutes > 0 ? ` · ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : ''}
                  </Badge>
                </div>
                <Button
                  type="button" variant="outline" size="sm"
                  onClick={() => append(emptyDay())}
                  disabled={busy || fields.length >= 10}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />Add day
                </Button>
              </div>

              {errors.days?.message && <p className="text-sm text-red-500">{errors.days.message}</p>}

              {fields.map((field, index) => {
                const dayError = errors.days?.[index]
                const locked = days[index]?.locked
                return (
                  <div key={field.id} className="rounded-lg border bg-muted/30 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                          Day {orderedDayNumbers.get(index) ?? index + 1}
                        </Badge>
                        {locked && (
                          <span className="flex items-center gap-1 text-[11px] text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            Has attendance or recordings
                          </span>
                        )}
                      </div>
                      <Button
                        type="button" variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => remove(index)}
                        disabled={busy || fields.length <= 1 || locked}
                        title={
                          locked
                            ? 'This day has history — cancel it from the workshop page instead'
                            : fields.length <= 1
                              ? 'A workshop needs at least one day'
                              : 'Remove day'
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Input
                        placeholder="Day title — e.g., Fundamentals & Port Placement"
                        disabled={busy}
                        {...register(`days.${index}.title` as const)}
                      />
                      {dayError?.title && <p className="text-xs text-red-500">{dayError.title.message}</p>}
                    </div>

                    {/* Day description. The schema and the payload already
                        carried this field, but no input was ever rendered, so
                        it could not be set or cleared from here — an empty day
                        used to inherit the whole workshop description on the
                        backend, and editing could never remove it. */}
                    <div className="space-y-1">
                      <Textarea
                        rows={2}
                        placeholder="What this day covers (optional)"
                        disabled={busy}
                        {...register(`days.${index}.description` as const)}
                      />
                      {dayError?.description && (
                        <p className="text-xs text-red-500">{dayError.description.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Date</Label>
                        <Input type="date" disabled={busy} {...register(`days.${index}.date` as const)} />
                        {dayError?.date && <p className="text-xs text-red-500">{dayError.date.message}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Start</Label>
                        <Input type="time" disabled={busy} {...register(`days.${index}.start_time` as const)} />
                        {dayError?.start_time && <p className="text-xs text-red-500">{dayError.start_time.message}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End</Label>
                        <Input type="time" disabled={busy} {...register(`days.${index}.end_time` as const)} />
                        {dayError?.end_time && <p className="text-xs text-red-500">{dayError.end_time.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Faculty for this day</Label>
                      <Controller
                        name={`days.${index}.faculty_id` as const}
                        control={control}
                        render={({ field: f }) => {
                          const selected = faculty.find((x) => x._id === f.value)
                          return (
                            <Popover
                              open={openFacultyPopover === index}
                              onOpenChange={(o) => setOpenFacultyPopover(o ? index : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline" role="combobox"
                                  className="w-full justify-between font-normal h-9" disabled={busy}
                                >
                                  <MarqueeText>{selected ? selected.name : 'No faculty'}</MarqueeText>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search faculty..." />
                                  <CommandList>
                                    <CommandEmpty>No faculty found.</CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value="__none__"
                                        onSelect={() => { f.onChange(''); setOpenFacultyPopover(null) }}
                                      >
                                        <Check className={cn('mr-2 h-4 w-4', !f.value ? 'opacity-100' : 'opacity-0')} />
                                        <span className="text-muted-foreground">None</span>
                                      </CommandItem>
                                      {faculty.map((x) => (
                                        <CommandItem
                                          key={x._id}
                                          value={x.name}
                                          onSelect={() => { f.onChange(x._id); setOpenFacultyPopover(null) }}
                                        >
                                          <Check className={cn('mr-2 h-4 w-4', f.value === x._id ? 'opacity-100' : 'opacity-0')} />
                                          {x.name}
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
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ---------------- Pricing ---------------- */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="is_free" className="text-base">Free Workshop</Label>
                <p className="text-sm text-muted-foreground">
                  {isFree ? 'Students register at no charge' : 'Students pay once for all days'}
                </p>
              </div>
              <Switch
                id="is_free"
                checked={isFree}
                onCheckedChange={(c) => { setValue('is_free', c); if (c) setValue('price', null) }}
                disabled={busy}
              />
            </div>

            {!isFree && (
              <div className="space-y-2">
                <Label htmlFor="price">Price for the whole workshop (INR) <span className="text-red-500">*</span></Label>
                <Input id="price" type="number" min={1} placeholder="e.g., 4999" disabled={busy} {...register('price', { valueAsNumber: true })} />
                {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
              </div>
            )}

            {/* ---------------- Registration window ---------------- */}
            <div className="space-y-3 rounded-lg border p-4">
              <Label className="text-base">Registration closes</Label>
              <Controller
                name="registration_cutoff_mode"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={busy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_day">When Day 1 starts</SelectItem>
                      <SelectItem value="custom">At a specific date &amp; time</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {cutoffMode === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Cutoff date</Label>
                    <Input type="date" disabled={busy} {...register('registration_closes_date')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cutoff time</Label>
                    <Input type="time" disabled={busy} {...register('registration_closes_time')} />
                  </div>
                </div>
              )}
              {errors.registration_closes_date && (
                <p className="text-sm text-red-500">{errors.registration_closes_date.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                A later cutoff lets students join mid-workshop and catch up on recordings. It cannot be
                after the last day ends.
              </p>
            </div>

            {/* ---------------- Capacity ---------------- */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Controller
                  name="capacity_mode"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={busy}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                        <SelectItem value="limited">Limited seats</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {capacityMode === 'limited' && (
                <div className="space-y-2">
                  <Label htmlFor="max_seats">Seat limit</Label>
                  <Input id="max_seats" type="number" min={1} disabled={busy} {...register('max_seats', { valueAsNumber: true })} />
                  {errors.max_seats && <p className="text-sm text-red-500">{errors.max_seats.message}</p>}
                </div>
              )}
            </div>

            {capacityMode === 'limited' && (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Waitlist</Label>
                  <p className="text-sm text-muted-foreground">
                    When full, new registrations join a waitlist and are promoted automatically as seats free up.
                  </p>
                </div>
                <Controller
                  name="allow_waitlist"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={busy} />
                  )}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Registration Mode</Label>
              <Controller
                name="enrollment_mode"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={busy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enrollment_required">Registration required</SelectItem>
                      <SelectItem value="open">Open — anyone can join</SelectItem>
                      <SelectItem value="disabled">Closed — nobody can join</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Paid workshops should keep &quot;Registration required&quot; so each payment maps to a seat.
              </p>
            </div>

            {/* ---------------- Certificates ---------------- */}
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Completion Certificate</Label>
                  <p className="text-sm text-muted-foreground">
                    Issue a PDF certificate once the workshop ends and attendance is met.
                  </p>
                </div>
                <Controller
                  name="certificate_enabled"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={busy} />
                  )}
                />
              </div>

              {certificateEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="certificate_min_days_attended" className="text-xs">
                      Minimum days attended
                    </Label>
                    <Input
                      id="certificate_min_days_attended"
                      type="number"
                      min={1}
                      max={fields.length}
                      placeholder={`All ${fields.length} days`}
                      disabled={busy}
                      {...register('certificate_min_days_attended', {
                        setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to require every day. Cancelled days never count against a student.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Signatory name</Label>
                      <Input placeholder="PGME Academic Office" disabled={busy} {...register('certificate_signatory_name')} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Signatory title</Label>
                      <Input placeholder="Authorised Signatory" disabled={busy} {...register('certificate_signatory_title')} />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ---------------- Visibility ---------------- */}
            <div className="space-y-2">
              <Label>Visible To</Label>
              <Select
                value={visibleTo}
                onValueChange={(v) => {
                  setVisibleTo(v as VisibleTo)
                  setSelectedSubjectIds([])
                  setSelectedPackageIds([])
                }}
                disabled={busy}
              >
                <SelectTrigger><SelectValue placeholder="Select visibility..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="subject">Subject Specific</SelectItem>
                  <SelectItem value="package">Package Specific</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {visibleTo === 'all' && 'Workshop is visible to all users.'}
                {visibleTo === 'subject' && 'Only users who selected one of the chosen subjects will see it.'}
                {visibleTo === 'package' && 'Only users who purchased one of the chosen packages will see it.'}
              </p>
            </div>

            {visibleTo === 'subject' && (
              <div className="space-y-2">
                <Label>Select Subjects <span className="text-red-500">*</span></Label>
                <div className="rounded-lg border p-3 space-y-2 max-h-40 overflow-y-auto">
                  {visibilitySubjects.map((s) => (
                    <label key={s._id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedSubjectIds.includes(s._id)}
                        onCheckedChange={(checked) =>
                          setSelectedSubjectIds((prev) =>
                            checked ? [...prev, s._id] : prev.filter((id) => id !== s._id),
                          )
                        }
                        disabled={busy}
                      />
                      <span className="text-sm">{s.name}</span>
                    </label>
                  ))}
                </div>
                {selectedSubjectIds.length === 0 && (
                  <p className="text-xs text-amber-600">Select at least one subject</p>
                )}
              </div>
            )}

            {visibleTo === 'package' && (
              <div className="space-y-2">
                <Label>Select Packages <span className="text-red-500">*</span></Label>
                <div className="rounded-lg border p-3 space-y-2 max-h-40 overflow-y-auto">
                  {packages.map((pkg) => (
                    <label key={pkg._id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedPackageIds.includes(pkg._id)}
                        onCheckedChange={(checked) =>
                          setSelectedPackageIds((prev) =>
                            checked ? [...prev, pkg._id] : prev.filter((id) => id !== pkg._id),
                          )
                        }
                        disabled={busy}
                      />
                      <span className="text-sm">
                        {pkg.name}
                        {pkg.subject_id?.name ? ` (${pkg.subject_id.name})` : ''}
                      </span>
                    </label>
                  ))}
                </div>
                {selectedPackageIds.length === 0 && (
                  <p className="text-xs text-amber-600">Select at least one package</p>
                )}
              </div>
            )}

            {/* ---------------- Publish ---------------- */}
            <div className="space-y-2">
              <Label>Publish Status</Label>
              <Controller
                name="publish_status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={busy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Draft workshops are admin-only. Publishing also publishes every day.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadProgress !== null ? 'Uploading...' : mode === 'create' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  <>{mode === 'create' ? 'Create Workshop' : 'Update Workshop'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ImageCropper
        file={cropperFile}
        open={showCropper}
        aspectRatio={16 / 9}
        title="Crop Thumbnail"
        description="Adjust the crop area for the workshop thumbnail (16:9 ratio)."
        onClose={() => { setShowCropper(false); setCropperFile(null) }}
        onCropComplete={(croppedFile) => { setThumbnailFile([croppedFile]); setShowCropper(false); setCropperFile(null) }}
      />
    </>
  )
}
