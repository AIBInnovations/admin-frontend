import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  IndianRupee,
  Video,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  icon: LucideIcon
  trend: string
  trendUp: boolean
}

function StatCard({ title, value, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
              {title}
            </p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <p
              className={`flex items-center gap-1 text-xs font-medium ${
                trendUp ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              <TrendingUp
                className={`h-3 w-3 ${!trendUp ? 'rotate-180' : ''}`}
              />
              {trend}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0000C8]/10">
            <Icon className="h-5 w-5 text-[#0000C8]" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const recentActivity = [
  {
    user: 'Raj Kumar',
    action: 'purchased',
    target: 'Anatomy Theory Package',
    time: '5m ago',
  },
  {
    user: 'Priya Sharma',
    action: 'enrolled in',
    target: 'Upper Limb Live Session',
    time: '12m ago',
  },
  {
    user: 'Dr. Anita Desai',
    action: 'uploaded',
    target: 'Thorax Revision Video',
    time: '1h ago',
  },
  {
    user: 'Amit Patel',
    action: 'completed',
    target: 'Lower Limb Module 3',
    time: '2h ago',
  },
  {
    user: 'Neha Singh',
    action: 'registered',
    target: 'New account',
    time: '3h ago',
  },
]

const upcomingSessions = [
  {
    title: 'Upper Limb Anatomy - Muscles',
    faculty: 'Dr. Priya Sharma',
    time: 'Today at 4:00 PM',
    enrolled: 85,
    capacity: 100,
    status: 'upcoming' as const,
  },
  {
    title: 'Thorax - Complete Revision',
    faculty: 'Dr. Rajesh Kumar',
    time: 'Today at 6:00 PM',
    enrolled: 42,
    capacity: 50,
    status: 'upcoming' as const,
  },
  {
    title: 'Abdomen - Live Discussion',
    faculty: 'Dr. Anita Desai',
    time: 'Tomorrow at 10:00 AM',
    enrolled: 28,
    capacity: 100,
    status: 'scheduled' as const,
  },
]

export function DashboardPage() {
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
          value="1,234"
          icon={Users}
          trend="+12.5% from last month"
          trendUp={true}
        />
        <StatCard
          title="Revenue (Month)"
          value="₹2,45,670"
          icon={IndianRupee}
          trend="+8.2% from last month"
          trendUp={true}
        />
        <StatCard
          title="Active Videos"
          value="342"
          icon={Video}
          trend="+24 this week"
          trendUp={true}
        />
        <StatCard
          title="Upcoming Sessions"
          value="15"
          icon={Calendar}
          trend="3 today"
          trendUp={true}
        />
      </div>

      {/* Activity + Sessions */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs">
              View All
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-xs font-semibold">
                  {item.user
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{item.user}</span>{' '}
                    <span className="text-[hsl(var(--muted-foreground))]">
                      {item.action}
                    </span>{' '}
                    <span className="font-medium">{item.target}</span>
                  </p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {item.time}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-semibold">
              Upcoming Live Sessions
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs">
              View All
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingSessions.map((session, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-4 rounded-lg border border-[hsl(var(--border))] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{session.title}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {session.faculty}
                  </p>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                    {session.time}
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))]">
                    <div
                      className="h-full rounded-full bg-[#0000C8]"
                      style={{
                        width: `${(session.enrolled / session.capacity) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                    {session.enrolled}/{session.capacity} enrolled
                  </p>
                </div>
                <Badge
                  variant={session.status === 'upcoming' ? 'default' : 'secondary'}
                  className="shrink-0 text-[10px]"
                >
                  {session.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Users, label: 'Add User' },
              { icon: Video, label: 'Upload Video' },
              { icon: Calendar, label: 'Create Session' },
              { icon: IndianRupee, label: 'View Revenue' },
            ].map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-20 flex-col gap-2"
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
