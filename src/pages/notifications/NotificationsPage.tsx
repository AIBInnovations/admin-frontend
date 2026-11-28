import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Bell, CalendarClock, Mail, Megaphone, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { Stat } from '@/components/common/detail'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, type FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StaleNotice } from '@/components/users/kit'
import { ensureOk, errText, unwrap, usePageInRange, useResource, useUrlSearch, useUrlState } from '@/components/users/lib'
import { useAuth } from '@/contexts/AuthContext'
import { notificationsService, type Notification, type NotificationStats } from '@/services/notifications.service'
import type { ListResponse } from '@/types/api.types'
import { useNotificationsColumns } from './NotificationsPage.columns'
import { ScheduledNotificationsTab } from './ScheduledNotificationsTab'
import { SendEmailTab } from './SendEmailTab'
import { SendNotificationTab } from './SendNotificationTab'
import { SendSmsTab } from './SendSmsTab'

const TABS = ['send', 'email', 'sms', 'scheduled', 'history'] as const
type Tab = (typeof TABS)[number]
const COMPOSE: Tab[] = ['send', 'email', 'sms']

const FILTERS: FilterConfig[] = [
  { key: 'type', label: 'Type', type: 'select', placeholder: 'Filter by type', defaultValue: 'all', options: [{ label: 'All Types', value: 'all' }, { label: 'Push', value: 'push' }, { label: 'In-App', value: 'in_app' }, { label: 'Email', value: 'email' }, { label: 'SMS', value: 'sms' }] },
  { key: 'status', label: 'Status', type: 'select', placeholder: 'Filter by status', defaultValue: 'all', options: [{ label: 'All Status', value: 'all' }, { label: 'Pending', value: 'pending' }, { label: 'Sent', value: 'sent' }, { label: 'Read', value: 'read' }, { label: 'Failed', value: 'failed' }] },
  { key: 'delivery', label: 'Delivery', type: 'select', placeholder: 'Filter by delivery', defaultValue: 'all', options: [{ label: 'All Delivery', value: 'all' }, { label: 'Queued', value: 'queued' }, { label: 'Sent', value: 'sent' }, { label: 'Delivered', value: 'delivered' }, { label: 'Failed', value: 'failed' }] },
]

export function NotificationsPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canSend = hasPermission('notifications.create')
  const [params] = useSearchParams()
  const wanted = params.get('tab') as Tab | null
  const tab: Tab = wanted && TABS.includes(wanted) && (canSend || !COMPOSE.includes(wanted)) ? wanted : canSend ? 'send' : 'history'
  const editId = params.get('edit')
  // A scheduled message being edited stays with its tab until it is saved or stopped
  const [editing, setEditing] = useState<Partial<Record<Tab, string>>>({})
  useEffect(() => {
    if (editId && /^[0-9a-f]{24}$/i.test(editId) && COMPOSE.includes(tab)) setEditing((prev) => (prev[tab] === editId ? prev : { ...prev, [tab]: editId }))
  }, [editId, tab])

  // Each tab keeps its own URL state; switching starts clean. Drafts stay because the composers stay mounted.
  const hrefOf = (next: string, edit?: string) => {
    const q = new URLSearchParams()
    if (next !== 'send' || edit) q.set('tab', next)
    if (edit) q.set('edit', edit)
    const text = q.toString()
    return `/notifications${text ? `?${text}` : ''}`
  }
  const openTab = (next: string) => navigate(hrefOf(next, editing[next as Tab]), { replace: true })
  const leaveEdit = (from: Tab, to: Tab) => {
    setEditing((prev) => ({ ...prev, [from]: undefined }))
    navigate(hrefOf(to), { replace: true })
  }
  const composer = (t: Tab) => ({ editId: editing[t] ?? null, onStopEdit: () => leaveEdit(t, t), onSent: (scheduled: boolean) => leaveEdit(t, scheduled ? 'scheduled' : 'history') })

  return (
    <div className="relative space-y-6">
      <PageHeader title="Notifications" description="Send push notifications, emails, SMS, and view notification history" breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Notifications' }]} />

      <Tabs value={tab} onValueChange={openTab} className="space-y-6">
        <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 sm:mx-0 sm:px-0">
          <TabsList>
            {canSend && <TabsTrigger value="send" className="gap-2"><Megaphone aria-hidden="true" className="h-4 w-4" />Send Push</TabsTrigger>}
            {canSend && <TabsTrigger value="email" className="gap-2"><Mail aria-hidden="true" className="h-4 w-4" />Send Email</TabsTrigger>}
            {canSend && <TabsTrigger value="sms" className="gap-2"><MessageSquare aria-hidden="true" className="h-4 w-4" />Send SMS</TabsTrigger>}
            <TabsTrigger value="scheduled" className="gap-2"><CalendarClock aria-hidden="true" className="h-4 w-4" />Scheduled</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><Bell aria-hidden="true" className="h-4 w-4" />History</TabsTrigger>
          </TabsList>
        </div>
        {canSend && (
          <>
            <TabsContent value="send" forceMount className="data-[state=inactive]:hidden"><SendNotificationTab {...composer('send')} /></TabsContent>
            <TabsContent value="email" forceMount className="data-[state=inactive]:hidden"><SendEmailTab {...composer('email')} /></TabsContent>
            <TabsContent value="sms" forceMount className="data-[state=inactive]:hidden"><SendSmsTab {...composer('sms')} /></TabsContent>
          </>
        )}
        <TabsContent value="scheduled"><ScheduledNotificationsTab /></TabsContent>
        <TabsContent value="history"><HistoryTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function HistoryTab() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canDelete = hasPermission('notifications.delete')
  const { state, set, page, setPage } = useUrlState({ search: '', type: 'all', status: 'all', delivery: 'all' })
  const [search, setSearch] = useUrlSearch(state.search, (v) => set({ search: v }))
  const stats = useResource<NotificationStats>(async () => unwrap(await notificationsService.getStats()), [])
  const { data, loading, error, reload } = useResource<ListResponse<Notification>>(async () => unwrap(await notificationsService.getAll({
    page, limit: 20,
    search: state.search || undefined,
    notification_type: state.type !== 'all' ? state.type : undefined,
    status: state.status !== 'all' ? state.status : undefined,
    delivery_status: state.delivery !== 'all' ? state.delivery : undefined,
  }), 'Failed to load notifications'), [page, state.search, state.type, state.status, state.delivery])
  const totalPages = data?.pagination?.totalPages || 1
  usePageInRange(page, data ? totalPages : undefined, loading, setPage)
  const [deleting, setDeleting] = useState<Notification | null>(null)

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      ensureOk(await notificationsService.delete(deleting._id), 'Failed to delete notification')
      toast.success('Notification deleted successfully')
      await reload({ silent: true })
      void stats.reload({ silent: true })
    } catch (err) {
      toast.error(errText(err, 'Failed to delete notification'))
      throw err
    }
  }

  const view = (n: Notification) => navigate(`/notifications/${n._id}`)
  const columns = useNotificationsColumns({ onView: view, onDelete: canDelete ? setDeleting : undefined })
  const hasFilters = !!state.search || state.type !== 'all' || state.status !== 'all' || state.delivery !== 'all'
  const figure = (n?: number) => (stats.data ? (n ?? 0).toLocaleString('en-IN') : stats.error ? 'Not available' : '')
  const s = stats.data

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Total Notifications" value={figure(s?.total)} loading={stats.loading && !s} />
        <Stat label="Read" value={figure(s?.read)} loading={stats.loading && !s} />
        <Stat label="Pending" value={figure(s?.pending)} loading={stats.loading && !s} />
        <Stat label="Failed" value={figure(s?.failed)} loading={stats.loading && !s} />
      </div>
      <SearchWithFilters
        value={search} onChange={setSearch} placeholder="Search notifications..." filters={FILTERS}
        activeFilters={{ type: state.type, status: state.status, delivery: state.delivery }}
        onFiltersChange={(f) => set({ type: f.type ?? state.type, status: f.status ?? state.status, delivery: f.delivery ?? state.delivery })}
      />
      {error && data && <StaleNotice message={error} onRetry={() => reload()} />}
      <DataTable
        data={data?.entities || []}
        columns={columns}
        isLoading={loading}
        error={error}
        onRetry={() => reload()}
        onRowClick={view}
        pagination={{ currentPage: page, totalPages, totalCount: data?.pagination?.total || 0, onPageChange: setPage }}
        emptyState={{
          icon: Bell,
          title: hasFilters ? 'No notifications found matching your filters' : 'No notifications yet',
          description: hasFilters ? undefined : 'Notifications will appear here when they are sent to users',
          action: hasFilters ? <Button variant="outline" size="sm" onClick={() => { setSearch(''); set({ search: '', type: 'all', status: 'all', delivery: 'all' }) }}>Clear filters</Button> : undefined,
        }}
        getRowKey={(n) => n._id}
      />
      <DeleteModal open={!!deleting} onClose={() => setDeleting(null)} onConfirm={confirmDelete} title="Delete Notification" itemName={deleting?.title} />
    </div>
  )
}
