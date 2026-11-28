import { useSearchParams } from 'react-router-dom'
import { DateRangeFilter, rangeFromParams, rangeLabel, rangeToParams } from '@/components/common/DateRangeFilter'
import { ErrorState, Section, Stat } from '@/components/common/detail'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTableView, Legend } from '@/components/charts/ChartCard'
import { TYPE_COLOR } from '@/components/charts/palette'
import { TrendChart } from '@/components/charts/TrendChart'
import { formatCount, formatDayTime, formatINR } from '@/lib/format'
import { plural } from './bookDisplay'
import { useBookSales } from './useBookSales'

const monthName = (key: string, long = false) => new Intl.DateTimeFormat('en-IN', { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit', timeZone: 'UTC' }).format(new Date(`${key}-01T00:00:00Z`))

/** Copies sold and money for a range, month by month. The range lives in the URL. */
export function BookSalesPanel({ bookId }: { bookId: string }) {
  const [params, setParams] = useSearchParams()
  const range = rangeFromParams(params, 'fy')
  const { sales, loading, error, reload } = useBookSales(bookId, range.from, range.to)

  if (!sales) {
    if (error) return <ErrorState title="Sales could not be loaded" message={error} onRetry={reload} />
    return <div role="status" aria-label="Loading" className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div><Skeleton className="h-72 rounded-xl" /></div>
  }

  const { ebook, paperback, total, trend, money_visible: money } = sales
  const any = trend.some((t) => t.sold > 0)
  const legend = [
    { key: 'ebook', name: 'E-book', color: TYPE_COLOR.ebook },
    { key: 'paperback', name: 'Paperback', color: TYPE_COLOR.book },
  ]

  return (
    <div className="space-y-6" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangeFilter value={range} onChange={(next) => setParams((prev) => rangeToParams(next, prev), { replace: true })} />
        <p className="text-[13px] text-muted-foreground" aria-live="polite">
          {loading ? 'Updating…' : error ? <>Showing earlier figures. {error} <button type="button" className="font-medium text-primary hover:underline" onClick={reload}>Try again</button></> : sales.last_sale_at ? `Last sale ${formatDayTime(sales.last_sale_at)}` : 'No sales yet in this period'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Copies sold" value={formatCount(total.sold)} hint={range.preset === 'all' ? 'All time' : rangeLabel(range)} />
        <Stat label="E-books sold" value={formatCount(ebook.sold)} hint={money ? `${formatINR(ebook.collected)} collected` : undefined} />
        <Stat label="Paperbacks sold" value={formatCount(paperback.sold)} hint={`${plural(paperback.orders, 'order')}${money ? `, ${formatINR(paperback.collected)}` : ''}`} />
        {money
          ? <Stat label="Collected" value={formatINR(total.collected)} hint={`${formatINR(total.net)} without GST`} />
          : <Stat label="Given free" value={formatCount(sales.granted_copies)} hint="All time, not counted as sold" />}
      </div>

      <Section title="Copies sold by month" description={range.preset === 'all' ? 'The last 12 months.' : undefined} action={<Legend items={legend} />}>
        {any ? (
          <div className="space-y-5">
            <TrendChart
              mode="stack"
              whole
              height={240}
              label="Copies of this book sold each month, e-book and paperback"
              ticks={trend.map((t) => monthName(t.month))}
              labels={trend.map((t) => monthName(t.month, true))}
              series={legend.map((l) => ({ ...l, values: trend.map((t) => t[l.key as 'ebook' | 'paperback']) }))}
              format={(n) => plural(n, 'copy', 'copies')}
              axisFormat={formatCount}
              details={(i) => (money ? [{ name: 'Collected', value: formatINR(trend[i].collected) }] : [])}
            />
            <DataTableView
              caption="Copies sold by month"
              rows={[...trend].reverse()}
              rowKey={(t) => t.month}
              maxHeight={300}
              columns={[
                { header: 'Month', cell: (t) => monthName(t.month, true) },
                { header: 'E-book', align: 'right', cell: (t) => formatCount(t.ebook) },
                { header: 'Paperback', align: 'right', cell: (t) => formatCount(t.paperback) },
                { header: 'Sold', align: 'right', cell: (t) => formatCount(t.sold) },
                ...(money ? [{ header: 'Collected', align: 'right' as const, cell: (t: (typeof trend)[number]) => formatINR(t.collected) }] : []),
              ]}
            />
          </div>
        ) : <p className="py-8 text-center text-sm text-muted-foreground">No copies were sold in this period.</p>}
      </Section>

      <Section title="What is counted">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div><dt className="text-[13px] text-muted-foreground">Given free by an admin</dt><dd className="font-medium">{plural(sales.granted_copies, 'copy', 'copies')}</dd></div>
          <div><dt className="text-[13px] text-muted-foreground">Students who can open the e-book now</dt><dd className="font-medium">{formatCount(sales.active_readers)}</dd></div>
          <div><dt className="text-[13px] text-muted-foreground">Times the free sample was opened</dt><dd className="font-medium">{formatCount(sales.sample_opens)}</dd></div>
        </dl>
        <p className="mt-4 text-[13px] text-muted-foreground">Sold means paid. Copies given free, refunded, revoked or not yet paid are left out. When one order has several books, its money (delivery included) is shared by the price of each book. Dates are in IST.</p>
      </Section>
    </div>
  )
}
