import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Mail, MailX } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusPill } from '@/components/common/detail'
import { DataTable, type ColumnDef } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PersonAvatar, StaleNotice, personName } from '@/components/users/kit'
import { StudentLink } from '@/components/students/StudentLink'
import { dayIST, ensureOk, errText, unwrap, usePageInRange, useResource, useUrlState } from '@/components/users/lib'
import { useAuth } from '@/contexts/AuthContext'
import { usersService, type User } from '@/services/users.service'
import type { ListResponse } from '@/types/api.types'

type ReasonFilter = 'all' | 'user_unsubscribed' | 'admin_excluded'

export function ExcludedUsersPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('users.update')
  const { state, set, clear, page, setPage } = useUrlState({ reason: 'all' })
  const reason = (['user_unsubscribed', 'admin_excluded'].includes(state.reason) ? state.reason : 'all') as ReasonFilter
  const [reincludingId, setReincludingId] = useState<string | null>(null)

  const { data, loading, error, reload } = useResource<ListResponse<User>>(async () => unwrap(await usersService.getExcludedUsers({
    page, limit: 20, reason: reason === 'all' ? undefined : reason,
  }), 'Failed to load excluded users'), [page, reason])

  const totalPages = data?.pagination?.totalPages || 1
  const total = data?.pagination?.total || 0
  usePageInRange(page, data ? totalPages : undefined, loading, setPage)

  const reinclude = async (user: User) => {
    if (reincludingId) return
    setReincludingId(user._id)
    try {
      ensureOk(await usersService.includeInEmails(user._id), 'Failed to re-include user')
      toast.success(`${personName(user)} re-included in emails`)
      await reload({ silent: true })
    } catch (err) {
      toast.error(errText(err, 'Failed to re-include user'))
    } finally {
      setReincludingId(null)
    }
  }

  const columns: ColumnDef<User>[] = [
    {
      id: 'user', header: 'User',
      cell: (user) => (
        <div className="flex min-w-[220px] items-center gap-3">
          <PersonAvatar name={user.name} photo={user.photo_url} />
          <div className="min-w-0 max-w-[280px]">
            <p className="truncate text-sm"><StudentLink student={user} fallback="Unnamed User" from="Excluded users" className="text-foreground hover:text-primary" /></p>
            <p className="truncate text-xs text-muted-foreground">{user.email || user.phone_number}</p>
          </div>
        </div>
      ),
    },
    { id: 'phone', header: 'Phone', width: 'w-32', cell: (user) => <span className="font-mono text-[13px]">{user.phone_number}</span> },
    {
      id: 'reason', header: 'Reason', width: 'w-44',
      cell: (user) => user.email_excluded_reason === 'user_unsubscribed'
        ? <StatusPill tone="info">Self-unsubscribed</StatusPill>
        : user.email_excluded_reason === 'admin_excluded'
          ? <StatusPill tone="warning">Excluded by admin</StatusPill>
          : <span className="text-xs text-muted-foreground">Not recorded</span>,
    },
    { id: 'excluded_at', header: 'Excluded At', width: 'w-32', cell: (user) => <span className="whitespace-nowrap text-xs text-muted-foreground">{user.email_excluded_at ? dayIST(user.email_excluded_at) : 'Not recorded'}</span> },
    {
      id: 'excluded_by', header: 'By', width: 'w-32',
      cell: (user) => {
        if (user.email_excluded_reason === 'user_unsubscribed') return <span className="text-xs text-muted-foreground">The user</span>
        const by = user.email_excluded_by
        return <span className="block max-w-[180px] truncate text-xs text-muted-foreground">{by && typeof by === 'object' ? by.name || by.email || 'Deleted admin' : 'Not recorded'}</span>
      },
    },
    ...(canUpdate ? [{
      id: 'actions', header: '', width: 'w-40',
      cell: (user: User) => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" className="bg-card" onClick={() => reinclude(user)} disabled={reincludingId === user._id} aria-label={`Re-include ${personName(user)} in emails`}>
            {reincludingId === user._id ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Mail aria-hidden="true" />}
            Re-include
          </Button>
        </div>
      ),
    }] : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Excluded Users"
        description="Users who have unsubscribed from marketing emails (self or admin-excluded). Transactional emails (OTP, receipts) still reach them."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Users', href: '/users' }, { label: 'Email Excluded' }]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="reason-filter" className="text-sm text-muted-foreground">Reason</Label>
        <Select value={reason} onValueChange={(v) => set({ reason: v })}>
          <SelectTrigger id="reason-filter" className="h-9 w-[220px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All{reason === 'all' && data ? ` (${total.toLocaleString('en-IN')})` : ''}</SelectItem>
            <SelectItem value="user_unsubscribed">Self-unsubscribed</SelectItem>
            <SelectItem value="admin_excluded">Excluded by admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && data && <StaleNotice message={error} onRetry={() => reload()} />}

      <DataTable
        data={data?.entities || []}
        columns={columns}
        isLoading={loading}
        error={error}
        onRetry={() => reload()}
        onRowClick={(user) => navigate(`/users/${user._id}`)}
        pagination={{ currentPage: page, totalPages, totalCount: total, onPageChange: setPage }}
        emptyState={{
          icon: MailX,
          title: reason !== 'all' ? 'No users excluded for this reason' : 'No users excluded from emails',
          action: reason !== 'all' ? <Button variant="outline" size="sm" onClick={clear}>Clear filters</Button> : undefined,
        }}
        getRowKey={(user) => user._id}
      />
    </div>
  )
}
