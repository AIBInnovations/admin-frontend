import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Package } from 'lucide-react'
import { usePurchasesColumns } from './PurchasesPage.columns'
import { TYPE_OPTIONS } from './components/labels'
import { hasPurchaseFilters, PurchaseListFilters, PurchaseTotalsBar } from './components/PurchaseListFilters'
import { useListUrl } from './components/useListUrl'
import { usePurchaseList } from './components/usePurchaseList'

const DEFAULTS = { type: 'package' }

const filters: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'All Status', value: 'all' },
      { label: 'Completed', value: 'completed' },
      { label: 'Pending', value: 'pending' },
      { label: 'Failed', value: 'failed' },
      { label: 'Refunded', value: 'refunded' },
      { label: 'Revoked', value: 'revoked' },
    ],
    placeholder: 'Filter by status',
    defaultValue: 'all',
  },
  {
    key: 'gateway',
    label: 'Gateway',
    type: 'select',
    options: [
      { label: 'All Gateways', value: 'all' },
      { label: 'Zoho Payments', value: 'zoho_payments' },
      { label: 'Razorpay', value: 'razorpay' },
    ],
    placeholder: 'Filter by gateway',
    defaultValue: 'all',
  },
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: [...TYPE_OPTIONS.slice(0, 1), { label: 'All Types', value: 'all' }, ...TYPE_OPTIONS.slice(1)],
    placeholder: 'Filter by type',
    defaultValue: 'package',
  },
]

export function PurchasesPage() {
  const navigate = useNavigate()
  const url = useListUrl()
  const { params, page, setPage, update } = url
  const type = params.get('type') || DEFAULTS.type
  const { data, loading, error, reload } = usePurchaseList(url, DEFAULTS)
  const columns = usePurchasesColumns(type)
  const filtered = hasPurchaseFilters(params)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        description="View and manage all package purchases and subscriptions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Commerce' },
          { label: 'Purchases' },
        ]}
      />

      <div className="space-y-3">
        <SearchWithFilters
          value={url.searchInput}
          onChange={url.setSearchInput}
          placeholder="Search by name, phone, email, student ID, payment or invoice"
          filters={filters}
          activeFilters={{ status: params.get('status') || 'all', gateway: params.get('gateway') || 'all', type }}
          onFiltersChange={(f) => update({
            status: f.status === 'all' ? null : f.status,
            gateway: f.gateway === 'all' ? null : f.gateway,
            type: f.type === DEFAULTS.type ? null : f.type,
          })}
        />
        <PurchaseListFilters url={url} />
        {/* Testers' INR 1 orders: hidden by default, never in the totals' sales (27 Nov 2026) */}
        <div className="flex items-center gap-2.5">
          <Switch
            id="hide-test-orders"
            checked={!['include', 'only'].includes(params.get('test') || '')}
            onCheckedChange={(hide) => update({ test: hide ? null : 'include' })}
          />
          <label htmlFor="hide-test-orders" className="text-sm">Hide test orders</label>
          {!!data?.totals && 'test' in data.totals && Number((data.totals as { test?: number }).test) > 0 && (
            <span className="text-xs text-muted-foreground">{Number((data.totals as { test?: number }).test).toLocaleString('en-IN')} shown, not counted as sales</span>
          )}
        </div>
      </div>

      <PurchaseTotalsBar totals={data?.totals ?? null} loading={loading} />

      {error && data && (
        <p role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error} Showing what was loaded before.
          <Button size="sm" variant="outline" onClick={reload}>Try again</Button>
        </p>
      )}
      {data?.search_truncated && <p className="text-sm text-muted-foreground">This search matches a lot of records. Add a few more letters to see all of them.</p>}

      <DataTable
        data={data?.entities ?? []}
        columns={columns}
        isLoading={loading && !data}
        error={error}
        onRetry={reload}
        onRowClick={(tx) => navigate(`/commerce/purchases/${tx.purchase_type}/${tx.transaction_id}`, { state: { back: { label: 'Purchases', href: `/commerce/purchases${params.toString() ? `?${params}` : ''}` } } })}
        pagination={{
          currentPage: page,
          totalPages: data?.pagination.totalPages || 1,
          totalCount: data?.pagination.total || 0,
          onPageChange: setPage,
        }}
        emptyState={{
          icon: Package,
          title: filtered ? 'No purchases found matching your filters' : 'No purchases yet',
          description: filtered ? undefined : 'Package purchases will appear here when users subscribe',
          action: filtered ? <Button variant="outline" size="sm" onClick={() => { url.setSearchInput(''); url.replaceAll(new URLSearchParams()) }}>Clear filters</Button> : undefined,
        }}
        getRowKey={(tx) => `${tx.purchase_type}-${tx.transaction_id}`}
      />
    </div>
  )
}
