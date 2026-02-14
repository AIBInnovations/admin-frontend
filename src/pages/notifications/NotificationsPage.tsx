import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Bell, Send, Eye, AlertTriangle, Clock, Megaphone } from 'lucide-react'
import { toast } from 'sonner'
import {
  notificationsService,
  Notification,
  NotificationStats,
} from '@/services/notifications.service'
import { useNotificationsColumns } from './NotificationsPage.columns'
import { SendNotificationTab } from './SendNotificationTab'

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deliveryFilter, setDeliveryFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  // Fetch stats
  useEffect(() => {
    notificationsService.getStats().then((res) => {
      if (res.success && res.data) setStats(res.data)
    })
  }, [])

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const response = await notificationsService.getAll({
        page: currentPage,
        limit: 20,
        notification_type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        delivery_status: deliveryFilter !== 'all' ? deliveryFilter : undefined,
      })

      if (response.success && response.data) {
        setNotifications(response.data.entities || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
      }
    } catch {
      toast.error('Failed to load notifications')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, typeFilter, statusFilter, deliveryFilter])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [typeFilter, statusFilter, deliveryFilter])

  // Handlers
  const handleDeleteClick = (notif: Notification) => {
    setSelectedNotification(notif)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedNotification) return
    try {
      const response = await notificationsService.delete(selectedNotification._id)
      if (response.success) {
        toast.success('Notification deleted successfully')
        fetchNotifications()
        // Refresh stats
        notificationsService.getStats().then((res) => {
          if (res.success && res.data) setStats(res.data)
        })
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete notification')
      throw error
    }
  }

  // Filters
  const filters: FilterConfig[] = [
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { label: 'All Types', value: 'all' },
        { label: 'Push', value: 'push' },
        { label: 'In-App', value: 'in_app' },
        { label: 'Email', value: 'email' },
        { label: 'SMS', value: 'sms' },
      ],
      placeholder: 'Filter by type',
      defaultValue: 'all',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All Status', value: 'all' },
        { label: 'Pending', value: 'pending' },
        { label: 'Sent', value: 'sent' },
        { label: 'Read', value: 'read' },
        { label: 'Failed', value: 'failed' },
      ],
      placeholder: 'Filter by status',
      defaultValue: 'all',
    },
    {
      key: 'delivery',
      label: 'Delivery',
      type: 'select',
      options: [
        { label: 'All Delivery', value: 'all' },
        { label: 'Queued', value: 'queued' },
        { label: 'Sent', value: 'sent' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Failed', value: 'failed' },
      ],
      placeholder: 'Filter by delivery',
      defaultValue: 'all',
    },
  ]

  // Client-side search filter
  const filteredNotifications = search
    ? notifications.filter((n) =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.message.toLowerCase().includes(search.toLowerCase())
      )
    : notifications

  const columns = useNotificationsColumns({ onDelete: handleDeleteClick })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Send push notifications and view notification history"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Notifications' },
        ]}
      />

      <Tabs defaultValue="send" className="space-y-6">
        <TabsList>
          <TabsTrigger value="send" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Send Push
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Bell className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <SendNotificationTab />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.total?.toLocaleString('en-IN') ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">Total Notifications</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Eye className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.read?.toLocaleString('en-IN') ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">Read</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.pending?.toLocaleString('en-IN') ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.failed?.toLocaleString('en-IN') ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <SearchWithFilters
            value={search}
            onChange={setSearch}
            placeholder="Search notifications..."
            filters={filters}
            activeFilters={{ type: typeFilter, status: statusFilter, delivery: deliveryFilter }}
            onFiltersChange={(f) => {
              if (f.type !== undefined) setTypeFilter(f.type)
              if (f.status !== undefined) setStatusFilter(f.status)
              if (f.delivery !== undefined) setDeliveryFilter(f.delivery)
            }}
          />

          <DataTable
            data={filteredNotifications}
            columns={columns}
            isLoading={loading}
            pagination={{
              currentPage,
              totalPages,
              totalCount,
              onPageChange: setCurrentPage,
            }}
            emptyState={{
              icon: Bell,
              title: search || typeFilter !== 'all' || statusFilter !== 'all' || deliveryFilter !== 'all'
                ? 'No notifications found matching your filters'
                : 'No notifications yet',
              description: !search && typeFilter === 'all' && statusFilter === 'all' && deliveryFilter === 'all'
                ? 'Notifications will appear here when they are sent to users'
                : undefined,
            }}
            getRowKey={(n) => n._id}
          />

          <DeleteModal
            open={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            onConfirm={handleDeleteConfirm}
            title="Delete Notification"
            itemName={selectedNotification?.title}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
