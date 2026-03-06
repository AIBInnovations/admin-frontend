import { useEffect, useState } from 'react'
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
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { FileUpload } from '@/components/common/FileUpload'
import { ImageCropper } from '@/components/common/ImageCropper'
import { Loader2, X } from 'lucide-react'
import { Faculty, FacultyFormData, facultyService } from '@/services/faculty.service'
import { subjectsService, Subject } from '@/services/subjects.service'
import { toast } from 'sonner'

const facultySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  specialization: z.string().max(100).optional().or(z.literal('')),
  subject_id: z.string().optional().or(z.literal('')),
  display_order: z.number().int().min(0).optional().or(z.nan()),
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
  const [photoFile, setPhotoFile] = useState<File[]>([])
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null)
  const [existingS3Key, setExistingS3Key] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [cropperFile, setCropperFile] = useState<File | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])

  // Load subjects for dropdown
  useEffect(() => {
    if (open) {
      subjectsService.getSubjects({ limit: 100, is_active: true, sort_by: 'display_order', sort_order: 'asc' }).then((res) => {
        if (res.success && res.data) {
          setSubjects(res.data.entities)
        }
      })
    }
  }, [open])

  // Manage preview URL for cropped photo
  useEffect(() => {
    if (photoFile.length > 0) {
      const url = URL.createObjectURL(photoFile[0])
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [photoFile])

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
    reset, setValue, watch,
  } = useForm<FacultyFormValues>({
    resolver: zodResolver(facultySchema),
    defaultValues: {
      name: '', specialization: '', subject_id: '', display_order: 0,
      email: '', phone: '',
      bio: '', qualifications: '', experience_years: 0, is_active: true,
    },
  })

  const isActive = watch('is_active')
  const selectedSubjectId = watch('subject_id')

  // Reset form
  useEffect(() => {
    if (open) {
      setPhotoFile([])
      setUploadProgress(null)
      if (mode === 'edit' && faculty) {
        const subjectIdValue = faculty.subject_id
          ? (typeof faculty.subject_id === 'object' ? faculty.subject_id._id : faculty.subject_id)
          : ''
        reset({
          name: faculty.name,
          specialization: faculty.specialization || '',
          subject_id: subjectIdValue,
          display_order: faculty.display_order ?? 0,
          email: faculty.email || '',
          phone: faculty.phone || '',
          bio: faculty.bio || '',
          qualifications: faculty.qualifications || '',
          experience_years: faculty.experience_years ?? 0,
          is_active: faculty.is_active,
        })
        setExistingPhotoUrl(faculty.photo_url)
        setExistingS3Key(faculty.photo_s3_key)
      } else {
        reset({
          name: '', specialization: '', subject_id: '', display_order: 0,
          email: '', phone: '',
          bio: '', qualifications: '', experience_years: 0, is_active: true,
        })
        setExistingPhotoUrl(null)
        setExistingS3Key(null)
      }
    }
  }, [open, mode, faculty, reset])

  const handleFormSubmit = async (data: FacultyFormValues) => {
    try {
      let photoUrl = existingPhotoUrl || undefined
      let photoS3Key = existingS3Key || undefined

      // Upload new photo if selected
      if (photoFile.length > 0) {
        setUploadProgress(0)
        try {
          const result = await facultyService.uploadPhoto(photoFile[0], setUploadProgress)
          photoUrl = result.photoUrl
          photoS3Key = result.s3Key
        } catch (err: any) {
          toast.error(err.message || 'Failed to upload photo')
          setUploadProgress(null)
          return
        }
        setUploadProgress(null)
      }

      const formData: FacultyFormData = {
        name: data.name,
        specialization: data.specialization || undefined,
        subject_id: data.subject_id || null,
        display_order: data.display_order && !isNaN(data.display_order) ? data.display_order : 0,
        email: data.email || undefined,
        phone: data.phone || undefined,
        photo_url: photoUrl,
        photo_s3_key: photoS3Key,
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

  const handleClose = () => { if (!isSubmitting && uploadProgress === null) onClose() }

  const handleRemoveExistingPhoto = () => {
    setExistingPhotoUrl(null)
    setExistingS3Key(null)
  }

  const handleFileSelected = (files: File[]) => {
    if (files.length > 0) {
      setCropperFile(files[0])
      setShowCropper(true)
    }
  }

  const handleCropComplete = (croppedFile: File) => {
    setPhotoFile([croppedFile])
    setShowCropper(false)
    setCropperFile(null)
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    setCropperFile(null)
  }

  const isUploading = uploadProgress !== null

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Faculty' : 'Edit Faculty'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new faculty member.' : 'Update faculty details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photo</Label>
            {photoFile.length > 0 && previewUrl ? (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={previewUrl} alt="Cropped photo" className="h-16 w-16 rounded-lg object-cover border" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full"
                    onClick={() => setPhotoFile([])}
                    disabled={isSubmitting || isUploading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Cropped photo ready. Click X to choose a different one.</p>
              </div>
            ) : existingPhotoUrl ? (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={existingPhotoUrl} alt="Faculty" className="h-16 w-16 rounded-lg object-cover border" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full"
                    onClick={handleRemoveExistingPhoto}
                    disabled={isSubmitting || isUploading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Upload a new photo to replace.</p>
              </div>
            ) : (
              <FileUpload
                accept={{ 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] }}
                maxSize={5 * 1024 * 1024}
                maxFiles={1}
                value={[]}
                onChange={handleFileSelected}
                disabled={isSubmitting || isUploading}
                label="Upload faculty photo"
                description="JPEG, PNG, or WebP. Max 5MB. Will be cropped to square."
              />
            )}
            {uploadProgress !== null && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">Uploading... {uploadProgress}%</p>
              </div>
            )}
          </div>

          {/* Name + Subject */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input id="name" placeholder="Dr. John Doe" disabled={isSubmitting || isUploading} {...register('name')} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject_id">Subject</Label>
              <Select
                value={selectedSubjectId || ''}
                onValueChange={(value) => {
                  const id = value === '__none__' ? '' : value
                  setValue('subject_id', id)
                  const subject = subjects.find((s) => s._id === id)
                  setValue('specialization', subject ? subject.name : '')
                }}
                disabled={isSubmitting || isUploading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Specialization + Display Order */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input id="specialization" placeholder="e.g., Cardiology" disabled={isSubmitting || isUploading} {...register('specialization')} />
              {errors.specialization && <p className="text-sm text-red-500">{errors.specialization.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input id="display_order" type="number" min={0} disabled={isSubmitting || isUploading} {...register('display_order', { valueAsNumber: true })} />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="faculty@example.com" disabled={isSubmitting || isUploading} {...register('email')} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="10-digit number" disabled={isSubmitting || isUploading} {...register('phone')} />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
            </div>
          </div>

          {/* Qualifications + Experience */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qualifications">Qualifications</Label>
              <Input id="qualifications" placeholder="e.g., MD, DNB" disabled={isSubmitting || isUploading} {...register('qualifications')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience_years">Experience (years)</Label>
              <Input id="experience_years" type="number" min={0} disabled={isSubmitting || isUploading} {...register('experience_years', { valueAsNumber: true })} />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" placeholder="Brief faculty bio..." rows={3} disabled={isSubmitting || isUploading} {...register('bio')} />
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
              disabled={isSubmitting || isUploading}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting || isUploading}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting || isUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isUploading ? 'Uploading...' : mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Add Faculty' : 'Update Faculty'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Photo Cropper Dialog */}
    <ImageCropper
      file={cropperFile}
      open={showCropper}
      onClose={handleCropCancel}
      onCropComplete={handleCropComplete}
      aspectRatio={1}
      title="Crop Faculty Photo"
      description="Adjust the crop area for the faculty profile photo (1:1 square)."
    />
    </>
  )
}
