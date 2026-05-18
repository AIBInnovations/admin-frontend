import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable, ColumnDef } from '@/components/common/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { MailX, Mail, UserCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { usersService, type User } from '@/services/users.service'

type ReasonFilter = 'all' | 'user_unsubscribed' | 'admin_excluded'

export function ExcludedUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>(
    (searchParams.get('reason') as ReasonFilter) || 'all'
  )
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [reincludingId, setReincludingId] = useState<string | null>(null)

  const { nextFetchId, isStale } = useLatestFetch()

  const fetchUsers = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await usersService.getExcludedUsers({
        page: currentPage,
        limit: 20,
        reason: reasonFilter === 'all' ? undefined : reasonFilter,
      })
      if (isStale(fetchId)) return

      if (response.success && response.data) {
        setUsers(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      } else {
        toast.error(response.message || 'Failed to load excluded users')
      }
    } catch (error: any) {
      if (isStale(fetchId)) return
      toast.error(error.message || 'Failed to load excluded users')
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, reasonFilter, nextFetchId, isStale])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  useEffect(() => {
    const params: Record<string, string> = {}
    if (reasonFilter !== 'all') params.reason = reasonFilter
    if (currentPage > 1) params.page = currentPage.toString()
    setSearchParams(params)
  }, [reasonFilter, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [reasonFilter])

  const handleReinclude = async (user: User) => {
    setReincludingId(user._id)
    try {
      const res = await usersService.includeInEmails(user._id)
      if (res.success) {
        toast.success(`${user.name || user.phone_number} re-included in emails`)
        fetchUsers()
      } else {
        toast.error(res.message || 'Failed to re-include user')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to re-include user')
    } finally {
      setReincludingId(null)
    }
  }

  const formatDate = (date?: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  const columns: ColumnDef<User>[] = [
    {
      id: 'user',
      header: 'User',
      cell: (user) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted overflow-hidden shrink-0">
            {user.photo_url ? (
              <img src={user.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserCircle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.name || '—'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email || user.phone_number}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'phone',
      header: 'Phone',
      width: 'w-32',
      cell: (user) => <span className="text-sm">{user.phone_number}</span>,
    },
    {
      id: 'reason',
      header: 'Reason',
      width: 'w-44',
      cell: (user) => {
        const r = user.email_excluded_reason
        if (r === 'user_unsubscribed') {
          return (
            <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-200">
              Self-unsubscribed
            </Badge>
          )
        }
        if (r === 'admin_excluded') {
          return (
            <Badge className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-200">
              <MailX className="mr-0.5 h-2.5 w-2.5" />
              Excluded by admin
            </Badge>
          )
        }
        return <span className="text-xs text-muted-foreground">—</span>
      },
    },
    {
      id: 'excluded_at',
      header: 'Excluded At',
      width: 'w-32',
      cell: (user) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(user.email_excluded_at)}
        </span>
      ),
    },
    {
      id: 'excluded_by',
      header: 'By',
      width: 'w-32',
      cell: (user) => {
        if (user.email_excluded_reason === 'user_unsubscribed') {
          return <span className="text-xs text-muted-foreground italic">user</span>
        }
        const by = user.email_excluded_by
        if (by && typeof by === 'object') {
          return <span className="text-xs text-muted-foreground truncate">{by.name || by.email || by._id}</span>
        }
        return <span className="text-xs text-muted-foreground">—</span>
      },
    },
    {
      id: 'actions',
      header: '',
      width: 'w-40',
      cell: (user) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReinclude(user)}
            disabled={reincludingId === user._id}
          >
            {reincludingId === user._id ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mail className="mr-1.5 h-3.5 w-3.5" />
            )}
            Re-include
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Excluded Users"
        description="Users who have unsubscribed from marketing emails (self or admin-excluded). Transactional emails (OTP, receipts) still reach them."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Users', href: '/users' },
          { label: 'Email Excluded' },
        ]}
      />

      <div className="flex items-center gap-3">
        <Label htmlFor="reason-filter" className="text-sm text-muted-foreground">Reason</Label>
        <Select value={reasonFilter} onValueChange={(v) => setReasonFilter(v as ReasonFilter)}>
          <SelectTrigger id="reason-filter" className="h-9 w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({totalCount})</SelectItem>
            <SelectItem value="user_unsubscribed">Self-unsubscribed</SelectItem>
            <SelectItem value="admin_excluded">Excluded by admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
          icon: MailX,
          title: reasonFilter !== 'all'
            ? 'No users excluded for this reason'
            : 'No users excluded from emails',
        }}
        getRowKey={(user) => user._id}
      />
    </div>
  )
}
