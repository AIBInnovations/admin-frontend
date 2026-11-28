import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, type FilterConfig } from '@/components/common/SearchBar'
import { Button } from '@/components/ui/button'
import { ConfirmDock, StaleNotice, personName } from '@/components/users/kit'
import { ensureOk, errText, unwrap, usePageInRange, useResource, useUrlSearch, useUrlState } from '@/components/users/lib'
import { useAuth } from '@/contexts/AuthContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usersService, type User } from '@/services/users.service'
import type { ListResponse } from '@/types/api.types'
import { useUsersColumns } from './UsersPage.columns'

const FILTERS: FilterConfig[] = [
  {
    key: 'status', label: 'Status', type: 'select', placeholder: 'Filter by status', defaultValue: 'all',
    options: [{ label: 'All statuses', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Blocked', value: 'blocked' }],
  },
  {
    key: 'email_excluded', label: 'Email', type: 'select', placeholder: 'Filter by email', defaultValue: 'all',
    options: [{ label: 'All email settings', value: 'all' }, { label: 'Excluded from emails', value: 'excluded' }, { label: 'Receiving emails', value: 'included' }],
  },
]

export function UsersPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('users.create')
  const canUpdate = hasPermission('users.update')
  const { state, set, clear, page, setPage } = useUrlState({ search: '', status: 'all', email_excluded: 'all' })
  const [search, setSearch] = useUrlSearch(state.search, (v) => set({ search: v }))
  const [blockTarget, setBlockTarget] = useState<User | null>(null)
  // The full hint is cut off on a phone; a short one fits there
  const phone = useMediaQuery('(max-width: 639px)')

  const { data, loading, error, reload } = useResource<ListResponse<User>>(async () => unwrap(await usersService.getAll({
    page, limit: 20,
    search: state.search || undefined,
    is_active: state.status === 'all' ? null : state.status === 'active',
    email_excluded: state.email_excluded === 'all' ? null : state.email_excluded === 'excluded',
  }), 'Failed to load users'), [page, state.search, state.status, state.email_excluded])

  const totalPages = data?.pagination?.totalPages || 1
  usePageInRange(page, data ? totalPages : undefined, loading, setPage)
  const hasFilters = !!state.search || state.status !== 'all' || state.email_excluded !== 'all'

  const block = async (user: User) => {
    ensureOk(await usersService.blockUser(user._id), 'Failed to block user')
    toast.success('User blocked successfully')
    await reload({ silent: true })
  }
  const unblock = async (user: User) => {
    try {
      ensureOk(await usersService.unblockUser(user._id), 'Failed to unblock user')
      toast.success('User unblocked successfully')
      await reload({ silent: true })
    } catch (err) {
      toast.error(errText(err, 'Failed to update user status'))
    }
  }

  const columns = useUsersColumns({
    onNavigate: (user) => navigate(`/users/${user._id}`),
    onEdit: canUpdate ? (user) => navigate(`/users/${user._id}/edit`) : undefined,
    onBlockToggle: canUpdate ? (user) => (user.is_active ? setBlockTarget(user) : unblock(user)) : undefined,
  })

  return (
    <div className="relative space-y-6">
      <PageHeader
        title="Users"
        description="View and manage registered users"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Users' }]}
        action={canCreate ? <Button asChild><Link to="/users/new"><Plus aria-hidden="true" />Add User</Link></Button> : undefined}
      />

      <SearchWithFilters
        value={search}
        onChange={setSearch}
        placeholder={phone ? 'Search name, phone, email or ID' : 'Search by name, email, phone, or student ID...'}
        filters={FILTERS}
        activeFilters={{ status: state.status, email_excluded: state.email_excluded }}
        onFiltersChange={(f) => set({ status: f.status ?? state.status, email_excluded: f.email_excluded ?? state.email_excluded })}
      />

      {error && data && <StaleNotice message={error} onRetry={() => reload()} />}

      <DataTable
        data={data?.entities || []}
        columns={columns}
        isLoading={loading}
        error={error}
        onRetry={() => reload()}
        onRowClick={(user) => navigate(`/users/${user._id}`)}
        pagination={{ currentPage: page, totalPages, totalCount: data?.pagination?.total || 0, onPageChange: setPage }}
        emptyState={{
          icon: Users,
          title: hasFilters ? 'No users found matching your filters' : 'No users yet',
          description: hasFilters ? undefined : 'Students appear here after they sign up in the app.',
          action: hasFilters ? <Button variant="outline" size="sm" onClick={() => { setSearch(''); clear() }}>Clear filters</Button> : undefined,
        }}
        getRowKey={(user) => user._id}
      />

      <ConfirmDock
        open={!!blockTarget} onClose={() => setBlockTarget(null)} onConfirm={() => block(blockTarget!)}
        title={`Block ${personName(blockTarget)}?`}
        description="They are signed out of every device and cannot sign in until you unblock them. Their purchases are kept."
        confirmLabel="Block user" workingLabel="Blocking…"
      />
    </div>
  )
}
