import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { AdminUserFormModal } from '@/components/adminUsers/AdminUserFormModal'
import { Plus, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { adminUsersService, AdminUser, AdminUserFormData } from '@/services/adminUsers.service'
import { adminRolesService, AdminRole } from '@/services/adminRoles.service'
import { useAdminUsersColumns } from './AdminUsersPage.columns'

export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Dropdown data
  const [roles, setRoles] = useState<AdminRole[]>([])

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null)

  // Fetch roles for filter dropdown
  useEffect(() => {
    adminRolesService.getAll({ limit: 50 }).then((res) => {
      if (res.success && res.data) setRoles(res.data.entities)
    })
  }, [])

  // Fetch admin users
  const fetchAdminUsers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await adminUsersService.getAll({
        page: currentPage,
        limit: 20,
        is_active: statusFilter === 'all' ? null : statusFilter === 'active',
        role_id: roleFilter !== 'all' ? roleFilter : undefined,
      })

      if (response.success && response.data) {
        setAdminUsers(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load admin users')
      setAdminUsers([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, statusFilter, roleFilter])

  useEffect(() => { fetchAdminUsers() }, [fetchAdminUsers])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (statusFilter !== 'all') params.status = statusFilter
    if (roleFilter !== 'all') params.role = roleFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [statusFilter, roleFilter, currentPage, setSearchParams])

  useEffect(() => { setCurrentPage(1) }, [statusFilter, roleFilter])

  // Client-side filter
  const filteredAdmins = search
    ? adminUsers.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.email.toLowerCase().includes(search.toLowerCase())
      )
    : adminUsers

  // Handlers
  const handleCreate = () => {
    setModalMode('create')
    setSelectedAdmin(null)
    setFormModalOpen(true)
  }

  const handleEdit = (admin: AdminUser) => {
    setModalMode('edit')
    setSelectedAdmin(admin)
    setFormModalOpen(true)
  }

  const handleDeleteClick = (admin: AdminUser) => {
    setSelectedAdmin(admin)
    setDeleteModalOpen(true)
  }

  const handleFormSubmit = async (data: AdminUserFormData) => {
    try {
      if (modalMode === 'create') {
        const response = await adminUsersService.create(data)
        if (response.success) {
          toast.success('Admin user created successfully')
          fetchAdminUsers()
        }
      } else if (selectedAdmin) {
        const response = await adminUsersService.update(selectedAdmin._id, data)
        if (response.success) {
          toast.success('Admin user updated successfully')
          fetchAdminUsers()
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save admin user')
      throw error
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedAdmin) return
    try {
      const response = await adminUsersService.delete(selectedAdmin._id)
      if (response.success) {
        toast.success('Admin user deleted successfully')
        fetchAdminUsers()
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete admin user')
      throw error
    }
  }

  const handleToggleActive = async (admin: AdminUser) => {
    try {
      if (admin.is_active) {
        const response = await adminUsersService.deactivate(admin._id)
        if (response.success) {
          toast.success('Admin user deactivated')
          fetchAdminUsers()
        }
      } else {
        const response = await adminUsersService.activate(admin._id)
        if (response.success) {
          toast.success('Admin user activated')
          fetchAdminUsers()
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update admin status')
    }
  }

  // Filters
  const filters: FilterConfig[] = [
    {
      key: 'role',
      label: 'Role',
      type: 'select',
      options: [
        { label: 'All Roles', value: 'all' },
        ...roles.map((r) => ({ label: r.name, value: r._id })),
      ],
      placeholder: 'Filter by role',
      defaultValue: 'all',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
      placeholder: 'Filter by status',
      defaultValue: 'all',
    },
  ]

  const columns = useAdminUsersColumns({
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
    onToggleActive: handleToggleActive,
  })

  const hasFilters = statusFilter !== 'all' || roleFilter !== 'all' || search !== ''

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Users"
        description="Manage admin accounts and access"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Settings' }, { label: 'Admin Users' }]}
        action={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />Add Admin
          </Button>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search by name or email..."
        filters={filters}
        activeFilters={{ role: roleFilter, status: statusFilter }}
        onFiltersChange={(f) => {
          if (f.role !== undefined) setRoleFilter(f.role)
          if (f.status !== undefined) setStatusFilter(f.status)
        }}
      />

      <DataTable
        data={filteredAdmins}
        columns={columns}
        isLoading={loading}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: ShieldCheck,
          title: hasFilters ? 'No admin users found matching your filters' : 'No admin users yet',
          description: !hasFilters ? 'Get started by creating your first admin user' : undefined,
          action: !hasFilters ? (
            <Button onClick={handleCreate} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />Create your first admin
            </Button>
          ) : undefined,
        }}
        getRowKey={(admin) => admin._id}
      />

      <AdminUserFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        adminUser={selectedAdmin}
        mode={modalMode}
      />

      <DeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Admin User"
        itemName={selectedAdmin?.name}
      />
    </div>
  )
}
