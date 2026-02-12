import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp, IndianRupee, Package, BookOpen, Video,
} from 'lucide-react'
import { mockPurchases, mockInvoices } from '@/lib/mock-data'

export function RevenuePage() {
  // Calculate revenue from completed purchases
  const completedPurchases = mockPurchases.filter((p) => p.payment_status === 'completed')
  const purchaseRevenue = completedPurchases.reduce((sum, p) => sum + p.amount_paid, 0)

  // Calculate GST from paid invoices
  const paidInvoices = mockInvoices.filter((inv) => inv.payment_status === 'paid')
  const gstRevenue = paidInvoices.reduce((sum, inv) => sum + inv.gst_amount, 0)

  // Total revenue
  const totalRevenue = purchaseRevenue + gstRevenue

  // Revenue by category from invoices
  const packageRevenue = paidInvoices
    .filter((inv) => inv.purchase_type === 'package')
    .reduce((sum, inv) => sum + inv.amount + inv.gst_amount, 0)
  const bookRevenue = paidInvoices
    .filter((inv) => inv.purchase_type === 'book')
    .reduce((sum, inv) => sum + inv.amount + inv.gst_amount, 0)
  const sessionRevenue = paidInvoices
    .filter((inv) => inv.purchase_type === 'session')
    .reduce((sum, inv) => sum + inv.amount + inv.gst_amount, 0)

  // Recent transactions: completed purchases sorted by date desc
  const recentTransactions = [...completedPurchases]
    .sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime())

  // Revenue breakdown percentages
  const categoryTotal = packageRevenue + bookRevenue + sessionRevenue
  const packagePct = categoryTotal > 0 ? Math.round((packageRevenue / categoryTotal) * 100) : 0
  const bookPct = categoryTotal > 0 ? Math.round((bookRevenue / categoryTotal) * 100) : 0
  const sessionPct = categoryTotal > 0 ? Math.round((sessionRevenue / categoryTotal) * 100) : 0

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
                <p className="text-3xl font-bold">{`₹${totalRevenue.toLocaleString('en-IN')}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <TrendingUp className="h-3 w-3" />
              <span>Includes GST collections</span>
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
                <p className="text-3xl font-bold">{`₹${packageRevenue.toLocaleString('en-IN')}`}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {packagePct}% of total category revenue
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
                <p className="text-3xl font-bold">{`₹${bookRevenue.toLocaleString('en-IN')}`}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {bookPct}% of total category revenue
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
                <p className="text-3xl font-bold">{`₹${sessionRevenue.toLocaleString('en-IN')}`}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {sessionPct}% of total category revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown Section */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Package Sales Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Gross Amount</span>
                <span className="text-sm font-medium">
                  {`₹${paidInvoices.filter((i) => i.purchase_type === 'package').reduce((s, i) => s + i.amount, 0).toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">GST Collected</span>
                <span className="text-sm font-medium">
                  {`₹${paidInvoices.filter((i) => i.purchase_type === 'package').reduce((s, i) => s + i.gst_amount, 0).toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-lg font-bold text-blue-600">
                  {`₹${packageRevenue.toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${packagePct}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Book Sales Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Gross Amount</span>
                <span className="text-sm font-medium">
                  {`₹${paidInvoices.filter((i) => i.purchase_type === 'book').reduce((s, i) => s + i.amount, 0).toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">GST Collected</span>
                <span className="text-sm font-medium">
                  {`₹${paidInvoices.filter((i) => i.purchase_type === 'book').reduce((s, i) => s + i.gst_amount, 0).toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-lg font-bold text-purple-600">
                  {`₹${bookRevenue.toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-purple-500" style={{ width: `${bookPct}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Session Sales Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Gross Amount</span>
                <span className="text-sm font-medium">
                  {`₹${paidInvoices.filter((i) => i.purchase_type === 'session').reduce((s, i) => s + i.amount, 0).toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">GST Collected</span>
                <span className="text-sm font-medium">
                  {`₹${paidInvoices.filter((i) => i.purchase_type === 'session').reduce((s, i) => s + i.gst_amount, 0).toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-lg font-bold text-emerald-600">
                  {`₹${sessionRevenue.toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${sessionPct}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-b-lg border-t border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((txn) => (
                  <TableRow key={txn._id}>
                    <TableCell className="text-sm font-medium">{txn.user_name}</TableCell>
                    <TableCell className="text-sm">{txn.package_name}</TableCell>
                    <TableCell className="text-sm font-bold">
                      {`₹${txn.amount_paid.toLocaleString('en-IN')}`}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20">
                        Completed
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(txn.purchased_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
