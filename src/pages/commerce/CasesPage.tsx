import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable, type ColumnDef } from '@/components/common/DataTable'
import { SearchWithFilters, type FilterConfig } from '@/components/common/SearchBar'
import { StatusPill, apiErrorMessage } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { formatINR, subscriptionLabel } from '@/lib/format'
import { paymentCasesService, type CaseListResult, type PaymentCase } from '@/services/paymentCases.service'
import { ClearFilters, Totals } from './components/filters'
import { CASE_KIND, CASE_STATUS, dueLabel, istDay } from './components/labels'
import { useListUrl } from './components/useListUrl'
import { StudentLink } from '@/components/students/StudentLink'

const filters: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'Open and in progress', value: 'active' },
      { label: 'All Status', value: 'all' },
      ...Object.entries(CASE_STATUS).map(([value, s]) => ({ label: s.label, value })),
      { label: 'All closed', value: 'closed' },
    ],
    defaultValue: 'active',
  },
  {
    key: 'kind',
    label: 'Kind',
    type: 'select',
    options: [{ label: 'All Kinds', value: 'all' }, ...Object.entries(CASE_KIND).map(([value, k]) => ({ label: k.label, value }))],
    defaultValue: 'all',
  },
  {
    key: 'sort',
    label: 'Sort',
    type: 'select',
    options: [
      { label: 'Evidence due first', value: 'due' },
      { label: 'Newest first', value: 'newest' },
      { label: 'Oldest first', value: 'oldest' },
    ],
    defaultValue: 'due',
  },
]

const columns: ColumnDef<PaymentCase>[] = [
  {
    id: 'case',
    header: 'Case',
    cell: (c) => (
      <div className="min-w-[140px]">
        <p className="text-sm font-medium">{CASE_KIND[c.kind]?.label || c.kind}</p>
        <p className="font-mono text-xs text-muted-foreground">{c.case_number}</p>
      </div>
    ),
  },
  {
    id: 'student',
    header: 'Student',
    cell: (c) => (
      <div className="min-w-[150px] max-w-[230px]">
        <p className="truncate text-sm">{c.user || c.user_id ? <StudentLink student={c.user} from="Disputes & Refunds" /> : <span className="text-muted-foreground">Not known</span>}</p>
        {c.user && <p className="truncate text-xs text-muted-foreground">{c.user.phone_number}</p>}
      </div>
    ),
  },
  {
    id: 'item',
    header: 'Item',
    cell: (c) => {
      const label = c.purchase_type === 'package' && c.item_name ? subscriptionLabel(c.item_name, c) : c.item_name
      return <span className="block min-w-[170px] max-w-[280px] truncate text-sm" title={label || undefined}>{label || <span className="text-muted-foreground">No purchase linked</span>}</span>
    },
  },
  { id: 'amount', header: 'Amount', width: 'w-28', cell: (c) => <span className="whitespace-nowrap text-sm font-medium tabular-nums">{formatINR(c.amount)}</span> },
  {
    id: 'due',
    header: 'Evidence due',
    width: 'w-36',
    cell: (c) => {
      if (!c.evidence_due_at) return <span className="text-xs text-muted-foreground">—</span>
      const live = c.status === 'open' || c.status === 'in_progress'
      const due = dueLabel(c.evidence_due_at)
      return (
        <div className="whitespace-nowrap">
          <p className="text-sm">{istDay(c.evidence_due_at)}</p>
          {live && <p className={`text-xs font-medium ${due.tone === 'danger' ? 'text-danger' : due.tone === 'warning' ? 'text-warning' : 'text-muted-foreground'}`}>{due.label}</p>}
        </div>
      )
    },
  },
  {
    id: 'status',
    header: 'Status',
    width: 'w-32',
    cell: (c) => (
      <div className="flex flex-col items-start gap-1">
        <StatusPill tone={CASE_STATUS[c.status]?.tone}>{CASE_STATUS[c.status]?.label || c.status}</StatusPill>
        {c.gateway_status === 'lost' && c.status !== 'lost' && <span className="whitespace-nowrap text-xs font-medium text-danger">Bank: lost</span>}
      </div>
    ),
  },
  { id: 'opened', header: 'Opened', width: 'w-28', cell: (c) => <span className="whitespace-nowrap text-xs text-muted-foreground">{istDay(c.createdAt)}</span> },
]

/** Disputes, refunds and payments that could not be activated. */
export function CasesPage() {
  const navigate = useNavigate()
  const url = useListUrl()
  const { params, page, setPage, update, search } = url
  const status = params.get('status') || 'active'
  const kind = params.get('kind') || 'all'
  const sort = params.get('sort') || 'due'
  const overdue = params.get('overdue') === '1'

  const [data, setData] = useState<CaseListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { nextFetchId, isStale } = useLatestFetch()

  const load = useCallback(async () => {
    const id = nextFetchId()
    setLoading(true)
    try {
      const res = await paymentCasesService.list({ status, kind: kind === 'all' ? undefined : kind, sort, search: search || undefined, overdue: overdue ? 1 : undefined, page, limit: 20 })
      if (isStale(id)) return
      const result = res.data ?? null
      const last = result?.pagination.totalPages || 0
      if (page > 1 && last > 0 && page > last) { setPage(last); return }
      setData(result)
      setError(null)
    } catch (e) {
      if (!isStale(id)) setError(apiErrorMessage(e, 'The cases could not be loaded.'))
    } finally {
      if (!isStale(id)) setLoading(false)
    }
  }, [status, kind, sort, search, overdue, page, setPage, nextFetchId, isStale])

  useEffect(() => { load() }, [load])

  const filtered = !!search || status !== 'active' || kind !== 'all' || overdue
  const clear = () => { url.setSearchInput(''); url.replaceAll(new URLSearchParams()) }
  const c = data?.counts

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disputes & Refunds"
        description="Bank disputes, refunds, and payments that need a person: paid twice, coupon over its limit, or no purchase found."
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Commerce' }, { label: 'Disputes & Refunds' }]}
      />

      <SearchWithFilters
        value={url.searchInput}
        onChange={url.setSearchInput}
        placeholder="Search case, student, payment or reference"
        filters={filters}
        activeFilters={{ status, kind, sort }}
        onFiltersChange={(f) => update({ status: f.status === 'active' ? null : f.status, kind: f.kind === 'all' ? null : f.kind, sort: f.sort === 'due' ? null : f.sort })}
        action={filtered ? <ClearFilters onClick={clear} /> : undefined}
      />

      <Totals
        loading={loading && !!c}
        items={[
          { label: 'Open', value: c ? c.active.toLocaleString('en-IN') : '—', hint: c && c.in_progress ? `${c.in_progress} in progress` : undefined },
          { label: 'Money in open cases', value: c ? formatINR(c.active_amount) : '—' },
          {
            label: 'Evidence overdue',
            value: c ? (c.overdue > 0
              ? <button type="button" className="text-danger underline underline-offset-4" aria-pressed={overdue} onClick={() => update({ overdue: overdue ? null : '1', status: null })}>{c.overdue}</button>
              : '0') : '—',
            hint: overdue ? 'Showing only these' : undefined,
          },
          { label: 'Closed', value: c ? c.closed.toLocaleString('en-IN') : '—' },
        ]}
      />

      {error && data && (
        <p role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error} Showing what was loaded before.
          <Button size="sm" variant="outline" onClick={load}>Try again</Button>
        </p>
      )}

      <DataTable
        data={data?.entities ?? []}
        columns={columns}
        isLoading={loading && !data}
        error={error}
        onRetry={load}
        onRowClick={(row) => navigate(`/commerce/cases/${row._id}`, { state: { back: { label: 'Disputes & Refunds', href: `/commerce/cases${params.toString() ? `?${params}` : ''}` } } })}
        pagination={{ currentPage: page, totalPages: data?.pagination.totalPages || 1, totalCount: data?.pagination.total || 0, onPageChange: setPage }}
        emptyState={{
          icon: ShieldCheck,
          title: filtered ? 'No cases match your filters' : 'Nothing is open',
          description: filtered ? undefined : 'Disputes from the bank appear here by themselves. To add one by hand, open a purchase and choose Open a case.',
          action: filtered ? <Button variant="outline" size="sm" onClick={clear}>Clear filters</Button> : c && c.closed > 0 ? <Button variant="outline" size="sm" onClick={() => update({ status: 'closed' })}>Show closed cases</Button> : undefined,
        }}
        getRowKey={(row) => row._id}
      />
    </div>
  )
}
