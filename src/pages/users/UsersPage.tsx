import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useServerSearch } from '@/hooks/useServerSearch'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { Button } from '@/components/ui/button'
import { Users, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { usersService, User, CreateUserData } from '@/services/users.service'
import { useUsersColumns } from './UsersPage.columns'
import { UserFormModal } from '@/components/users/UserFormModal'

export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // State
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { inputValue: search, setInputValue: setSearch, debouncedSearch } = useServerSearch(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { nextFetchId, isStale } = useLatestFetch()

  // Fetch users with server-side search
  const fetchUsers = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await usersService.getAll({
        page: currentPage,
        limit: 20,
        search: debouncedSearch || undefined,
        is_active: statusFilter === 'all' ? null : statusFilter === 'active',
      })
      if (isStale(fetchId)) return

      if (response.success && response.data) {
        setUsers(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load users')
      }
    } catch (error: any) {
      if (isStale(fetchId)) return
      toast.error(error.message || 'Failed to load users')
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, statusFilter, debouncedSearch, nextFetchId, isStale])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (statusFilter !== 'all') params.status = statusFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [search, statusFilter, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [debouncedSearch, statusFilter])

  // Handlers
  const handleBlockToggle = async (user: User) => {
    try {
      if (user.is_active) {
        const response = await usersService.blockUser(user._id)
        if (response.success) {
          toast.success('User blocked successfully')
          fetchUsers()
        } else {
          toast.error(response.message || 'Failed to block user')
        }
      } else {
        const response = await usersService.unblockUser(user._id)
        if (response.success) {
          toast.success('User unblocked successfully')
          fetchUsers()
        } else {
          toast.error(response.message || 'Failed to unblock user')
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user status')
    }
  }

  const handleCreateUser = async (data: CreateUserData) => {
    try {
      const response = await usersService.createUser(data)
      if (response.success) {
        toast.success('User created successfully')
        fetchUsers()
      } else {
        toast.error(response.message || 'Failed to create user')
        throw new Error(response.message || 'Failed to create user')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user')
      throw error
    }
  }

  // Filters
  const filters: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Blocked', value: 'blocked' },
      ],
      placeholder: 'Filter by status',
      defaultValue: 'all',
    },
  ]

  const columns = useUsersColumns({
    onNavigate: (user) => navigate(`/users/${user._id}`),
    onBlockToggle: handleBlockToggle,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="View and manage registered users"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Users' }]}
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        }
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search by name, email, phone, or student ID..."
        filters={filters}
        activeFilters={{ status: statusFilter }}
        onFiltersChange={(f) => {
          if (f.status !== undefined) setStatusFilter(f.status)
        }}
      />

      <DataTable
        data={users}
        columns={columns}
        isLoading={loading}
        onRowClick={(user) => navigate(`/users/${user._id}`)}
        pagination={{
          currentPage,
          totalPages,
          totalCount,
          onPageChange: setCurrentPage,
        }}
        emptyState={{
          icon: Users,
          title: search || statusFilter !== 'all'
            ? 'No users found matching your filters'
            : 'No users yet',
        }}
        getRowKey={(user) => user._id}
      />

      {/* Create User Modal */}
      <UserFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateUser}
        mode="create"
      />
    </div>
  )
}
