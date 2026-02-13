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
import { Loader2 } from 'lucide-react'
import { AdminUser, AdminUserFormData } from '@/services/adminUsers.service'
import { AdminRole, adminRolesService } from '@/services/adminRoles.service'

const adminUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\d{10}$/, 'Must be 10 digits').optional().or(z.literal('')),
  password: z.string().min(8, 'Minimum 8 characters').optional().or(z.literal('')),
  role_id: z.string().min(1, 'Role is required'),
})

type AdminUserFormValues = z.infer<typeof adminUserSchema>

interface AdminUserFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: AdminUserFormData) => Promise<void>
  adminUser?: AdminUser | null
  mode: 'create' | 'edit'
}

export function AdminUserFormModal({ open, onClose, onSubmit, adminUser, mode }: AdminUserFormModalProps) {
  const [roles, setRoles] = useState<AdminRole[]>([])

  const {
    register, handleSubmit, control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AdminUserFormValues>({
    resolver: zodResolver(adminUserSchema),
    defaultValues: {
      name: '', email: '', phone: '', password: '', role_id: '',
    },
  })

  // Fetch roles for dropdown
  useEffect(() => {
    if (open) {
      adminRolesService.getAll({ limit: 50 }).then((res) => {
        if (res.success && res.data) setRoles(res.data.entities)
      })
    }
  }, [open])

  // Reset form
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && adminUser) {
        reset({
          name: adminUser.name,
          email: adminUser.email,
          phone: adminUser.phone || '',
          password: '',
          role_id: typeof adminUser.role_id === 'object' ? adminUser.role_id._id : adminUser.role_id,
        })
      } else {
        reset({
          name: '', email: '', phone: '', password: '', role_id: '',
        })
      }
    }
  }, [open, mode, adminUser, reset])

  const handleFormSubmit = async (data: AdminUserFormValues) => {
    try {
      const formData: AdminUserFormData = {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        password: data.password || undefined,
        role_id: data.role_id,
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Admin User' : 'Edit Admin User'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Create a new admin user account.' : 'Update admin user details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input id="name" placeholder="Full name" disabled={isSubmitting} {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
            <Input id="email" type="email" placeholder="admin@example.com" disabled={isSubmitting} {...register('email')} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>

          {/* Phone + Role */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="10-digit number" disabled={isSubmitting} {...register('phone')} />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Role <span className="text-red-500">*</span></Label>
              <Controller
                name="role_id" control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role_id && <p className="text-sm text-red-500">{errors.role_id.message}</p>}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Password {mode === 'create' && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="password" type="password"
              placeholder={mode === 'edit' ? 'Leave blank to keep current' : 'Minimum 8 characters'}
              disabled={isSubmitting}
              {...register('password')}
            />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            {mode === 'edit' && (
              <p className="text-xs text-muted-foreground">Leave empty to keep the current password</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Add Admin' : 'Update Admin'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
