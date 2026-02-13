import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users, IndianRupee, Video, Calendar,
  TrendingUp, ArrowUpRight, Loader2, Eye,
  type LucideIcon,
} from 'lucide-react'
import { analyticsService, DashboardAnalytics } from '@/services/analytics.service'
import { toast } from 'sonner'

interface StatCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
}

function StatCard({ title, value, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {trend && (
              <p className={`flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
                <TrendingUp className={`h-3 w-3 ${!trendUp ? 'rotate-180' : ''}`} />
                {trend}
              </p>
            )}
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true)
        const response = await analyticsService.getDashboard()
        if (response.success && response.data) {
          setAnalytics(response.data)
        }
      } catch (error) {
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Welcome back! Here's what's happening with PGME today."
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's what's happening with PGME today."
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={analytics ? analytics.users.total.toLocaleString('en-IN') : '—'}
          icon={Users}
          trend={analytics ? `${analytics.users.new_this_month} new this month` : undefined}
          trendUp={true}
        />
        <StatCard
          title="Revenue (Month)"
          value={analytics ? `₹${analytics.revenue.this_month.toLocaleString('en-IN')}` : '—'}
          icon={IndianRupee}
          trend={analytics ? `₹${analytics.revenue.total.toLocaleString('en-IN')} total` : undefined}
          trendUp={true}
        />
        <StatCard
          title="Active Users (30d)"
          value={analytics ? analytics.users.active_30_days.toLocaleString('en-IN') : '—'}
          icon={Eye}
        />
        <StatCard
          title="New Users (Month)"
          value={analytics ? analytics.users.new_this_month.toLocaleString('en-IN') : '—'}
          icon={Calendar}
        />
      </div>

      {/* Content Insights */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Popular Subjects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Popular Subjects</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/content/subjects')}>
              View All
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics?.content.popular_subjects && analytics.content.popular_subjects.length > 0 ? (
              analytics.content.popular_subjects.map((subject, i) => (
                <div key={subject.subject_id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium truncate">{subject.name}</span>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {subject.purchase_count} purchases
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No subject data available</p>
            )}
          </CardContent>
        </Card>

        {/* Most Viewed Videos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">Most Viewed Videos</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/content/videos')}>
              View All
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics?.content.most_viewed_videos && analytics.content.most_viewed_videos.length > 0 ? (
              analytics.content.most_viewed_videos.map((video, i) => (
                <div key={video.video_id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-xs font-bold text-purple-600">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium truncate">{video.title}</span>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {video.view_count.toLocaleString('en-IN')} views
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No video data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Users, label: 'View Users', path: '/users' },
              { icon: Video, label: 'Manage Videos', path: '/content/videos' },
              { icon: Calendar, label: 'Live Sessions', path: '/live-sessions' },
              { icon: IndianRupee, label: 'View Revenue', path: '/commerce/revenue' },
            ].map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => navigate(action.path)}
              >
                <action.icon className="h-5 w-5" />
                <span className="text-xs">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
