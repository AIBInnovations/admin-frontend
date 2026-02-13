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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { Faculty, FacultyFormData } from '@/services/faculty.service'

const facultySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  specialization: z.string().min(2, 'Specialization is required').max(100),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().regex(/^\d{10}$/, 'Must be 10 digits').optional().or(z.literal('')),
  bio: z.string().max(2000).optional().or(z.literal('')),
  qualifications: z.string().max(500).optional().or(z.literal('')),
  experience_years: z.number().int().min(0).optional().or(z.nan()),
  is_active: z.boolean(),
})

type FacultyFormValues = z.infer<typeof facultySchema>

interface FacultyFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: FacultyFormData) => Promise<void>
  faculty?: Faculty | null
  mode: 'create' | 'edit'
}

export function FacultyFormModal({ open, onClose, onSubmit, faculty, mode }: FacultyFormModalProps) {
  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<FacultyFormValues>({
    resolver: zodResolver(facultySchema),
    defaultValues: {
      name: '', specialization: '', email: '', phone: '',
      bio: '', qualifications: '', experience_years: 0, is_active: true,
    },
  })

  const isActive = watch('is_active')

  // Reset form
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && faculty) {
        reset({
          name: faculty.name,
          specialization: faculty.specialization,
          email: faculty.email || '',
          phone: faculty.phone || '',
          bio: faculty.bio || '',
          qualifications: faculty.qualifications || '',
          experience_years: faculty.experience_years ?? 0,
          is_active: faculty.is_active,
        })
      } else {
        reset({
          name: '', specialization: '', email: '', phone: '',
          bio: '', qualifications: '', experience_years: 0, is_active: true,
        })
      }
    }
  }, [open, mode, faculty, reset])

  const handleFormSubmit = async (data: FacultyFormValues) => {
    try {
      const formData: FacultyFormData = {
        name: data.name,
        specialization: data.specialization,
        email: data.email || undefined,
        phone: data.phone || undefined,
        bio: data.bio || undefined,
        qualifications: data.qualifications || undefined,
        experience_years: data.experience_years && !isNaN(data.experience_years) ? data.experience_years : undefined,
        is_active: data.is_active,
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
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Faculty' : 'Edit Faculty'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new faculty member.' : 'Update faculty details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name + Specialization */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input id="name" placeholder="Dr. John Doe" disabled={isSubmitting} {...register('name')} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization <span className="text-red-500">*</span></Label>
              <Input id="specialization" placeholder="e.g., Cardiology" disabled={isSubmitting} {...register('specialization')} />
              {errors.specialization && <p className="text-sm text-red-500">{errors.specialization.message}</p>}
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="faculty@example.com" disabled={isSubmitting} {...register('email')} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="10-digit number" disabled={isSubmitting} {...register('phone')} />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
            </div>
          </div>

          {/* Qualifications + Experience */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qualifications">Qualifications</Label>
              <Input id="qualifications" placeholder="e.g., MD, DNB" disabled={isSubmitting} {...register('qualifications')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience_years">Experience (years)</Label>
              <Input id="experience_years" type="number" min={0} disabled={isSubmitting} {...register('experience_years', { valueAsNumber: true })} />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" placeholder="Brief faculty bio..." rows={3} disabled={isSubmitting} {...register('bio')} />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-base">Active</Label>
              <p className="text-sm text-muted-foreground">
                {isActive ? 'Faculty is visible and active' : 'Faculty is deactivated'}
              </p>
            </div>
            <Switch
              id="is_active" checked={isActive}
              onCheckedChange={(checked) => setValue('is_active', checked)}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Add Faculty' : 'Update Faculty'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
