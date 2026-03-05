import { useEffect } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import type { User, CreateUserData, UpdateUserData } from '@/services/users.service'

// Validation schemas
const createUserSchema = z.object({
  phone_number: z.string().regex(/^\d{10}$/, 'Must be 10 digits'),
  name: z.string().min(2, 'Min 2 characters').max(100).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  ug_college: z.string().max(200).optional().or(z.literal('')),
  pg_college: z.string().max(200).optional().or(z.literal('')),
  affiliated_organisation: z.string().max(200).optional().or(z.literal('')),
  current_designation: z.string().max(200).optional().or(z.literal('')),
  skip_onboarding: z.boolean().optional(),
})

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone_number: z.string().regex(/^\d{10}$/).optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  ug_college: z.string().max(200).optional().or(z.literal('')),
  pg_college: z.string().max(200).optional().or(z.literal('')),
  affiliated_organisation: z.string().max(200).optional().or(z.literal('')),
  current_designation: z.string().max(200).optional().or(z.literal('')),
})

type CreateFormValues = z.infer<typeof createUserSchema>
type UpdateFormValues = z.infer<typeof updateUserSchema>

interface UserFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateUserData | UpdateUserData) => Promise<void>
  user?: User | null
  mode: 'create' | 'edit'
}

export function UserFormModal({ open, onClose, onSubmit, user, mode }: UserFormModalProps) {
  const schema = mode === 'create' ? createUserSchema : updateUserSchema
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateFormValues | UpdateFormValues>({
    resolver: zodResolver(schema),
  })

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && user) {
        reset({
          name: user.name || '',
          email: user.email || '',
          phone_number: user.phone_number,
          gender: user.gender || '',
          date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
          address: user.address || '',
          ug_college: user.ug_college || '',
          pg_college: user.pg_college || '',
          affiliated_organisation: user.affiliated_organisation || '',
          current_designation: user.current_designation || '',
        })
      } else {
        reset({
          phone_number: '',
          name: '',
          email: '',
          gender: '',
          date_of_birth: '',
          address: '',
          ug_college: '',
          pg_college: '',
          affiliated_organisation: '',
          current_designation: '',
          skip_onboarding: false,
        })
      }
    }
  }, [open, mode, user, reset])

  const handleFormSubmit = async (data: CreateFormValues | UpdateFormValues) => {
    try {
      // Filter out empty optional fields
      const filteredData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
      )
      await onSubmit(filteredData as CreateUserData | UpdateUserData)
      onClose()
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add New User' : 'Edit User'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new user account. Phone number is required for authentication.'
              : 'Update user profile information.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone_number">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone_number"
              placeholder="10-digit phone number"
              disabled={isSubmitting}
              {...register('phone_number')}
            />
            {errors.phone_number && (
              <p className="text-sm text-red-500">{errors.phone_number.message}</p>
            )}
          </div>

          {/* Name + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Full name"
                disabled={isSubmitting}
                {...register('name')}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                disabled={isSubmitting}
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
          </div>

          {/* Gender + DOB */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gender</Label>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value as string}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                disabled={isSubmitting}
                {...register('date_of_birth')}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Full address"
              disabled={isSubmitting}
              {...register('address')}
            />
          </div>

          {/* UG + PG College */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ug_college">UG College</Label>
              <Input
                id="ug_college"
                placeholder="Undergraduate college"
                disabled={isSubmitting}
                {...register('ug_college')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pg_college">PG College</Label>
              <Input
                id="pg_college"
                placeholder="Postgraduate college"
                disabled={isSubmitting}
                {...register('pg_college')}
              />
            </div>
          </div>

          {/* Organisation + Designation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="affiliated_organisation">Organisation</Label>
              <Input
                id="affiliated_organisation"
                placeholder="Affiliated organisation"
                disabled={isSubmitting}
                {...register('affiliated_organisation')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_designation">Designation</Label>
              <Input
                id="current_designation"
                placeholder="Current designation"
                disabled={isSubmitting}
                {...register('current_designation')}
              />
            </div>
          </div>

          {/* Skip Onboarding (Create only) */}
          {mode === 'create' && (
            <div className="flex items-center space-x-2">
              <Controller
                name="skip_onboarding"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="skip_onboarding"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                )}
              />
              <Label htmlFor="skip_onboarding" className="text-sm font-normal cursor-pointer">
                Mark onboarding as completed
              </Label>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>{mode === 'create' ? 'Create User' : 'Update User'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
