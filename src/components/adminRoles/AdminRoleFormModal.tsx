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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { AdminRole, AdminRoleFormData } from '@/services/adminRoles.service'

const AVAILABLE_PERMISSIONS = [
  { group: 'Users', permissions: ['users.read', 'users.update'] },
  { group: 'Content', permissions: ['subjects.read', 'subjects.create', 'subjects.update', 'subjects.delete'] },
  { group: 'Packages', permissions: ['packages.read', 'packages.create', 'packages.update', 'packages.delete'] },
  { group: 'Videos', permissions: ['videos.read', 'videos.create', 'videos.update', 'videos.delete'] },
  { group: 'Documents', permissions: ['documents.read', 'documents.create', 'documents.update', 'documents.delete'] },
  { group: 'Faculty', permissions: ['faculty.read', 'faculty.create', 'faculty.update', 'faculty.delete'] },
  { group: 'Sessions', permissions: ['live_sessions.read', 'live_sessions.create', 'live_sessions.update', 'live_sessions.delete'] },
  { group: 'Commerce', permissions: ['payments.read', 'books.read', 'books.create', 'books.update', 'books.delete'] },
  { group: 'Admin', permissions: ['admin_users.read', 'admin_users.create', 'admin_users.update', 'admin_users.delete', 'admin_roles.read', 'admin_roles.create', 'admin_roles.update', 'admin_roles.delete'] },
  { group: 'Analytics', permissions: ['analytics.read'] },
]

const roleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
})

type RoleFormValues = z.infer<typeof roleSchema>

interface AdminRoleFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: AdminRoleFormData) => Promise<void>
  role?: AdminRole | null
  mode: 'create' | 'edit'
}

export function AdminRoleFormModal({ open, onClose, onSubmit, role, mode }: AdminRoleFormModalProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '' },
  })

  // Reset form
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && role) {
        reset({ name: role.name })
        const perms = Array.isArray(role.permissions) ? role.permissions : []
        setSelectedPermissions(perms as string[])
      } else {
        reset({ name: '' })
        setSelectedPermissions([])
      }
    }
  }, [open, mode, role, reset])

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    )
  }

  const toggleGroup = (permissions: string[]) => {
    const allSelected = permissions.every((p) => selectedPermissions.includes(p))
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !permissions.includes(p)))
    } else {
      setSelectedPermissions((prev) => [...new Set([...prev, ...permissions])])
    }
  }

  const handleFormSubmit = async (data: RoleFormValues) => {
    if (selectedPermissions.length === 0) return

    try {
      const formData: AdminRoleFormData = {
        name: data.name,
        permissions: selectedPermissions,
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Role' : 'Edit Role'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Define a new admin role with permissions.' : 'Update role permissions below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Role Name <span className="text-red-500">*</span></Label>
            <Input id="name" placeholder="e.g., Content Manager" disabled={isSubmitting} {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Permissions */}
          <div className="space-y-2">
            <Label>Permissions <span className="text-red-500">*</span></Label>
            {selectedPermissions.length === 0 && (
              <p className="text-sm text-red-500">At least one permission is required</p>
            )}
            <div className="space-y-3 rounded-lg border p-4 max-h-[400px] overflow-y-auto">
              {AVAILABLE_PERMISSIONS.map(({ group, permissions }) => {
                const allSelected = permissions.every((p) => selectedPermissions.includes(p))
                const someSelected = permissions.some((p) => selectedPermissions.includes(p))
                return (
                  <div key={group} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => toggleGroup(permissions)}
                        disabled={isSubmitting}
                        className={someSelected && !allSelected ? 'opacity-50' : ''}
                      />
                      <span className="text-sm font-medium">{group}</span>
                    </div>
                    <div className="ml-6 grid grid-cols-2 gap-1">
                      {permissions.map((perm) => (
                        <div key={perm} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedPermissions.includes(perm)}
                            onCheckedChange={() => togglePermission(perm)}
                            disabled={isSubmitting}
                          />
                          <span className="text-xs text-muted-foreground">{perm}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || selectedPermissions.length === 0}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mode === 'create' ? 'Creating...' : 'Updating...'}</>
              ) : (
                <>{mode === 'create' ? 'Create Role' : 'Update Role'}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
