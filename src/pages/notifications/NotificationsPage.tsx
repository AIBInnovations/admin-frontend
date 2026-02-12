import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus, Search, MoreVertical, Bell, Send, Users, UserCheck,
  Eye, Copy, Trash2, Clock, Megaphone, ShoppingBag, BookOpen,
  MessageSquare, MousePointerClick,
} from 'lucide-react'
import { mockNotifications } from '@/lib/mock-data'

const typeConfig: Record<string, { label: string; className: string; icon: typeof Bell }> = {
  promotional: { label: 'Promotional', className: 'bg-purple-500/10 text-purple-600 border-purple-200', icon: Megaphone },
  reminder: { label: 'Reminder', className: 'bg-amber-500/10 text-amber-600 border-amber-200', icon: Clock },
  transactional: { label: 'Transactional', className: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: ShoppingBag },
  engagement: { label: 'Engagement', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: UserCheck },
  content: { label: 'Content', className: 'bg-pink-500/10 text-pink-600 border-pink-200', icon: BookOpen },
}

const targetLabels: Record<string, string> = {
  all: 'All Users',
  segment: 'Segment',
  individual: 'Individual',
}

export function NotificationsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = mockNotifications.filter((n) => {
    const matchesSearch =
      !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.body.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || n.type === typeFilter
    const matchesStatus = statusFilter === 'all' || n.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  const totalSent = mockNotifications.filter((n) => n.status === 'delivered').length
  const totalDelivered = mockNotifications.reduce((s, n) => s + n.delivered_count, 0)
  const totalRead = mockNotifications.reduce((s, n) => s + n.read_count, 0)
  const totalClicks = mockNotifications.reduce((s, n) => s + n.click_count, 0)
  const avgReadRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Manage push notification campaigns and alerts"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Notifications' },
        ]}
        action={
          <Button>
            <Plus className="mr-2 h-4 w-4" />New Notification
          </Button>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSent}</p>
              <p className="text-xs text-muted-foreground">Campaigns Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDelivered.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground">Total Delivered</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgReadRate}%</p>
              <p className="text-xs text-muted-foreground">Avg Read Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <MousePointerClick className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalClicks.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground">Total Clicks</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="promotional">Promotional</SelectItem>
            <SelectItem value="reminder">Reminder</SelectItem>
            <SelectItem value="transactional">Transactional</SelectItem>
            <SelectItem value="engagement">Engagement</SelectItem>
            <SelectItem value="content">Content</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[280px]">Notification</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Delivered</TableHead>
              <TableHead>Read</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>Read Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent / Scheduled</TableHead>
              <TableHead>By</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((notif) => {
              const type = typeConfig[notif.type]
              const TypeIcon = type.icon
              const readRate = notif.delivered_count > 0
                ? Math.round((notif.read_count / notif.delivered_count) * 100)
                : 0

              return (
                <TableRow key={notif._id}>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${type.className}`}>
                        <TypeIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{notif.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[240px]">{notif.body}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${type.className} text-[10px]`}>{type.label}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="text-xs font-medium">{targetLabels[notif.target]}</span>
                      <p className="text-[10px] text-muted-foreground">{notif.target_count.toLocaleString('en-IN')} recipients</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {notif.delivered_count.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {notif.read_count.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {notif.click_count.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${readRate >= 60 ? 'bg-emerald-500' : readRate >= 30 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${readRate}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{readRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {notif.status === 'delivered' ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                        Delivered
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-[10px]">
                        <Clock className="mr-1 h-3 w-3" />Scheduled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {notif.sent_at
                      ? new Date(notif.sent_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short',
                        })
                      : (notif as { scheduled_for?: string }).scheduled_for
                        ? new Date((notif as { scheduled_for: string }).scheduled_for).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short',
                          })
                        : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {notif.created_by}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MessageSquare className="mr-2 h-4 w-4" />Resend
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {mockNotifications.length} notifications
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm">Next</Button>
        </div>
      </div>
    </div>
  )
}
