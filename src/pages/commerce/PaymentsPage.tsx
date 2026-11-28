import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { Button } from '@/components/ui/button'
import { IndianRupee } from 'lucide-react'
import { paymentCasesService } from '@/services/paymentCases.service'
import { usePaymentsColumns } from './PaymentsPage.columns'
import { TYPE_OPTIONS } from './components/labels'
import { hasPurchaseFilters, PurchaseListFilters, PurchaseTotalsBar } from './components/PurchaseListFilters'
import { useListUrl } from './components/useListUrl'
import { usePurchaseList } from './components/usePurchaseList'

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
    key: 'type',
    label: 'Type',
    type: 'select',
    options: [{ label: 'All Types', value: 'all' }, ...TYPE_OPTIONS],
    placeholder: 'Filter by type',
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
]

const PAYMENT_DEFAULTS = { test: 'include' as const }

export function PaymentsPage() {
  const navigate = useNavigate()
  const url = useListUrl()
  const { params, page, setPage, update } = url
  // Gateway payments: testers' INR 1 payments are real money, so they are listed, labelled Test (27 Nov 2026)
  const { data, loading, error, reload } = usePurchaseList(url, PAYMENT_DEFAULTS)
  const columns = usePaymentsColumns()
  const filtered = hasPurchaseFilters(params)
  const [unmatched, setUnmatched] = useState(0)

  // Money that arrived without a purchase is in no list, so say it here.
  useEffect(() => {
    let off = false
    paymentCasesService.list({ kind: 'unmatched_payment', status: 'active', limit: 1 })
      .then((r) => { if (!off) setUnmatched(r.data?.pagination.total || 0) })
      .catch(() => { /* only a hint */ })
    return () => { off = true }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track all payment transactions across the platform. Open one to see what the gateway recorded; open a purchase to see what the student got."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Commerce' },
          { label: 'Payments' },
        ]}
      />

      {unmatched > 0 && (
        <p className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warning-soft px-4 py-2.5 text-sm text-warning">
          {unmatched === 1 ? '1 payment was received but no purchase was found for it.' : `${unmatched} payments were received but no purchase was found for them.`}
          <Link to="/commerce/cases?kind=unmatched_payment" className="font-medium underline underline-offset-4">Review</Link>
        </p>
      )}

      <div className="space-y-3">
        <SearchWithFilters
          value={url.searchInput}
          onChange={url.setSearchInput}
          placeholder="Search by transaction ID, user name, or email..."
          filters={filters}
          activeFilters={{ status: params.get('status') || 'all', type: params.get('type') || 'all', gateway: params.get('gateway') || 'all' }}
          onFiltersChange={(f) => update({
            status: f.status === 'all' ? null : f.status,
            type: f.type === 'all' ? null : f.type,
            gateway: f.gateway === 'all' ? null : f.gateway,
          })}
        />
        <PurchaseListFilters url={url} />
      </div>

      <PurchaseTotalsBar totals={data?.totals ?? null} loading={loading} />
      {Number((data?.totals as { test?: number } | undefined)?.test) > 0 && (
        <p className="text-xs text-muted-foreground">
          {Number((data?.totals as { test?: number }).test).toLocaleString('en-IN')} tester payment{Number((data?.totals as { test?: number }).test) === 1 ? '' : 's'} (₹1, labelled Test) listed: real money at the gateway, not counted as sales.
        </p>
      )}

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
        onRowClick={(tx) => navigate(`/commerce/payments/${tx.purchase_type}/${tx.transaction_id}`, { state: { back: { label: 'Payments', href: `/commerce/payments${params.toString() ? `?${params}` : ''}` } } })}
        pagination={{
          currentPage: page,
          totalPages: data?.pagination.totalPages || 1,
          totalCount: data?.pagination.total || 0,
          onPageChange: setPage,
        }}
        emptyState={{
          icon: IndianRupee,
          title: filtered ? 'No transactions found matching your filters' : 'No transactions yet',
          description: filtered ? undefined : 'Transactions will appear here when users make purchases',
          action: filtered ? <Button variant="outline" size="sm" onClick={() => { url.setSearchInput(''); url.replaceAll(new URLSearchParams()) }}>Clear filters</Button> : undefined,
        }}
        getRowKey={(tx) => `${tx.purchase_type}-${tx.transaction_id}`}
      />
    </div>
  )
}
