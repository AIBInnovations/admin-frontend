import { useState } from 'react'
import { Plus, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, type FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { AdminUserFormModal } from '@/components/adminUsers/AdminUserFormModal'
import { ResetAdminPasswordModal } from '@/components/adminUsers/ResetAdminPasswordModal'
import { Button } from '@/components/ui/button'
import { ConfirmDock, StaleNotice } from '@/components/users/kit'
import { ensureOk, errText, unwrap, usePageInRange, useResource, useUrlSearch, useUrlState } from '@/components/users/lib'
import { useAuth } from '@/contexts/AuthContext'
import { adminRolesService, type AdminRole } from '@/services/adminRoles.service'
import { adminUsersService, type AdminUser } from '@/services/adminUsers.service'
import type { ListResponse } from '@/types/api.types'
import { useAdminUsersColumns } from './AdminUsersPage.columns'

export function AdminUsersPage() {
  const { user: me, hasPermission } = useAuth()
  const canCreate = hasPermission('admin_users.create')
  const canUpdate = hasPermission('admin_users.update')
  const canDelete = hasPermission('admin_users.delete')
  // The API lets only a super admin reset another admin's password
  const canReset = hasPermission('*')
  const isSelf = (admin: AdminUser | null) => !!admin && !!me && (admin._id === me.admin_id || admin.email === me.email)

  const { state, set, clear, page, setPage } = useUrlState({ search: '', status: 'all', role: 'all' })
  const [search, setSearch] = useUrlSearch(state.search, (v) => set({ search: v }))
  const roles = useResource<AdminRole[]>(async () => unwrap(await adminRolesService.getAll({ limit: 50 })).entities, [])

  const { data, loading, error, reload } = useResource<ListResponse<AdminUser>>(async () => unwrap(await adminUsersService.getAll({
    page, limit: 20,
    search: state.search || undefined,
    is_active: state.status === 'all' ? null : state.status === 'active',
    role_id: state.role !== 'all' ? state.role : undefined,
  }), 'Failed to load admin users'), [page, state.search, state.status, state.role])
  const totalPages = data?.pagination?.totalPages || 1
  usePageInRange(page, data ? totalPages : undefined, loading, setPage)

  const [form, setForm] = useState<{ open: boolean; mode: 'create' | 'edit'; admin: AdminUser | null }>({ open: false, mode: 'create', admin: null })
  const [deleting, setDeleting] = useState<AdminUser | null>(null)
  const [resetting, setResetting] = useState<AdminUser | null>(null)
  const [deactivating, setDeactivating] = useState<AdminUser | null>(null)

  const openCreate = () => setForm({ open: true, mode: 'create', admin: null })
  const openEdit = (admin: AdminUser) => setForm({ open: true, mode: 'edit', admin })

  const deactivate = async (admin: AdminUser) => {
    ensureOk(await adminUsersService.deactivate(admin._id), 'Failed to deactivate admin user')
    toast.success('Admin user deactivated')
    await reload({ silent: true })
  }
  const activate = async (admin: AdminUser) => {
    try {
      ensureOk(await adminUsersService.activate(admin._id), 'Failed to activate admin user')
      toast.success('Admin user activated')
      await reload({ silent: true })
    } catch (err) {
      toast.error(errText(err, 'Failed to activate admin user'))
    }
  }
  const confirmDelete = async () => {
    if (!deleting) return
    try {
      ensureOk(await adminUsersService.delete(deleting._id), 'Failed to delete admin user')
      toast.success('Admin user deleted successfully')
      await reload({ silent: true })
    } catch (err) {
      toast.error(errText(err, 'Failed to delete admin user'))
      throw err
    }
  }

  const filters: FilterConfig[] = [
    { key: 'role', label: 'Role', type: 'select', placeholder: 'Filter by role', defaultValue: 'all', options: [{ label: 'All Roles', value: 'all' }, ...(roles.data || []).map((r) => ({ label: r.name, value: r._id }))] },
    { key: 'status', label: 'Status', type: 'select', placeholder: 'Filter by status', defaultValue: 'all', options: [{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }] },
  ]
  const hasFilters = !!state.search || state.status !== 'all' || state.role !== 'all'

  const columns = useAdminUsersColumns({
    isSelf,
    onEdit: canUpdate ? openEdit : undefined,
    onDelete: canDelete ? setDeleting : undefined,
    onToggleActive: canUpdate ? (admin) => (admin.is_active ? setDeactivating(admin) : activate(admin)) : undefined,
    onResetPassword: canReset ? setResetting : undefined,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Users"
        description="Manage admin accounts and access"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Settings' }, { label: 'Admin Users' }]}
        action={canCreate ? <Button onClick={openCreate}><Plus aria-hidden="true" />Add Admin</Button> : undefined}
      />
      <SearchWithFilters
        value={search} onChange={setSearch} placeholder="Search by name or email..." filters={filters}
        activeFilters={{ role: state.role, status: state.status }}
        onFiltersChange={(f) => set({ role: f.role ?? state.role, status: f.status ?? state.status })}
      />
      {error && data && <StaleNotice message={error} onRetry={() => reload()} />}
      <DataTable
        data={data?.entities || []}
        columns={columns}
        isLoading={loading}
        error={error}
        onRetry={() => reload()}
        onRowClick={canUpdate ? openEdit : undefined}
        pagination={{ currentPage: page, totalPages, totalCount: data?.pagination?.total || 0, onPageChange: setPage }}
        emptyState={{
          icon: ShieldCheck,
          title: hasFilters ? 'No admin users found matching your filters' : 'No admin users yet',
          description: hasFilters ? undefined : 'Get started by creating your first admin user',
          action: hasFilters
            ? <Button variant="outline" size="sm" onClick={() => { setSearch(''); clear() }}>Clear filters</Button>
            : canCreate ? <Button onClick={openCreate} variant="outline" size="sm"><Plus aria-hidden="true" />Create your first admin</Button> : undefined,
        }}
        getRowKey={(admin) => admin._id}
      />

      <AdminUserFormModal open={form.open} onClose={() => setForm((f) => ({ ...f, open: false }))} onSaved={() => reload({ silent: true })} adminUser={form.admin} mode={form.mode} isSelf={isSelf(form.admin)} />
      <ResetAdminPasswordModal
        open={!!resetting} onClose={() => setResetting(null)} adminUser={resetting}
        onConfirm={async (password) => {
          ensureOk(await adminUsersService.resetPassword(resetting!._id, password), 'Failed to reset password')
          toast.success(`Password reset for ${resetting!.name}`)
        }}
      />
      <ConfirmDock
        open={!!deactivating} onClose={() => setDeactivating(null)} onConfirm={() => deactivate(deactivating!)}
        title={`Deactivate ${deactivating?.name ?? 'this admin'}?`} description="They can no longer use the panel, starting with their next action. You can activate them again."
        confirmLabel="Deactivate" workingLabel="Deactivating…"
      />
      <DeleteModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={confirmDelete} title="Delete Admin User" itemName={deleting?.name} />
    </div>
  )
}
