import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  TrendingUp, IndianRupee, Package, BookOpen, Video, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  revenueService, RevenueByType, RevenueTrendsData, TopSellingData,
} from '@/services/revenue.service'

export function RevenuePage() {
  const [loading, setLoading] = useState(true)
  const [revenueByType, setRevenueByType] = useState<RevenueByType | null>(null)
  const [trends, setTrends] = useState<RevenueTrendsData | null>(null)
  const [topSelling, setTopSelling] = useState<TopSellingData | null>(null)
  const [trendPeriod, setTrendPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly')

  // Fetch all revenue data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [revenueRes, trendsRes, topSellingRes] = await Promise.all([
          revenueService.getByProductType(),
          revenueService.getTrends({ period: trendPeriod }),
          revenueService.getTopSelling({ limit: 5 }),
        ])

        if (revenueRes.success && revenueRes.data) setRevenueByType(revenueRes.data)
        if (trendsRes.success && trendsRes.data) setTrends(trendsRes.data)
        if (topSellingRes.success && topSellingRes.data) setTopSelling(topSellingRes.data)
      } catch (error) {
        toast.error('Failed to load revenue data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [trendPeriod])

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Revenue"
          description="Financial overview and revenue analytics"
          breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Commerce' },
            { label: 'Revenue' },
          ]}
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  const rev = revenueByType?.revenue_by_product_type
  const totalRevenue = revenueByType?.total_revenue || 0
  const packageRevenue = rev?.packages?.revenue || 0
  const bookRevenue = rev?.books?.revenue || 0
  const sessionRevenue = rev?.sessions?.revenue || 0
  const packagePct = rev?.packages?.percentage || '0'
  const bookPct = rev?.books?.percentage || '0'
  const sessionPct = rev?.sessions?.percentage || '0'

  return (
    <div>
      <PageHeader
        title="Revenue"
        description="Financial overview and revenue analytics"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Commerce' },
          { label: 'Revenue' },
        ]}
      />

      {/* Big Stats Row */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <IndianRupee className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-3xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>{revenueByType?.total_transactions || 0} transactions</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Package Revenue</p>
                <p className="text-3xl font-bold">₹{packageRevenue.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {packagePct}% of total &middot; {rev?.packages?.count || 0} sales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Book Revenue</p>
                <p className="text-3xl font-bold">₹{bookRevenue.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {bookPct}% of total &middot; {rev?.books?.count || 0} sales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <Video className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Session Revenue</p>
                <p className="text-3xl font-bold">₹{sessionRevenue.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {sessionPct}% of total &middot; {rev?.sessions?.count || 0} sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Revenue Trends</CardTitle>
          <Select value={trendPeriod} onValueChange={(v) => setTrendPeriod(v as typeof trendPeriod)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {trends?.trends && trends.trends.length > 0 ? (
            <div className="space-y-3">
              {trends.trends.map((trend, i) => {
                const label = typeof trend.period === 'string'
                  ? trend.period
                  : `W${trend.period.week}, ${trend.period.year}`
                const maxRevenue = Math.max(...trends.trends.map((t) => t.total_revenue), 1)
                const barWidth = Math.max((trend.total_revenue / maxRevenue) * 100, 2)
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0 truncate">{label}</span>
                    <div className="flex-1 h-6 bg-muted rounded overflow-hidden relative">
                      <div
                        className="h-full bg-primary/20 rounded"
                        style={{ width: `${barWidth}%` }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium">
                        ₹{trend.total_revenue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No trend data available</p>
          )}
        </CardContent>
      </Card>

      {/* Top Selling Products */}
      <div className="grid grid-cols-3 gap-4">
        {/* Top Packages */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" /> Top Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSelling?.top_selling_products?.packages?.length ? (
              <div className="space-y-3">
                {topSelling.top_selling_products.packages.map((p, i) => (
                  <div key={p._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="secondary" className="text-[10px] shrink-0">#{i + 1}</Badge>
                      <span className="text-sm truncate">{p.name || '—'}</span>
                    </div>
                    <span className="text-sm font-medium shrink-0 ml-2">
                      ₹{p.total_revenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Top Books */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-purple-600" /> Top Books
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSelling?.top_selling_products?.books?.length ? (
              <div className="space-y-3">
                {topSelling.top_selling_products.books.map((b, i) => (
                  <div key={b._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="secondary" className="text-[10px] shrink-0">#{i + 1}</Badge>
                      <span className="text-sm truncate">{b.title || '—'}</span>
                    </div>
                    <span className="text-sm font-medium shrink-0 ml-2">
                      ₹{b.total_revenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Top Sessions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Video className="h-4 w-4 text-emerald-600" /> Top Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSelling?.top_selling_products?.sessions?.length ? (
              <div className="space-y-3">
                {topSelling.top_selling_products.sessions.map((s, i) => (
                  <div key={s._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="secondary" className="text-[10px] shrink-0">#{i + 1}</Badge>
                      <span className="text-sm truncate">{s.name || '—'}</span>
                    </div>
                    <span className="text-sm font-medium shrink-0 ml-2">
                      ₹{s.total_revenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
