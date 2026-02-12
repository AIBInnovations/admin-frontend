import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Users, TrendingUp, Eye, Clock, Smartphone, Monitor, Tablet,
  BarChart3, Video, BookOpen, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { mockAnalytics, mockUsers, mockVideos, mockPackages } from '@/lib/mock-data'

const deviceIcons: Record<string, typeof Smartphone> = {
  Android: Smartphone,
  iOS: Tablet,
  Web: Monitor,
}

export function AnalyticsPage() {
  const { engagementMetrics, userGrowth, revenueByMonth, topVideos, topPackages, deviceBreakdown, subjectPopularity } = mockAnalytics

  const totalUsers = mockUsers.length
  const totalVideos = mockVideos.length
  const totalViews = mockVideos.reduce((s, v) => s + v.view_count, 0)
  const totalEnrolled = mockPackages.reduce((s, p) => s + p.enrolled_count, 0)

  // Growth calculations
  const lastMonthUsers = userGrowth[userGrowth.length - 2]?.users || 0
  const currentMonthUsers = userGrowth[userGrowth.length - 1]?.users || 0
  const userGrowthPct = lastMonthUsers > 0 ? Math.round(((currentMonthUsers - lastMonthUsers) / lastMonthUsers) * 100) : 0

  const lastMonthRevenue = revenueByMonth[revenueByMonth.length - 2]?.revenue || 0
  const currentMonthRevenue = revenueByMonth[revenueByMonth.length - 1]?.revenue || 0
  const revenueGrowthPct = lastMonthRevenue > 0 ? Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Platform performance, user engagement, and content metrics"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Analytics' },
        ]}
      />

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0000C8]/10">
                <Users className="h-5 w-5 text-[#0000C8]" />
              </div>
              <div className={`flex items-center gap-0.5 text-xs font-medium ${userGrowthPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {userGrowthPct >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(userGrowthPct)}%
              </div>
            </div>
            <p className="text-2xl font-bold">{currentMonthUsers.toLocaleString('en-IN')}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div className={`flex items-center gap-0.5 text-xs font-medium ${revenueGrowthPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {revenueGrowthPct >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(revenueGrowthPct)}%
              </div>
            </div>
            <p className="text-2xl font-bold">{`₹${currentMonthRevenue.toLocaleString('en-IN')}`}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Revenue (This Month)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{engagementMetrics.daily_active_users}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Daily Active Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{engagementMetrics.avg_session_duration_minutes}m</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Avg Session Duration</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-6">
        {/* User Growth Chart (bar representation) */}
        <Card className="col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-40">
              {userGrowth.map((item) => {
                const maxUsers = Math.max(...userGrowth.map((u) => u.users))
                const heightPct = (item.users / maxUsers) * 100
                return (
                  <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-medium">{item.users}</span>
                    <div className="w-full rounded-t-md bg-[#0000C8]/80 transition-all" style={{ height: `${heightPct}%` }} />
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {item.month.split(' ')[0].slice(0, 3)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Engagement Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">DAU</span>
                <span className="text-sm font-semibold">{engagementMetrics.daily_active_users}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">WAU</span>
                <span className="text-sm font-semibold">{engagementMetrics.weekly_active_users}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">MAU</span>
                <span className="text-sm font-semibold">{engagementMetrics.monthly_active_users.toLocaleString('en-IN')}</span>
              </div>
              <div className="border-t border-[hsl(var(--border))] pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--muted-foreground))]">Avg Videos / User</span>
                  <span className="text-sm font-semibold">{engagementMetrics.avg_videos_watched_per_user}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[hsl(var(--muted-foreground))]">Completion Rate</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${engagementMetrics.completion_rate}%` }} />
                  </div>
                  <span className="text-sm font-semibold">{engagementMetrics.completion_rate}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-6">
        {/* Revenue by Month */}
        <Card className="col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-40">
              {revenueByMonth.map((item) => {
                const maxRevenue = Math.max(...revenueByMonth.map((r) => r.revenue))
                const heightPct = (item.revenue / maxRevenue) * 100
                return (
                  <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-medium">{`₹${(item.revenue / 1000).toFixed(0)}k`}</span>
                    <div className="w-full rounded-t-md bg-emerald-500/80 transition-all" style={{ height: `${heightPct}%` }} />
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {item.month.split(' ')[0].slice(0, 3)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Device Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deviceBreakdown.map((item) => {
                const DeviceIcon = deviceIcons[item.device] || Monitor
                return (
                  <div key={item.device} className="flex items-center gap-3">
                    <DeviceIcon className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item.device}</span>
                        <span className="text-sm font-semibold">{item.percentage}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                        <div
                          className={`h-full rounded-full ${item.device === 'Android' ? 'bg-emerald-500' : item.device === 'iOS' ? 'bg-blue-500' : 'bg-purple-500'}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top Packages */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Top Packages by Enrollment</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Enrollments</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topPackages.map((pkg, i) => (
                  <TableRow key={pkg.name}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0000C8]/10 text-[10px] font-bold text-[#0000C8]">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium">{pkg.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">{pkg.enrollments}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {`₹${pkg.revenue.toLocaleString('en-IN')}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Subject Popularity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Subject Popularity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subjectPopularity.map((item) => (
                <div key={item.subject}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{item.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">{item.students} students</span>
                      <span className="text-sm font-semibold">{item.percentage}%</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                    <div className="h-full rounded-full bg-[#0000C8]" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Videos */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Top Performing Videos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Video</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Watch Time</TableHead>
                <TableHead>Avg Watch Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topVideos.map((video, i) => (
                <TableRow key={video.title}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/10 text-[10px] font-bold text-purple-600">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium">{video.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                      <span className="text-sm">{video.views.toLocaleString('en-IN')}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{video.watch_time_hours.toLocaleString('en-IN')}h</TableCell>
                  <TableCell className="text-sm">
                    {video.views > 0 ? `${Math.round((video.watch_time_hours / video.views) * 60)}m` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
