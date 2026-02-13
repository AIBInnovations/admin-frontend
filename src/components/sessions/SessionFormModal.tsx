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
import { Loader2 } from 'lucide-react'
import { subjectsService, Subject } from '@/services/subjects.service'
import { apiService } from '@/services/api.service'
import { LiveSession, LiveSessionFormData } from '@/services/liveSessions.service'

// --- Zod Schema ---
const sessionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  subject_id: z.string().min(1, 'Subject is required'),
  faculty_id: z.string().min(1, 'Faculty is required'),
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

  useEffect(() => {
    if (open) {
      subjectsService.getSubjects({ limit: 100, sort_by: 'name', sort_order: 'asc' }).then((res) => {
        if (res.success && res.data) setSubjects(res.data.entities)
      })
      apiService.get<{ entities: Array<{ _id: string; name: string }> }>('admin/faculty?limit=100').then((res) => {
        if (res.success && res.data) setFaculty(res.data.entities)
      })
    }
  }, [open])

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
      } else {
        reset({
          title: '', description: '', subject_id: '', faculty_id: '',
          scheduled_date: '', scheduled_time: '', duration_minutes: 60,
          platform: 'zoom', enrollment_mode: 'enrollment_required',
          capacity_mode: 'limited', max_attendees: 100,
          is_free: false, price: 299,
          allow_waitlist: true, guaranteed_seats_for_paid: true,
        })
      }
    }
  }, [open, mode, session, reset])

  const handleFormSubmit = async (data: SessionFormValues) => {
    try {
      const startDateTime = new Date(`${data.scheduled_date}T${data.scheduled_time}:00`)
      const endDateTime = new Date(startDateTime.getTime() + data.duration_minutes * 60000)
      const formData: LiveSessionFormData = {
        title: data.title, description: data.description || '',
        subject_id: data.subject_id, faculty_id: data.faculty_id || undefined,
        scheduled_start_time: startDateTime.toISOString(),
        scheduled_end_time: endDateTime.toISOString(),
        platform: data.platform, enrollment_mode: data.enrollment_mode,
        capacity_mode: data.capacity_mode,
        max_attendees: data.capacity_mode === 'limited' ? (data.max_attendees || undefined) : undefined,
        is_free: data.is_free, price: data.is_free ? 0 : (data.price || undefined),
        allow_waitlist: data.allow_waitlist, guaranteed_seats_for_paid: data.guaranteed_seats_for_paid,
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
            <Input id="title" placeholder="e.g., Upper Limb Anatomy" disabled={isSubmitting} {...register('title')} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Brief description..." rows={3} disabled={isSubmitting} {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subject <span className="text-red-500">*</span></Label>
              <Controller name="subject_id" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              {errors.subject_id && <p className="text-sm text-red-500">{errors.subject_id.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Faculty <span className="text-red-500">*</span></Label>
              <Controller name="faculty_id" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                  <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                  <SelectContent>
                    {faculty.map((f) => <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              {errors.faculty_id && <p className="text-sm text-red-500">{errors.faculty_id.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Date <span className="text-red-500">*</span></Label>
              <Input id="scheduled_date" type="date" disabled={isSubmitting} {...register('scheduled_date')} />
              {errors.scheduled_date && <p className="text-sm text-red-500">{errors.scheduled_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduled_time">Start Time <span className="text-red-500">*</span></Label>
              <Input id="scheduled_time" type="time" disabled={isSubmitting} {...register('scheduled_time')} />
              {errors.scheduled_time && <p className="text-sm text-red-500">{errors.scheduled_time.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (min) <span className="text-red-500">*</span></Label>
              <Input id="duration_minutes" type="number" min={15} max={480} step={15} disabled={isSubmitting} {...register('duration_minutes', { valueAsNumber: true })} />
              {errors.duration_minutes && <p className="text-sm text-red-500">{errors.duration_minutes.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Controller name="platform" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
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
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
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
                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
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
                <Input id="max_attendees" type="number" min={1} disabled={isSubmitting} {...register('max_attendees', { valueAsNumber: true })} />
                {errors.max_attendees && <p className="text-sm text-red-500">{errors.max_attendees.message}</p>}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_free" className="text-base">Free Session</Label>
              <p className="text-sm text-muted-foreground">{isFree ? 'No charge for attendees' : 'Attendees must pay to join'}</p>
            </div>
            <Switch id="is_free" checked={isFree} onCheckedChange={(c) => { setValue('is_free', c); if (c) setValue('price', null) }} disabled={isSubmitting} />
          </div>

          {!isFree && (
            <div className="space-y-2">
              <Label htmlFor="price">Price (INR) <span className="text-red-500">*</span></Label>
              <Input id="price" type="number" min={1} placeholder="e.g., 299" disabled={isSubmitting} {...register('price', { valueAsNumber: true })} />
              {errors.price && <p className="text-sm text-red-500">{errors.price.message}</p>}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <Label htmlFor="allow_waitlist" className="text-sm font-medium">Allow Waitlist</Label>
                <p className="text-xs text-muted-foreground">Allow users to join waitlist when full</p>
              </div>
              <Switch id="allow_waitlist" checked={watch('allow_waitlist')} onCheckedChange={(c) => setValue('allow_waitlist', c)} disabled={isSubmitting} />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <Label htmlFor="guaranteed_seats" className="text-sm font-medium">Guaranteed Seats for Paid</Label>
                <p className="text-xs text-muted-foreground">Reserve seats for paid users first</p>
              </div>
              <Switch id="guaranteed_seats" checked={watch('guaranteed_seats_for_paid')} onCheckedChange={(c) => setValue('guaranteed_seats_for_paid', c)} disabled={isSubmitting} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Scheduling...' : 'Updating...'}</>
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
