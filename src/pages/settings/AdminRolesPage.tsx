import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { AdminRoleFormModal } from '@/components/adminRoles/AdminRoleFormModal'
import { Plus, Shield, Pencil, Trash2, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { adminRolesService, AdminRole, AdminRoleFormData } from '@/services/adminRoles.service'

export function AdminRolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [loading, setLoading] = useState(true)

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null)

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true)
      const response = await adminRolesService.getAll({ limit: 50 })
      if (response.success && response.data) {
        setRoles(response.data.entities || [])
      }
    } catch (error) {
      toast.error('Failed to load roles')
      setRoles([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedRole(null)
    setFormModalOpen(true)
  }

  const handleEdit = (role: AdminRole) => {
    setModalMode('edit')
    setSelectedRole(role)
    setFormModalOpen(true)
  }

  const handleDeleteClick = (role: AdminRole) => {
    setSelectedRole(role)
    setDeleteModalOpen(true)
  }

  const handleFormSubmit = async (data: AdminRoleFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await adminRolesService.create(data)
        if (response.success) {
          toast.success('Role created successfully')
          fetchRoles()
        }
      } else if (selectedRole) {
        const response = await adminRolesService.update(selectedRole._id, data)
        if (response.success) {
          toast.success('Role updated successfully')
          fetchRoles()
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save role')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedRole) return
    try {
      const response = await adminRolesService.delete(selectedRole._id)
      if (response.success) {
        toast.success('Role deleted successfully')
        fetchRoles()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete role')
      throw error
    }
  }

  const getPermissionsList = (role: AdminRole): string[] => {
    if (Array.isArray(role.permissions)) return role.permissions as string[]
    if (typeof role.permissions === 'string') {
      try { return JSON.parse(role.permissions) } catch { return [] }
    }
    return []
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Roles"
        description="Manage roles and their permissions"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Settings' }, { label: 'Admin Roles' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Create Role
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : roles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No roles yet</p>
            <p className="text-xs text-muted-foreground mb-4">Get started by creating your first role</p>
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Create your first role
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const permissions = getPermissionsList(role)
            return (
              <Card key={role._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">{role.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(role)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteClick(role)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Permissions</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {permissions.length}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto">
                      {permissions.length > 0 ? permissions.map((perm) => (
                        <div key={perm} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span>{perm}</span>
                        </div>
                      )) : (
                        <span className="text-xs text-muted-foreground">No permissions defined</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-2">
                      Created {new Date(role.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AdminRoleFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        role={selectedRole}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Role"
        itemName={selectedRole?.name}
      />
    </div>
  )
}
