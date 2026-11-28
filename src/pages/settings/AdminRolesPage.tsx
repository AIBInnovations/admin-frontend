import { useState } from 'react'
import { Pencil, Plus, Shield, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState, StatusPill } from '@/components/common/detail'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { AdminRoleFormModal } from '@/components/adminRoles/AdminRoleFormModal'
import { ALL_PERMISSIONS, areaLine, describeRole, grantedCount, permissionList, unknownPermissions } from '@/components/adminRoles/permissions'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StaleNotice } from '@/components/users/kit'
import { dayIST, ensureOk, errText, unwrap, useResource } from '@/components/users/lib'
import { useAuth } from '@/contexts/AuthContext'
import { adminRolesService, type AdminRole } from '@/services/adminRoles.service'
import type { DeleteImpactResponse } from '@/types/api.types'

export function AdminRolesPage() {
  const { user: me, hasPermission } = useAuth()
  const canCreate = hasPermission('admin_roles.create')
  const canUpdate = hasPermission('admin_roles.update')
  const canDelete = hasPermission('admin_roles.delete')
  const { data: roles, loading, error, status, reload } = useResource<AdminRole[]>(async () => unwrap(await adminRolesService.getAll({ limit: 50 }), 'Failed to load roles').entities || [], [])

  const [form, setForm] = useState<{ open: boolean; mode: 'create' | 'edit'; role: AdminRole | null }>({ open: false, mode: 'create', role: null })
  const [deleting, setDeleting] = useState<AdminRole | null>(null)
  const [impact, setImpact] = useState<DeleteImpactResponse | null>(null)
  const [impactLoading, setImpactLoading] = useState(false)

  const openCreate = () => setForm({ open: true, mode: 'create', role: null })
  const openDelete = async (role: AdminRole) => {
    setDeleting(role)
    setImpact(null)
    setImpactLoading(true)
    try { setImpact(unwrap(await adminRolesService.getDeleteImpact(role._id))) } catch (err) { toast.error(errText(err, 'Failed to check delete impact')) } finally { setImpactLoading(false) }
  }
  const confirmDelete = async () => {
    if (!deleting) return
    try {
      ensureOk(await adminRolesService.delete(deleting._id), 'Failed to delete role')
      toast.success('Role deleted successfully')
      await reload({ silent: true })
    } catch (err) {
      toast.error(errText(err, 'Failed to delete role'))
      throw err
    }
  }

  return (
    <div className="relative space-y-6">
      <PageHeader
        title="Admin Roles"
        description="Manage roles and their permissions"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Settings' }, { label: 'Admin Roles' }]}
        action={canCreate ? <Button onClick={openCreate}><Plus aria-hidden="true" />Create Role</Button> : undefined}
      />

      {error && roles && <StaleNotice message={error} onRetry={() => reload()} />}

      {loading && !roles ? (
        <div role="status" aria-label="Loading roles" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-xl" />)}</div>
      ) : !roles ? (
        <ErrorState title={status === 403 ? 'You do not have access to roles' : 'The roles could not be loaded'} message={error ?? undefined} onRetry={status === 403 ? undefined : () => reload()} />
      ) : roles.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-6 py-14 text-center shadow-card">
          <Shield aria-hidden="true" className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No roles yet</p>
          <p className="text-sm text-muted-foreground">Get started by creating your first role</p>
          {canCreate && <Button onClick={openCreate} variant="outline" size="sm" className="mt-1"><Plus aria-hidden="true" />Create your first role</Button>}
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const raw = permissionList(role.permissions)
            const full = raw.includes('*')
            const areas = describeRole(raw)
            const unknown = unknownPermissions(raw).length
            const own = me?.role_name === role.name
            return (
              <li key={role._id} className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <Shield aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <h2 className="break-words text-[15px] font-semibold leading-snug">{role.name}</h2>
                      {own && <p className="text-xs text-muted-foreground">Your role</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {canUpdate && <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${role.name}`} onClick={() => setForm({ open: true, mode: 'edit', role })}><Pencil className="h-4 w-4" /></Button>}
                    {canDelete && <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:bg-danger-soft hover:text-danger disabled:opacity-40" aria-label={`Delete ${role.name}`} disabled={own} title={own ? 'You cannot delete your own role' : undefined} onClick={() => openDelete(role)}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 text-[13px]">
                  <span className="text-muted-foreground">Permissions</span>
                  {full ? <StatusPill tone="info">Full access</StatusPill> : <span className="font-medium tabular-nums">{grantedCount(raw)} of {ALL_PERMISSIONS.length}</span>}
                </div>
                <div className="mt-2 max-h-[150px] flex-1 space-y-1 overflow-y-auto text-[13px]" tabIndex={areas.length > 4 ? 0 : undefined} role={areas.length > 4 ? 'region' : undefined} aria-label={areas.length > 4 ? `Permissions of ${role.name}` : undefined}>
                  {full ? <p className="text-muted-foreground">Everything in the panel.</p>
                    : areas.length === 0 ? <p className="text-muted-foreground">No permissions defined</p>
                      : areas.map((a) => (
                        <p key={a.group}><span className="font-medium">{a.group}</span> <span className="text-muted-foreground">{areaLine(raw, a.group)}</span></p>
                      ))}
                  {unknown > 0 && <p className="text-xs text-muted-foreground">{unknown} older {unknown === 1 ? 'permission' : 'permissions'} no page uses</p>}
                </div>
                <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">Created {dayIST(role.createdAt)}</p>
              </li>
            )
          })}
        </ul>
      )}

      <AdminRoleFormModal open={form.open} onClose={() => setForm((f) => ({ ...f, open: false }))} onSaved={() => reload({ silent: true })} role={form.role} mode={form.mode} isOwnRole={!!form.role && me?.role_name === form.role.name} />

      <DeleteModal
        open={!!deleting} onClose={() => { setDeleting(null); setImpact(null) }} onConfirm={confirmDelete} title="Delete Role" itemName={deleting?.name}
        isLoadingImpact={impactLoading} blocked={impact?.blocked}
        warning={impact?.dependencies?.length ? {
          message: impact.blocked ? 'Cannot delete. Remove the following dependencies first:' : 'The following associated data will be affected:',
          details: impact.dependencies.map((d) => ({ label: d.label, count: d.count, blocking: d.blocking })),
        } : undefined}
      />
    </div>
  )
}
