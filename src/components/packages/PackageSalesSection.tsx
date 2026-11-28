import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, IndianRupee } from 'lucide-react'
import { DateRangeFilter, rangeFromParams, rangeToParams, type DateRange } from '@/components/common/DateRangeFilter'
import { ErrorState, Section, Stat } from '@/components/common/detail'
import { TrendChart } from '@/components/charts/TrendChart'
import { compactINR } from '@/components/charts/format'
import '@/components/charts/charts.css'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PersonAvatar } from '@/components/users/kit'
import { dayIST, plural, useResource } from '@/components/users/lib'
import { useAuth } from '@/contexts/AuthContext'
import { formatDuration, formatINR } from '@/lib/format'
import type { PackageTier } from '@/services/packages.service'
import { packageSalesService, type PackageBuyer, type PackageSales, type SalesFigures } from './packageSales'

const monthName = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', month: 'short', year: '2-digit' })
const dayName = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short' })
const BUYERS = 10

/** Sold per plan, revenue, trend and recent buyers of one package. */
export function PackageSalesSection({ packageId, tiers, isCombo }: { packageId: string; tiers: PackageTier[]; isCombo: boolean }) {
  const { hasPermission } = useAuth()
  // Same right the analytics pages use ('analytics.dashboard' is its older name)
  if (!hasPermission('analytics.read') && !hasPermission('analytics.dashboard')) return null
  return <Sales packageId={packageId} tiers={tiers} isCombo={isCombo} />
}

function Sales({ packageId, tiers, isCombo }: { packageId: string; tiers: PackageTier[]; isCombo: boolean }) {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canOpenPurchase = hasPermission('payments.read')
  const canOpenUser = hasPermission('users.read')
  const [params, setParams] = useSearchParams()
  const range = useMemo(() => rangeFromParams(params, 'year'), [params])
  const setRange = (r: DateRange) => setParams((prev) => rangeToParams(r, prev), { replace: true })
  const span = range.from && range.to ? { from: range.from, to: range.to } : {}

  const sales = useResource<PackageSales>(() => packageSalesService.detail(packageId, span), [packageId, range.from, range.to])
  const buyers = useResource<{ rows: PackageBuyer[]; total: number }>(() => packageSalesService.buyers(packageId, BUYERS, span), [packageId, range.from, range.to])

  const data = sales.data
  const now: SalesFigures = data?.current ?? {}
  const points = data?.trend?.points ?? []
  const monthly = data?.trend?.granularity === 'month' || data?.trend?.granularity === 'year'
  const label = (key: string) => { const d = new Date(`${key}T00:00:00Z`); return Number.isNaN(d.getTime()) ? key : monthly ? monthName.format(d) : dayName.format(d) }

  // Every current length shows, sold or not; old lengths that were sold show too
  const rows = useMemo(() => {
    const sold = data?.tiers ?? []
    const list = tiers.map((t) => {
      const hit = sold.find((s) => s.tier_duration_days === t.duration_days)
      return { key: t._id ?? t.name, title: `${formatDuration(t.duration_days)} subscription`, note: t.name, days: t.duration_days, orders: hit?.orders ?? 0, collected: hit?.collected ?? 0, net: hit?.net ?? 0, share: hit?.share ?? 0 }
    })
    for (const s of sold) {
      if (s.tier_duration_days && tiers.some((t) => t.duration_days === s.tier_duration_days)) continue
      list.push({
        key: s.key, days: s.tier_duration_days ?? 0,
        title: s.tier_duration_days ? `${formatDuration(s.tier_duration_days)} subscription` : s.tier_name || 'Length not recorded',
        note: tiers.length ? 'No longer sold' : '', orders: s.orders ?? 0, collected: s.collected ?? 0, net: s.net ?? 0, share: s.share ?? 0,
      })
    }
    return list
  }, [data, tiers])

  const analyticsHref = `/analytics?${(() => { const p = rangeToParams(range, new URLSearchParams()); p.set('package', packageId); return p.toString() })()}`
  const body = () => {
    if (sales.loading && !data) return <div className="space-y-4" role="status" aria-label="Loading sales"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div><Skeleton className="h-56 rounded-xl" /></div>
    if (!data) return <ErrorState title="Sales could not be loaded" message={sales.error ?? undefined} onRetry={() => sales.reload()} />
    return (
      <div className={sales.loading ? 'space-y-6 opacity-60 transition-opacity' : 'space-y-6 transition-opacity'} aria-busy={sales.loading}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Sold" value={(now.orders ?? 0).toLocaleString('en-IN')} hint={now.buyers !== undefined ? plural(now.buyers, 'student') : undefined} />
          <Stat label="Collected" value={formatINR(now.collected ?? 0)} hint="What students paid" />
          <Stat label="Net of GST" value={formatINR(now.net ?? 0)} hint={now.discount ? `${formatINR(now.discount)} given as coupon discount` : 'After coupons'} />
          <Stat label="All time" value={formatINR(data.periods?.all?.collected ?? 0)} hint={plural(data.periods?.all?.orders ?? 0, 'sale')} />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Per plan</h3>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead scope="col" className="pl-4">Plan</TableHead>
                  <TableHead scope="col" className="text-right">Sold</TableHead>
                  <TableHead scope="col" className="text-right">Collected</TableHead>
                  <TableHead scope="col" className="text-right">Net of GST</TableHead>
                  <TableHead scope="col" className="pr-4 text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Nothing was sold in this period.</TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.key} className="hover:bg-transparent">
                    <TableCell className="py-2.5 pl-4"><p className="text-sm font-medium">{r.title}</p>{r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{r.orders.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{formatINR(r.collected)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums text-muted-foreground">{formatINR(r.net)}</TableCell>
                    <TableCell className="pr-4 text-right text-sm tabular-nums text-muted-foreground">{Math.round(r.share)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {isCombo && <p className="mt-2 text-xs text-muted-foreground">The bundled packages a buyer gets with this combo are not counted as extra sales.</p>}
          {!isCombo && !!data.opened_by_combos && <p className="mt-2 text-xs text-muted-foreground">{plural(data.opened_by_combos, 'student')} also got this package inside a combo. Those count under the combo.</p>}
        </div>

        {points.length > 1 && points.some((p) => (p.collected ?? 0) > 0) && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Trend</h3>
            <TrendChart
              label={`Collected for this package over time, ${points.length} points`}
              ticks={points.map((p) => label(p.key))}
              labels={points.map((p) => (monthly ? label(p.key) : `${label(p.from ?? p.key)}${p.to && p.to !== p.from ? ` to ${label(p.to)}` : ''}`))}
              series={[{ key: 'collected', name: 'Collected', color: 'var(--chart-primary)', values: points.map((p) => p.collected ?? 0), kind: 'area' }]}
              format={(n) => formatINR(n)} axisFormat={compactINR} height={220}
              details={(i) => [{ name: 'Sold', value: String(points[i]?.orders ?? 0) }]}
            />
          </div>
        )}

        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold">Recent buyers</h3>
            {buyers.data && buyers.data.total > BUYERS && <span className="text-xs text-muted-foreground">Latest {BUYERS} of {buyers.data.total.toLocaleString('en-IN')}</span>}
          </div>
          {buyers.loading && !buyers.data ? <Skeleton className="h-32 rounded-lg" />
            : !buyers.data ? <ErrorState title="Buyers could not be loaded" message={buyers.error ?? undefined} onRetry={() => buyers.reload()} />
              : buyers.data.rows.length === 0 ? <p className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted-foreground">Nobody bought this package in this period.</p>
                : (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <Table className="min-w-[560px]">
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead scope="col" className="pl-4">Student</TableHead>
                          <TableHead scope="col">Plan</TableHead>
                          <TableHead scope="col" className="text-right">Paid</TableHead>
                          <TableHead scope="col">Coupon</TableHead>
                          <TableHead scope="col" className="pr-4">Bought</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {buyers.data.rows.map((b) => {
                          const href = canOpenPurchase ? `/commerce/purchases/package/${b.purchase_id}` : canOpenUser && b.user?.user_id ? `/users/${b.user.user_id}` : null
                          const name = b.user?.name || 'Deleted student'
                          return (
                            <TableRow
                              key={b.purchase_id} tabIndex={href ? 0 : undefined} aria-label={href ? `Open the purchase of ${name}` : undefined}
                              onClick={href ? (e) => { if (!(e.target as HTMLElement).closest('a')) navigate(href) } : undefined}
                              onKeyDown={href ? (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) navigate(href) } : undefined}
                              className={href ? 'cursor-pointer hover:bg-accent/50 focus-visible:bg-accent/60 focus-visible:outline-2 focus-visible:-outline-offset-2' : 'hover:bg-transparent'}
                            >
                              <TableCell className="py-2 pl-4">
                                <span className="flex items-center gap-2.5">
                                  <PersonAvatar name={b.user?.name} size="sm" />
                                  <span className="min-w-0">
                                    {canOpenUser && b.user?.user_id ? <Link to={`/users/${b.user.user_id}`} className="block max-w-[220px] truncate text-sm font-medium hover:text-primary hover:underline hover:underline-offset-4">{name}</Link> : <span className="block max-w-[220px] truncate text-sm font-medium">{name}</span>}
                                    {b.user?.student_id && <span className="block font-mono text-xs text-muted-foreground">{b.user.student_id}</span>}
                                  </span>
                                </span>
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">{b.tier_duration_days ? formatDuration(b.tier_duration_days) : b.tier_name || 'Not recorded'}</TableCell>
                              <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{formatINR(b.collected ?? 0)}</TableCell>
                              <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{b.coupon_code || 'None'}</TableCell>
                              <TableCell className="whitespace-nowrap pr-4 text-sm text-muted-foreground">{dayIST(b.purchased_at)}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
        </div>
      </div>
    )
  }

  return (
    <Section
      title={<span className="flex items-center gap-2"><IndianRupee aria-hidden="true" className="h-4 w-4 text-muted-foreground" />Sales</span>}
      action={(
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter value={range} onChange={setRange} align="end" />
          <Button asChild variant="ghost" size="sm"><Link to={analyticsHref}>Open in Analytics<ArrowUpRight aria-hidden="true" /></Link></Button>
        </div>
      )}
    >
      {body()}
    </Section>
  )
}
