import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Briefcase, Download, Loader2, RotateCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable, type ColumnDef } from '@/components/common/DataTable'
import { DateRangeFilter, istToday, rangeFromParams, rangeToParams } from '@/components/common/DateRangeFilter'
import { apiErrorMessage } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { relativeTime } from '@/lib/relativeTime'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CAREER_ROLES, careersService, type CareerApplication, type CareerCounts, type CareerListParams, type CareerPagination, type CareerStatus } from '@/services/careers.service'
import { CareerStatusPill, Pager, SearchBox } from '@/components/careers/controls'
import { STATUS, STATUS_ORDER, istStamp, plural } from '@/components/careers/lib'

const PAGE_SIZE = 20
const TABS: { id: '' | CareerStatus; label: string; count: keyof CareerCounts }[] = [
  { id: '', label: 'All', count: 'all' },
  ...STATUS_ORDER.map((s) => ({ id: s, label: STATUS[s].label, count: s })),
]
const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name, A to Z' },
]
const FILTER_KEYS = ['q', 'role', 'range', 'from', 'to']

interface ListData { applications: CareerApplication[]; pagination: CareerPagination; counts: CareerCounts }

/** Patch the URL: empty removes a key, and any change but the page goes back to page 1. */
function patched(params: URLSearchParams, patch: Record<string, string | null>, keepPage = false) {
  const next = new URLSearchParams(params)
  if (!keepPage) next.delete('page')
  for (const [k, v] of Object.entries(patch)) {
    if (v) next.set(k, v)
    else next.delete(k)
  }
  return next
}

const pageOf = (params: URLSearchParams) => {
  const n = Number(params.get('page'))
  return Number.isInteger(n) && n > 0 ? n : 1
}

const columns: ColumnDef<CareerApplication>[] = [
  {
    id: 'applicant',
    header: 'Applicant',
    cell: (a) => (
      <div className="min-w-[180px] max-w-[300px]">
        <p className="truncate text-sm font-medium" title={a.name}>{a.name}</p>
        <p className="truncate text-xs text-muted-foreground" title={a.email}>{a.email}</p>
      </div>
    ),
  },
  { id: 'role', header: 'Role', cell: (a) => <span className="block min-w-[120px] max-w-[180px] text-sm">{a.wished_role}</span> },
  {
    id: 'subject',
    header: 'Subject',
    cell: (a) => (a.subject
      ? <span className="block min-w-[100px] max-w-[180px] truncate text-sm" title={a.subject}>{a.subject}</span>
      : <span className="text-sm text-muted-foreground">Not given</span>),
  },
  { id: 'phone', header: 'Phone', cell: (a) => <span className="whitespace-nowrap text-sm tabular-nums">{a.phone_number}</span> },
  {
    id: 'submitted',
    header: 'Submitted',
    cell: (a) => <time dateTime={a.createdAt} title={istStamp(a.createdAt)} className="whitespace-nowrap text-sm">{relativeTime(a.createdAt)}</time>,
  },
  { id: 'status', header: 'Status', width: 'w-28', cell: (a) => <CareerStatusPill status={a.status} /> },
]

/** Career applications from the website and the app. */
export function CareersPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const wide = useMediaQuery('(min-width: 768px)')

  const status = TABS.some((t) => t.id && t.id === params.get('status')) ? (params.get('status') as CareerStatus) : ''
  const role = CAREER_ROLES.includes(params.get('role') as (typeof CAREER_ROLES)[number]) ? params.get('role')! : ''
  const q = (params.get('q') || '').slice(0, 100)
  const sort = SORTS.some((s) => s.value === params.get('sort')) ? params.get('sort')! : 'newest'
  const range = rangeFromParams(params, 'all')
  const page = pageOf(params)

  const query: CareerListParams = {
    status: status || undefined,
    wished_role: role || undefined,
    q: q || undefined,
    from: range.from || undefined,
    to: range.to || undefined,
    sort: sort === 'newest' ? undefined : sort,
  }
  const key = JSON.stringify(query)

  const [data, setData] = useState<ListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const { nextFetchId, isStale } = useLatestFetch()
  const latestParams = useRef(params)
  latestParams.current = params

  const update = useCallback((patch: Record<string, string | null>, keepPage = false) => {
    setParams(patched(latestParams.current, patch, keepPage), { replace: true })
  }, [setParams])

  const load = useCallback(async () => {
    const id = nextFetchId()
    setLoading(true)
    try {
      const res = await careersService.list({ ...JSON.parse(key), page, limit: PAGE_SIZE })
      if (isStale(id)) return
      const result = res.data ?? null
      // The last row of the last page went away (deleted): step back a page
      if (result && page > 1 && page > result.pagination.totalPages) {
        update({ page: result.pagination.totalPages > 1 ? String(result.pagination.totalPages) : null }, true)
        return
      }
      setData(result)
      setError(null)
    } catch (e) {
      if (!isStale(id)) setError(apiErrorMessage(e, 'The applications could not be loaded.'))
    } finally {
      if (!isStale(id)) setLoading(false)
    }
  }, [key, page, update, nextFetchId, isStale])

  useEffect(() => { load() }, [load])

  const filtered = !!(q || role || range.preset !== 'all')
  // Keeps the status tab: Clear filters undoes what is below the tabs
  const clearFilters = () => setParams(patched(params, Object.fromEntries(FILTER_KEYS.map((k) => [k, null]))), { replace: true })
  const total = data?.pagination.total ?? 0
  const counts = data?.counts
  const back = { label: 'Careers', href: `${location.pathname}${location.search}` }
  const open = (a: CareerApplication) => navigate(`/careers/${a._id}`, { state: { back } })

  const exportCsv = async () => {
    if (exporting) return
    setExporting(true)
    try {
      await careersService.exportCsv(query, `career-applications_${istToday()}.csv`)
      toast.success(`Exported ${plural(Math.min(total, 5000), 'application')}`)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'The export could not be made. Please try again.'))
    } finally {
      setExporting(false)
    }
  }

  const empty = filtered
    ? { title: 'No applications match these filters', description: undefined, action: <Button variant="outline" className="h-10 sm:h-9" onClick={clearFilters}>Clear filters</Button> }
    : status && counts && counts.all > 0
      ? { title: `No ${STATUS[status].label.toLowerCase()} applications`, description: undefined, action: <Button variant="outline" className="h-10 sm:h-9" onClick={() => update({ status: null })}>Show all applications</Button> }
      : { title: 'No applications yet', description: 'Applications from the website and app appear here.', action: undefined }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Careers"
        description="Applications from the careers form on the website and the app."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Careers' }]}
        action={
          <Button type="button" variant="outline" className="h-10 w-full bg-card sm:h-9 sm:w-auto" onClick={exportCsv} disabled={exporting || !total}>
            {exporting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Download aria-hidden="true" />}
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Status">
          {TABS.map((t) => {
            const active = status === t.id
            return (
              <button
                key={t.id || 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => update({ status: t.id || null })}
                className={cn(
                  'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors sm:h-8 sm:px-3',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary/40',
                )}
              >
                {t.label}
                {counts && <span className={cn('tabular-nums', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{formatCount(counts[t.count])}</span>}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <SearchBox value={q} onChange={(v) => update({ q: v || null })} label="Search name, email or phone" className="col-span-2 sm:w-72" />
          <Select value={role || 'all'} onValueChange={(v) => update({ role: v === 'all' ? null : v })}>
            <SelectTrigger aria-label="Role" className={cn('h-10 min-w-0 bg-card sm:h-9 sm:w-52', role && 'border-primary/40 bg-accent text-accent-foreground')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {CAREER_ROLES.map((r) => <SelectItem key={r} value={r}>{r === 'Examiner' ? 'Examiner (old role)' : r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => update({ sort: v === 'newest' ? null : v })}>
            <SelectTrigger aria-label="Sort" className="h-10 min-w-0 bg-card sm:h-9 sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <DateRangeFilter
            value={range}
            onChange={(r) => setParams(rangeToParams(r, patched(params, {})), { replace: true })}
            className="col-span-2 h-10 w-full sm:h-9 sm:w-auto"
          />
          {filtered && (
            <Button type="button" variant="ghost" className="col-span-2 h-10 justify-self-start sm:h-9" onClick={clearFilters}>
              <X aria-hidden="true" />Clear filters
            </Button>
          )}
        </div>
      </div>

      {error && data && (
        <p role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error} Showing what was loaded before.
          <Button size="sm" variant="outline" className="h-10 sm:h-8" onClick={load}><RotateCw aria-hidden="true" />Try again</Button>
        </p>
      )}

      <div className="space-y-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {data ? (total ? plural(total, 'application') : '') : loading ? 'Loading applications' : ''}
          {loading && data && <Loader2 aria-label="Refreshing" className="ml-2 inline h-3.5 w-3.5 animate-spin align-[-2px]" />}
        </p>

        {wide ? (
          <DataTable
            data={data?.applications ?? []}
            columns={columns}
            isLoading={loading && !data}
            error={data ? null : error}
            onRetry={load}
            onRowClick={open}
            getRowKey={(a) => a._id}
            skeletonCount={6}
            emptyState={{ icon: Briefcase, ...empty }}
          />
        ) : (
          <CardList
            rows={data?.applications ?? []}
            loading={loading && !data}
            error={data ? null : error}
            onRetry={load}
            back={back}
            empty={empty}
          />
        )}

        <Pager page={page} totalPages={data?.pagination.totalPages ?? 1} onChange={(p) => update({ page: p > 1 ? String(p) : null }, true)} />
      </div>
    </div>
  )
}

interface CardListProps {
  rows: CareerApplication[]
  loading: boolean
  error: string | null
  onRetry: () => void
  back: { label: string; href: string }
  empty: { title: string; description?: string; action?: ReactNode }
}

/** Phones: one card per application, the whole card opens it. */
function CardList({ rows, loading, error, onRetry, back, empty }: CardListProps) {
  if (loading) {
    return (
      <ul aria-label="Loading" className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <Skeleton className="h-4 w-2/3" /><Skeleton className="mt-2 h-3 w-1/2" /><Skeleton className="mt-3 h-3 w-3/4" />
          </li>
        ))}
      </ul>
    )
  }
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-5 py-10 text-center shadow-card">
        <p className="text-sm font-semibold">This list could not be loaded</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" className="h-10" onClick={onRetry}><RotateCw aria-hidden="true" />Try again</Button>
      </div>
    )
  }
  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-5 py-10 text-center shadow-card">
        <Briefcase aria-hidden="true" className="h-9 w-9 text-muted-foreground opacity-50" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{empty.title}</p>
          {empty.description && <p className="text-sm text-muted-foreground">{empty.description}</p>}
        </div>
        {empty.action}
      </div>
    )
  }
  return (
    <ul className="space-y-2">
      {rows.map((a) => (
        <li key={a._id}>
          <Link
            to={`/careers/${a._id}`}
            state={{ back }}
            className="block rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--ring))] active:bg-accent/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium leading-snug" title={a.name}>{a.name}</p>
                <p className="truncate text-[13px] text-muted-foreground" title={a.email}>{a.email}</p>
              </div>
              <CareerStatusPill status={a.status} className="shrink-0" />
            </div>
            <p className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[13px] text-muted-foreground">
              <span className="text-foreground">{a.wished_role}</span>
              {a.subject && <><span aria-hidden="true">·</span><span className="min-w-0 max-w-full truncate">{a.subject}</span></>}
              <span aria-hidden="true">·</span>
              <time dateTime={a.createdAt} title={istStamp(a.createdAt)}>{relativeTime(a.createdAt)}</time>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
