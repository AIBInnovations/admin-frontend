import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { useAuth } from '@/contexts/AuthContext'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { DateRangeFilter, rangeFromParams, rangeToParams } from '@/components/common/DateRangeFilter'
import { SearchWithFilters, FilterConfig } from '@/components/common/SearchBar'
import { apiErrorMessage } from '@/components/common/detail'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import { formatINR } from '@/lib/format'
import { invoicesService, Invoice, InvoiceListResult } from '@/services/invoices.service'
import { useInvoicesColumns } from './InvoicesPage.columns'
import { ClearFilters, Totals } from './components/filters'
import { TYPE_OPTIONS } from './components/labels'
import { useInvoiceActions } from './components/useInvoiceActions'
import { useListUrl } from './components/useListUrl'

const filters: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { label: 'All Status', value: 'all' },
      { label: 'Paid', value: 'paid' },
      { label: 'Unpaid', value: 'unpaid' },
      { label: 'Partially Paid', value: 'partially_paid' },
      { label: 'Void', value: 'void' },
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
]

export function InvoicesPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('invoices.update')
  const url = useListUrl()
  const { params, page, setPage, update, search } = url
  const status = params.get('status') || 'all'
  const type = params.get('type') || 'all'
  const range = rangeFromParams(params, 'all')

  const [data, setData] = useState<InvoiceListResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [emailing, setEmailing] = useState<Invoice | null>(null)
  const { nextFetchId, isStale } = useLatestFetch()

  const load = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await invoicesService.getAll({
        page,
        limit: 20,
        search: search || undefined,
        payment_status: status !== 'all' ? status : undefined,
        purchase_type: type !== 'all' ? type : undefined,
        from: range.from || undefined,
        to: range.to || undefined,
      })
      if (isStale(fetchId)) return
      const result = response.data ?? null
      const last = result?.pagination.totalPages || 0
      if (page > 1 && last > 0 && page > last) { setPage(last); return }
      setData(result)
      setError(null)
    } catch (e) {
      if (!isStale(fetchId)) setError(apiErrorMessage(e, 'The invoices could not be loaded.'))
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [page, search, status, type, range.from, range.to, setPage, nextFetchId, isStale])

  useEffect(() => { load() }, [load])

  const actions = useInvoiceActions(load)
  const columns = useInvoicesColumns({
    onDownload: actions.download,
    onRegenerate: canUpdate ? actions.regenerate : undefined,
    onEmail: canUpdate ? setEmailing : undefined,
    busyId: actions.busy?.id ?? null,
  })

  const filtered = !!search || status !== 'all' || type !== 'all' || range.preset !== 'all'
  const clear = () => { url.setSearchInput(''); url.replaceAll(new URLSearchParams()) }
  const t = data?.totals

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="View and manage all payment invoices and GST records"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Commerce' },
          { label: 'Invoices' },
        ]}
      />

      {data?.zoho_connected === false && (
        <p className="rounded-lg bg-warning-soft px-4 py-2.5 text-sm text-warning">Zoho Books is not connected. Invoices can be read here, but PDFs, regenerating and emailing will not work until it is.</p>
      )}

      <SearchWithFilters
        value={url.searchInput}
        onChange={url.setSearchInput}
        placeholder="Search by invoice number, email, phone or name..."
        filters={filters}
        activeFilters={{ status, type }}
        onFiltersChange={(f) => update({ status: f.status === 'all' ? null : f.status, type: f.type === 'all' ? null : f.type })}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter value={range} onChange={(r) => { const next = rangeToParams(r, params); if (r.preset === 'all') next.delete('range'); next.delete('page'); url.replaceAll(next) }} />
            {filtered && <ClearFilters onClick={clear} />}
          </div>
        }
      />

      <Totals
        loading={loading && !!t}
        items={[
          { label: 'Invoices', value: t ? t.count.toLocaleString('en-IN') : '—' },
          { label: 'Invoiced', value: t ? formatINR(t.amount) : '—', hint: 'GST included, void left out' },
          { label: 'GST', value: t ? formatINR(t.gst) : '—' },
          { label: 'Not fully paid', value: t ? t.unpaid.toLocaleString('en-IN') : '—' },
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
        onRowClick={(inv) => navigate(`/commerce/invoices/${inv._id}`, { state: { back: { label: 'Invoices', href: `/commerce/invoices${params.toString() ? `?${params}` : ''}` } } })}
        pagination={{
          currentPage: page,
          totalPages: data?.pagination.totalPages || 1,
          totalCount: data?.pagination.total || 0,
          onPageChange: setPage,
        }}
        emptyState={{
          icon: FileText,
          title: filtered ? 'No invoices found matching your filters' : 'No invoices yet',
          description: filtered ? undefined : 'Invoices are generated automatically when payments are completed',
          action: filtered ? <Button variant="outline" size="sm" onClick={clear}>Clear filters</Button> : undefined,
        }}
        getRowKey={(inv) => inv._id}
      />

      <AlertDialog open={!!emailing} onOpenChange={(o) => { if (!o) setEmailing(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Email {emailing?.invoice_number} again?</AlertDialogTitle>
            <AlertDialogDescription>The student gets the invoice by email from Zoho Books now.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (emailing) actions.email(emailing) }}>Email invoice</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
