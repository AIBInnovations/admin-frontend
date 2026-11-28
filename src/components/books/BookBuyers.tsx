import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, type ColumnDef } from '@/components/common/DataTable'
import { StatusPill } from '@/components/common/detail'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { useServerSearch } from '@/hooks/useServerSearch'
import { formatCount, formatDayTime, formatINR } from '@/lib/format'
import { booksService, type BookBuyer } from '@/services/books.service'
import { errorText } from './bookDisplay'
import { useAuth } from '@/contexts/AuthContext'
import { StudentLink } from '@/components/students/StudentLink'

const LIMIT = 25
const TYPES = [
  { value: 'all', label: 'Everyone who paid' },
  { value: 'ebook', label: 'Bought the e-book' },
  { value: 'paperback', label: 'Bought the paperback' },
  { value: 'granted', label: 'Given free' },
]
const KIND: Record<BookBuyer['kind'], string> = { ebook: 'E-book', paperback: 'Paperback', granted: 'Given free' }

/** Who bought this book. Filters and page live in the URL. */
export function BookBuyers({ bookId }: { bookId: string }) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  // The row opens the purchase (an e-book) or the order (a paperback)
  const recordHref = (r: BookBuyer) => r.kind === 'paperback'
    ? (hasPermission('book_orders.read') ? `/commerce/book-orders/${r.purchase_id}` : null)
    : (hasPermission('payments.read') || hasPermission('users.read') ? `/commerce/purchases/ebook/${r.purchase_id}` : null)
  const type = TYPES.some((t) => t.value === params.get('who')) ? params.get('who')! : 'all'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const q = params.get('q') || ''
  const { inputValue, setInputValue, debouncedSearch } = useServerSearch(q)
  const [rows, setRows] = useState<BookBuyer[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { nextFetchId, isStale } = useLatestFetch()

  const update = useCallback((patch: Record<string, string | null>) => setParams((prev) => {
    const next = new URLSearchParams(prev)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    return next
  }, { replace: true }), [setParams])

  useEffect(() => { if (debouncedSearch !== q) update({ q: debouncedSearch || null, page: null }) }, [debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    const id = nextFetchId()
    setLoading(true)
    try {
      const res = await booksService.getBuyers(bookId, { page, limit: LIMIT, type, search: q })
      if (isStale(id)) return
      if (!res.success || !res.data) throw new Error(res.message || 'The buyers could not be loaded.')
      setRows(res.data.entities)
      setTotal(res.data.pagination.total)
      setTotalPages(res.data.pagination.totalPages)
      setError(null)
      if (page > res.data.pagination.totalPages) update({ page: res.data.pagination.totalPages > 1 ? String(res.data.pagination.totalPages) : null })
    } catch (err) {
      if (!isStale(id)) setError(errorText(err, 'The buyers could not be loaded.'))
    } finally {
      if (!isStale(id)) setLoading(false)
    }
  }, [bookId, page, type, q, nextFetchId, isStale, update])
  useEffect(() => { void load() }, [load])

  const money = rows.some((r) => r.collected !== null)
  const columns: ColumnDef<BookBuyer>[] = [
    {
      id: 'student', header: 'Student',
      cell: (r) => (
        <div className="min-w-[160px] max-w-[280px]">
          <p className="truncate text-sm"><StudentLink student={r.user} from="Book" /></p>
          <p className="truncate text-xs text-muted-foreground">{r.user ? r.user.email || r.user.phone_number || '' : ''}</p>
        </div>
      ),
    },
    { id: 'kind', header: 'Copy', cell: (r) => <span className="whitespace-nowrap text-sm">{KIND[r.kind]}{r.quantity > 1 ? ` × ${formatCount(r.quantity)}` : ''}</span> },
    ...(money && type !== 'granted' ? [{ id: 'collected', header: 'Collected', cell: (r: BookBuyer) => <span className="text-sm tabular-nums">{formatINR(r.collected)}</span> }] : []),
    {
      id: 'note', header: type === 'granted' ? 'Reason' : 'Order or coupon',
      cell: (r) => (
        <div className="flex min-w-[120px] flex-wrap items-center gap-1.5 text-sm">
          {r.kind === 'granted' ? <span className="text-muted-foreground">{r.grant_reason || 'No reason given'}</span> : null}
          {r.order_number && <span className="font-mono text-[13px]">{r.order_number}</span>}
          {r.order_status && <span className="text-muted-foreground">{r.order_status}</span>}
          {r.coupon_code && <StatusPill>{r.coupon_code}</StatusPill>}
          {r.dispute_status === 'open' && <StatusPill tone="danger">Disputed</StatusPill>}
          {r.kind === 'ebook' && !r.coupon_code && r.dispute_status !== 'open' && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    { id: 'date', header: 'Date', cell: (r) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDayTime(r.date)}</span> },
  ]
  const filtered = !!q || type !== 'all'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Search name, email, phone, order..." aria-label="Search buyers" className="h-9 pl-9" />
        </div>
        <Select value={type} onValueChange={(v) => update({ who: v === 'all' ? null : v, page: null })}>
          <SelectTrigger className="h-9 w-full sm:w-[220px]" aria-label="Which buyers"><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <DataTable
        data={rows}
        columns={columns}
        isLoading={loading && rows.length === 0}
        error={error}
        onRetry={load}
        getRowKey={(r) => r._id}
        onRowClick={rows.some(recordHref) ? (r) => { const href = recordHref(r); if (href) navigate(href) } : undefined}
        pagination={{ currentPage: page, totalPages, totalCount: total, onPageChange: (p) => update({ page: p > 1 ? String(p) : null }) }}
        emptyState={{
          icon: Users,
          title: filtered ? 'No one matches' : 'No one has bought this book yet',
          description: filtered ? 'Try another search or filter.' : 'Buyers appear here as soon as a payment is completed.',
          action: filtered ? <Button variant="outline" size="sm" onClick={() => { setInputValue(''); update({ q: null, who: null, page: null }) }}>Clear filters</Button> : undefined,
        }}
      />
    </div>
  )
}
