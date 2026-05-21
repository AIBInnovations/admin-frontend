import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Users, TrendingUp, Eye, ArrowUpRight, Loader2, Clock,
} from 'lucide-react'
import { analyticsService, DashboardAnalytics, AnalyticsRange } from '@/services/analytics.service'
import { toast } from 'sonner'

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  week: 'Past week',
  month: 'Past month',
  year: 'Past year',
  all: 'All time',
}

// Format watch-time seconds into a compact human string.
function formatWatch(seconds: number): string {
  if (!seconds || seconds < 1) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  // Default to all-time so the page shows backfilled history immediately; narrower ranges
  // (week/month/year) are event-derived and only have data after the new backend is live.
  const [range, setRange] = useState<AnalyticsRange>('all')

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true)
        const response = await analyticsService.getDashboard(range)
        if (response.success && response.data) {
          setAnalytics(response.data)
        }
      } catch (error) {
        toast.error('Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [range])

  if (loading && !analytics) {
    return (
      <div>
        <PageHeader
          title="Analytics"
          description="Platform performance, user engagement, and content metrics"
          breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Analytics' }]}
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div>
        <PageHeader
          title="Analytics"
          description="Platform performance, user engagement, and content metrics"
          breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Analytics' }]}
        />
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">No analytics data available.</p>
        </div>
      </div>
    )
  }

  const { users, revenue, content, events } = analytics

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Platform performance, user engagement, and content metrics"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Analytics' }]}
      />

      {/* Date-range selector — drives Events + Most Viewed Videos */}
      <div className="mb-6 flex items-center justify-end gap-3">
        <span className="text-sm text-muted-foreground">Events &amp; most-viewed for:</span>
        <Select value={range} onValueChange={(v) => setRange(v as AnalyticsRange)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Past week</SelectItem>
            <SelectItem value="month">Past month</SelectItem>
            <SelectItem value="year">Past year</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{users.total.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{`₹${revenue.this_month.toLocaleString('en-IN')}`}</p>
            <p className="text-xs text-muted-foreground">Revenue (This Month)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{users.active_30_days.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground">Active Users (30 days)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <ArrowUpRight className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{users.new_this_month.toLocaleString('en-IN')}</p>
            <p className="text-xs text-muted-foreground">New Users (This Month)</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Overview + Events */}
      <div className="mb-8 grid grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Revenue</span>
                <span className="text-sm font-semibold">{`₹${revenue.total.toLocaleString('en-IN')}`}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">This Month</span>
                <span className="text-sm font-semibold">{`₹${revenue.this_month.toLocaleString('en-IN')}`}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Events ({RANGE_LABELS[range]})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {events.by_range.length > 0 ? (
                events.by_range.map((event) => (
                  <div key={event.event_type} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground capitalize">
                      {event.event_type.replace(/_/g, ' ')}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">{event.count.toLocaleString('en-IN')}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No events recorded</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tables */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Popular Subjects</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Purchases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.popular_subjects.length > 0 ? (
                  content.popular_subjects.map((subject, i) => (
                    <TableRow key={subject.subject_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium">{subject.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">{subject.purchase_count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Most Viewed Videos ({RANGE_LABELS[range]})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Video</TableHead>
                  <TableHead className="text-right">Plays</TableHead>
                  <TableHead className="text-right">Unique</TableHead>
                  <TableHead className="text-right">Avg watch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content.most_viewed_videos.length > 0 ? (
                  content.most_viewed_videos.map((video, i) => (
                    <TableRow key={video.video_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/10 text-[10px] font-bold text-purple-600">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium">{video.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{video.view_count.toLocaleString('en-IN')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{video.unique_viewer_count.toLocaleString('en-IN')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{formatWatch(video.avg_watch_seconds)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
