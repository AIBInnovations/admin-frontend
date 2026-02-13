import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { Users } from 'lucide-react'
import { toast } from 'sonner'
import { usersService, User } from '@/services/users.service'
import { useUsersColumns } from './UsersPage.columns'

export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  // State
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await usersService.getAll({
        page: currentPage,
        limit: 20,
        search: search || undefined,
        is_active: statusFilter === 'all' ? null : statusFilter === 'active',
      })

      if (response.success && response.data) {
        setUsers(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch (error) {
      toast.error('Failed to load users')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, statusFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // URL params sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (statusFilter !== 'all') params.status = statusFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [search, statusFilter, currentPage, setSearchParams])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  // Handlers
  const handleBlockToggle = async (user: User) => {
    try {
      if (user.is_active) {
        const response = await usersService.blockUser(user._id)
        if (response.success) {
          toast.success('User blocked successfully')
          fetchUsers()
        }
      } else {
        const response = await usersService.unblockUser(user._id)
        if (response.success) {
          toast.success('User unblocked successfully')
          fetchUsers()
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user status')
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
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder="Search by name, email, or phone..."
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

    </div>
  )
}
