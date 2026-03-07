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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { FileUpload } from '@/components/common/FileUpload'
import { Loader2, Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { subjectsService, Subject } from '@/services/subjects.service'
import { packagesService, Package } from '@/services/packages.service'
import { apiService } from '@/services/api.service'
import { LiveSession, LiveSessionFormData, VisibleTo, liveSessionsService } from '@/services/liveSessions.service'
import { toast } from 'sonner'

// --- Zod Schema ---
const sessionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  subject_id: z.string().min(1, 'Subject is required'),
  faculty_id: z.string().optional().or(z.literal('')),
  scheduled_date: z.string().min(1, 'Date is required'),
  scheduled_time: z.string().min(1, 'Start time is required'),
  duration_minutes: z.number({ error: 'Duration is required' }).int().min(15, 'Min 15 minutes').max(480, 'Max 8 hours'),
  platform: z.enum(['zoom', 'agora', 'teams', 'other']),
  enrollment_mode: z.enum(['open', 'enrollment_required', 'disabled']),
  capacity_mode: z.enum(['limited', 'unlimited']),
  max_attendees: z.number().int().min(1).optional().nullable(),
  is_free: z.boolean(),
  price: z.number().min(0).optional().nullable(),
  allow_waitlist: z.boolean(),
  guaranteed_seats_for_paid: z.boolean(),
}).refine(
  (data) => data.capacity_mode === 'unlimited' || (data.max_attendees && data.max_attendees > 0),
  { message: 'Max attendees required for limited capacity', path: ['max_attendees'] },
).refine(
  (data) => data.is_free || (data.price && data.price > 0),
  { message: 'Price is required for paid sessions', path: ['price'] },
)

type SessionFormValues = z.infer<typeof sessionSchema>

interface SessionFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: LiveSessionFormData) => Promise<void>
  session?: LiveSession | null
  mode: 'create' | 'edit'
}

export function SessionFormModal({ open, onClose, onSubmit, session, mode }: SessionFormModalProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [faculty, setFaculty] = useState<Array<{ _id: string; name: string }>>([])
  const [subjectPopoverOpen, setSubjectPopoverOpen] = useState(false)
  const [facultyPopoverOpen, setFacultyPopoverOpen] = useState(false)

  // Thumbnail state
  const [thumbnailFile, setThumbnailFile] = useState<File[]>([])
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null)
  const [existingThumbnailS3Key, setExistingThumbnailS3Key] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null)

  // Visibility state
  const [visibleTo, setVisibleTo] = useState<VisibleTo>('all')
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([])
  const [selectedVisibilityPackageIds, setSelectedVisibilityPackageIds] = useState<string[]>([])
  const [visibilitySubjects, setVisibilitySubjects] = useState<Subject[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [visibilitySubjectsLoading, setVisibilitySubjectsLoading] = useState(false)
  const [packagesLoading, setPackagesLoading] = useState(false)

  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      title: '', description: '', subject_id: '', faculty_id: '',
      scheduled_date: '', scheduled_time: '', duration_minutes: 60,
      platform: 'zoom', enrollment_mode: 'enrollment_required',
      capacity_mode: 'limited', max_attendees: 100,
      is_free: false, price: 299,
      allow_waitlist: true, guaranteed_seats_for_paid: true,
    },
  })

  const isFree = watch('is_free')
  const capacityMode = watch('capacity_mode')

  // Manage thumbnail preview URL
  useEffect(() => {
    if (thumbnailFile.length > 0) {
      const url = URL.createObjectURL(thumbnailFile[0])
      setThumbnailPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setThumbnailPreviewUrl(null)
  }, [thumbnailFile])

  useEffect(() => {
    if (open) {
      subjectsService.getSubjects({ limit: 100, sort_by: 'name', sort_order: 'asc' }).then((res) => {
        if (res.success && res.data) setSubjects(res.data.entities)
      })
      apiService.get<{ entities: Array<{ _id: string; name: string }> }>('admin/faculty?limit=100').then((res) => {
        if (res.success && res.data) setFaculty(res.data.entities)
      })
      fetchVisibilitySubjects()
      fetchPackages()
    }
  }, [open])

  const fetchVisibilitySubjects = async () => {
    setVisibilitySubjectsLoading(true)
    try {
      const res = await subjectsService.getSubjects({ is_active: true, limit: 100 })
      if (res.success && res.data) setVisibilitySubjects(res.data.entities || [])
    } catch {
      console.error('Failed to fetch subjects')
    }
    setVisibilitySubjectsLoading(false)
  }

  const fetchPackages = async () => {
    setPackagesLoading(true)
    try {
      const res = await packagesService.getAll({ is_active: true, limit: 100 })
      if (res.success && res.data) setPackages(res.data.entities || [])
    } catch {
      console.error('Failed to fetch packages')
    }
    setPackagesLoading(false)
  }

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && session) {
        const startDate = new Date(session.scheduled_start_time)
        const subjectId = typeof session.subject_id === 'object' ? session.subject_id._id : session.subject_id
        const facultyId = typeof session.faculty_id === 'object' && session.faculty_id ? session.faculty_id._id : (session.faculty_id as string || '')
        reset({
          title: session.title, description: session.description || '',
          subject_id: subjectId, faculty_id: facultyId,
          scheduled_date: startDate.toISOString().split('T')[0],
          scheduled_time: startDate.toTimeString().slice(0, 5),
          duration_minutes: session.duration_minutes, platform: session.platform,
          enrollment_mode: session.enrollment_mode, capacity_mode: session.capacity_mode,
          max_attendees: session.max_attendees, is_free: session.is_free,
          price: session.is_free ? null : session.price,
          allow_waitlist: session.allow_waitlist, guaranteed_seats_for_paid: session.guaranteed_seats_for_paid,
        })
        setExistingThumbnailUrl(session.thumbnail_url)
        setExistingThumbnailS3Key(session.thumbnail_s3_key)
        setThumbnailFile([])
        setVisibleTo(session.visible_to || 'all')
        setSelectedSubjectIds(session.visible_to_subjects || [])
        setSelectedVisibilityPackageIds(session.visible_to_packages || [])
      } else {
        reset({
          title: '', description: '', subject_id: '', faculty_id: '',
          scheduled_date: '', scheduled_time: '', duration_minutes: 60,
          platform: 'zoom', enrollment_mode: 'enrollment_required',
          capacity_mode: 'limited', max_attendees: 100,
          is_free: false, price: 299,
          allow_waitlist: true, guaranteed_seats_for_paid: true,
        })
        setExistingThumbnailUrl(null)
        setExistingThumbnailS3Key(null)
        setThumbnailFile([])
        setVisibleTo('all')
        setSelectedSubjectIds([])
        setSelectedVisibilityPackageIds([])
      }
    }
  }, [open, mode, session, reset])

  const handleFormSubmit = async (data: SessionFormValues) => {
    try {
      const startDateTime = new Date(`${data.scheduled_date}T${data.scheduled_time}:00`)
      const endDateTime = new Date(startDateTime.getTime() + data.duration_minutes * 60000)

      let thumbnailUrl = existingThumbnailUrl || undefined
      let thumbnailS3Key = existingThumbnailS3Key || undefined

      // Upload new thumbnail if selected
      if (thumbnailFile.length > 0) {
        setUploadProgress(0)
        try {
          const result = await liveSessionsService.uploadThumbnail(thumbnailFile[0], setUploadProgress)
          thumbnailUrl = result.thumbnailUrl
          thumbnailS3Key = result.s3Key
        } catch (err: any) {
          toast.error(err.message || 'Failed to upload thumbnail')
          setUploadProgress(null)
          return
        }
        setUploadProgress(null)
      }

      const formData: LiveSessionFormData = {
        title: data.title, description: data.description || '',
        subject_id: data.subject_id, faculty_id: data.faculty_id || null,
        scheduled_start_time: startDateTime.toISOString(),
        scheduled_end_time: endDateTime.toISOString(),
        platform: data.platform, enrollment_mode: data.enrollment_mode,
        capacity_mode: data.capacity_mode,
        max_attendees: data.capacity_mode === 'limited' ? (data.max_attendees || undefined) : undefined,
        is_free: data.is_free, price: data.is_free ? 0 : (data.price || undefined),
        allow_waitlist: true, guaranteed_seats_for_paid: true,
        thumbnail_url: thumbnailUrl,
        thumbnail_s3_key: thumbnailS3Key,
        visible_to: visibleTo,
        visible_to_subjects: visibleTo === 'subject' ? selectedSubjectIds : [],
        visible_to_packages: visibleTo === 'package' ? selectedVisibilityPackageIds : [],
      }
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  const handleClose = () => { if (!isSubmitting && uploadProgress === null) onClose() }
  const isUploading = uploadProgress !== null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Schedule Live Session' : 'Edit Live Session'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Create a new live session for students.' : 'Update the session details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input id="title" placeholder="e.g., Upper Limb Anatomy" disabled={isSubmitting || isUploading} {...register('title')} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Brief description..." rows={3} disabled={isSubmitting || isUploading} {...register('description')} />
          </div>

          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <Label>Thumbnail / Banner</Label>
            {thumbnailFile.length > 0 ? (
              <div className="relative rounded-lg border overflow-hidden">
                <img src={thumbnailPreviewUrl!} alt="Thumbnail preview" className="w-full h-32 object-cover" />
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
                <p className="text-xs text-muted-foreground px-3 py-1.5 bg-muted/80">Current thumbnail. Upload new to replace.</p>
              </div>
            ) : (
              <FileUpload
                accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }}
                maxSize={5 * 1024 * 1024}
                maxFiles={1}
                value={[]}
                onChange={(files) => files.length > 0 && setThumbnailFile(files)}
                disabled={isSubmitting || isUploading}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subject <span className="text-red-500">*</span></Label>
              <Controller name="subject_id" control={control} render={({ field }) => {
                const selectedSubject = subjects.find((s) => s._id === field.value)
                return (
                  <Popover open={subjectPopoverOpen} onOpenChange={setSubjectPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline" role="combobox" aria-expanded={subjectPopoverOpen}
                        className="w-full justify-between font-normal" disabled={isSubmitting || isUploading}
                      >
                        {selectedSubject ? selectedSubject.name : 'Select subject'}
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
                              <CommandItem key={s._id} value={s.name} onSelect={() => { field.onChange(s._id); setSubjectPopoverOpen(false) }}>
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
              }} />
              {errors.subject_id && <p className="text-sm text-red-500">{errors.subject_id.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Faculty</Label>
              <Controller name="faculty_id" control={control} render={({ field }) => {
                const selectedFaculty = faculty.find((f) => f._id === field.value)
                return (
                  <Popover open={facultyPopoverOpen} onOpenChange={setFacultyPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline" role="combobox" aria-expanded={facultyPopoverOpen}
                        className="w-full justify-between font-normal" disabled={isSubmitting || isUploading}
                      >
                        {selectedFaculty ? selectedFaculty.name : 'No faculty'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search faculty..." />
                        <CommandList>
                          <CommandEmpty>No faculty found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem value="__none__" onSelect={() => { field.onChange(''); setFacultyPopoverOpen(false) }}>
                              <Check className={cn('mr-2 h-4 w-4', !field.value ? 'opacity-100' : 'opacity-0')} />
                              <span className="text-muted-foreground">None</span>
                            </CommandItem>
                            {faculty.map((f) => (
                              <CommandItem key={f._id} value={f.name} onSelect={() => { field.onChange(f._id); setFacultyPopoverOpen(false) }}>
                                <Check className={cn('mr-2 h-4 w-4', field.value === f._id ? 'opacity-100' : 'opacity-0')} />
                                {f.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )
              }} />
              {errors.faculty_id && <p className="text-sm text-red-500">{errors.faculty_id.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Date <span className="text-red-500">*</span></Label>
              <Input id="scheduled_date" type="date" disabled={isSubmitting || isUploading} {...register('scheduled_date')} />
              {errors.scheduled_date && <p className="text-sm text-red-500">{errors.scheduled_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled_time">Start Time <span className="text-red-500">*</span></Label>
              <Input id="scheduled_time" type="time" disabled={isSubmitting || isUploading} {...register('scheduled_time')} />
              {errors.scheduled_time && <p className="text-sm text-red-500">{errors.scheduled_time.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (min) <span className="text-red-500">*</span></Label>
              <Input id="duration_minutes" type="number" min={15} max={480} step={15} disabled={isSubmitting || isUploading} {...register('duration_minutes', { valueAsNumber: true })} />
              {errors.duration_minutes && <p className="text-sm text-red-500">{errors.duration_minutes.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Controller name="platform" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting || isUploading}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="agora">Agora</SelectItem>
                    <SelectItem value="teams">Teams</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label>Enrollment Mode</Label>
              <Controller name="enrollment_mode" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting || isUploading}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="enrollment_required">Enrollment Required</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Capacity Mode</Label>
              <Controller name="capacity_mode" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting || isUploading}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="limited">Limited</SelectItem>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            {capacityMode === 'limited' && (
              <div className="space-y-2">
                <Label htmlFor="max_attendees">Max Attendees</Label>
                <Input id="max_attendees" type="number" min={1} disabled={isSubmitting || isUploading} {...register('max_attendees', { valueAsNumber: true })} />
                {errors.max_attendees && <p className="text-sm text-red-500">{errors.max_attendees.message}</p>}
              </div>
            )}
          </div>

          {/* Visible To */}
          <div className="space-y-2">
            <Label>Visible To</Label>
            <Select
              value={visibleTo}
              onValueChange={(v) => {
                setVisibleTo(v as VisibleTo)
                setSelectedSubjectIds([])
                setSelectedVisibilityPackageIds([])
              }}
              disabled={isSubmitting || isUploading}
            >
              <SelectTrigger><SelectValue placeholder="Select visibility..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="subject">Subject Specific</SelectItem>
                <SelectItem value="package">Package Specific</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {visibleTo === 'all' && 'Session is visible to all users.'}
              {visibleTo === 'subject' && 'Only users who have selected one of the chosen subjects will see this session.'}
              {visibleTo === 'package' && 'Only users who have purchased one of the chosen packages will see this session.'}
            </p>
          </div>

          {/* Subject multi-select for visibility */}
          {visibleTo === 'subject' && (
            <div className="space-y-2">
              <Label>Select Subjects <span className="text-red-500">*</span></Label>
              {visibilitySubjectsLoading ? (
                <p className="text-sm text-muted-foreground">Loading subjects...</p>
              ) : visibilitySubjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subjects found</p>
              ) : (
                <div className="rounded-lg border p-3 space-y-2 max-h-40 overflow-y-auto">
                  {visibilitySubjects.map((subject) => (
                    <label key={subject._id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedSubjectIds.includes(subject._id)}
                        onCheckedChange={(checked) => {
                          setSelectedSubjectIds((prev) =>
                            checked ? [...prev, subject._id] : prev.filter((id) => id !== subject._id)
                          )
                        }}
                        disabled={isSubmitting || isUploading}
                      />
                      <span className="text-sm">{subject.name}</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedSubjectIds.length === 0 && (
                <p className="text-xs text-amber-600">Select at least one subject</p>
              )}
            </div>
          )}

          {/* Package multi-select for visibility */}
          {visibleTo === 'package' && (
            <div className="space-y-2">
              <Label>Select Packages <span className="text-red-500">*</span></Label>
              {packagesLoading ? (
                <p className="text-sm text-muted-foreground">Loading packages...</p>
              ) : packages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No packages found</p>
              ) : (
                <div className="rounded-lg border p-3 space-y-2 max-h-40 overflow-y-auto">
                  {packages.map((pkg) => (
                    <label key={pkg._id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedVisibilityPackageIds.includes(pkg._id)}
                        onCheckedChange={(checked) => {
                          setSelectedVisibilityPackageIds((prev) =>
                            checked ? [...prev, pkg._id] : prev.filter((id) => id !== pkg._id)
                          )
                        }}
                        disabled={isSubmitting || isUploading}
                      />
                      <span className="text-sm">
                        {pkg.name}
                        {pkg.subject_id?.name ? ` (${pkg.subject_id.name})` : ''}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {selectedVisibilityPackageIds.length === 0 && (
                <p className="text-xs text-amber-600">Select at least one package</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_free" className="text-base">Free Session</Label>
              <p className="text-sm text-muted-foreground">{isFree ? 'No charge for attendees' : 'Attendees must pay to join'}</p>
            </div>
            <Switch id="is_free" checked={isFree} onCheckedChange={(c) => { setValue('is_free', c); if (c) setValue('price', null) }} disabled={isSubmitting || isUploading} />
          </div>

          {!isFree && (
            <div className="space-y-2">
              <Label htmlFor="price">Price (INR) <span className="text-red-500">*</span></Label>
              <Input id="price" type="number" min={1} placeholder="e.g., 299" disabled={isSubmitting || isUploading} {...register('price', { valueAsNumber: true })} />
              {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting || isUploading}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting || isUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isUploading ? 'Uploading...' : mode === 'create' ? 'Scheduling...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Schedule Session' : 'Update Session'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
