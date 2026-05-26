import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useServerSearch } from '@/hooks/useServerSearch'
import { useResetPageOnChange } from '@/hooks/useResetPageOnChange'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Search, CalendarClock, CalendarX2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { ExplorerLayout } from '@/pages/explorer/components/ExplorerLayout'
import { ExplorerEmptyState } from '@/pages/explorer/components/ExplorerEmptyState'
import { SubscriptionRow } from './components/SubscriptionRow'
import { ExtendValidityPanel } from './components/ExtendValidityPanel'
import {
  subscriptionsService,
  type SubscriptionRecord,
  type SubscriptionStatusFilter,
  type SubscriptionTypeFilter,
} from '@/services/subscriptions.service'

const STATUS_TABS: { value: SubscriptionStatusFilter; label: string }[] = [
  { value: 'expiring', label: 'Expiring soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'all', label: 'All' },
]

const TYPE_OPTIONS: { value: SubscriptionTypeFilter; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'package', label: 'Packages' },
  { value: 'session', label: 'Sessions' },
  { value: 'ebook', label: 'eBooks' },
]

const WINDOW_OPTIONS = [7, 30, 90]
const PAGE_SIZE = 20

export function SubscriptionsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasPermission } = useAuth()
  const canExtend = hasPermission('users.update')

  const isStatus = (v: string | null): v is SubscriptionStatusFilter =>
    v === 'expiring' || v === 'expired' || v === 'all'
  const isType = (v: string | null): v is SubscriptionTypeFilter =>
    v === 'all' || v === 'package' || v === 'session' || v === 'ebook'

  // State
  const [records, setRecords] = useState<SubscriptionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const { inputValue: search, setInputValue: setSearch, debouncedSearch } = useServerSearch('')
  const [status, setStatus] = useState<SubscriptionStatusFilter>(
    isStatus(searchParams.get('status')) ? (searchParams.get('status') as SubscriptionStatusFilter) : 'expiring'
  )
  const [typeFilter, setTypeFilter] = useState<SubscriptionTypeFilter>(
    isType(searchParams.get('type')) ? (searchParams.get('type') as SubscriptionTypeFilter) : 'all'
  )
  const [windowDays, setWindowDays] = useState(Number(searchParams.get('window')) || 30)
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selected, setSelected] = useState<SubscriptionRecord | null>(null)

  // Desktop (>= lg) shows the docked panel; below that the editor opens in a dialog.
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const { nextFetchId, isStale } = useLatestFetch()

  const fetchRecords = useCallback(async () => {
    const fetchId = nextFetchId()
    setLoading(true)
    try {
      const response = await subscriptionsService.getExpiring({
        page: currentPage,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status,
        type: typeFilter,
        window_days: status === 'expiring' ? windowDays : undefined,
        // Most-recently expired first on the Expired tab; nearest upcoming first otherwise.
        sort: status === 'expired' ? 'expires_at:desc' : 'expires_at:asc',
      })
      if (isStale(fetchId)) return

      if (response.success && response.data) {
        const entities = response.data.entities || []
        setRecords(entities)
        setTotalPages(response.data.pagination?.totalPages || 1)
        setTotalCount(response.data.pagination?.total || 0)
        // Keep the open panel in sync with freshly fetched data.
        setSelected((prev) =>
          prev ? entities.find((e) => e.purchase_id === prev.purchase_id) || prev : prev
        )
      } else {
        toast.error(response.message || 'Failed to load subscriptions')
      }
    } catch (error) {
      if (isStale(fetchId)) return
      toast.error(error instanceof Error ? error.message : 'Failed to load subscriptions')
    } finally {
      if (!isStale(fetchId)) setLoading(false)
    }
  }, [currentPage, debouncedSearch, status, typeFilter, windowDays, nextFetchId, isStale])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  // URL param sync
  useEffect(() => {
    const params: Record<string, string> = {}
    if (status !== 'expiring') params.status = status
    if (typeFilter !== 'all') params.type = typeFilter
    if (status === 'expiring' && windowDays !== 30) params.window = String(windowDays)
    if (currentPage > 1) params.page = String(currentPage)
    setSearchParams(params)
  }, [status, typeFilter, windowDays, currentPage, setSearchParams])

  useResetPageOnChange(setCurrentPage, [debouncedSearch, status, typeFilter, windowDays])

  const handleExtended = (newExpiry: string) => {
    setSelected((prev) => (prev ? { ...prev, expires_at: newExpiry } : prev))
    fetchRecords()
  }

  const emptyTitle =
    debouncedSearch || status !== 'all'
      ? 'No subscriptions match'
      : 'No subscriptions yet'
  const emptyDescription = debouncedSearch
    ? `No results for "${debouncedSearch}". Try a different search.`
    : status === 'expiring'
      ? `Nothing expiring in the next ${windowDays} days.`
      : status === 'expired'
        ? 'No expired subscriptions.'
        : 'Purchases will appear here once users buy access.'

  const topBar = (
    <div className="px-4 sm:px-5 py-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-sm font-semibold text-slate-900">Subscriptions</h1>
          <p className="text-xs text-slate-400">Track expiry and extend package validity</p>
        </div>
        <span className="text-xs text-slate-400 shrink-0">{totalCount} records</span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-50 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 h-8 text-sm"
            placeholder="Search by user or package…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 shrink-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={cn(
                'h-7 px-3 rounded-md text-xs font-medium transition-colors',
                status === tab.value
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as SubscriptionTypeFilter)}
          className="h-8 rounded-md border border-slate-200 bg-slate-50/60 px-2 text-xs text-slate-600 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {status === 'expiring' && (
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="h-8 rounded-md border border-slate-200 bg-slate-50/60 px-2 text-xs text-slate-600 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0"
          >
            {WINDOW_OPTIONS.map((w) => (
              <option key={w} value={w}>
                Next {w} days
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )

  const list = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading && records.length === 0 ? (
          <div className="py-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5">
                <div className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-1/3 rounded bg-slate-100 animate-pulse" />
                  <div className="h-2.5 w-1/4 rounded bg-slate-100 animate-pulse" />
                </div>
                <div className="h-5 w-20 rounded bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : records.length > 0 ? (
          <div className="py-1.5">
            {records.map((record) => (
              <SubscriptionRow
                key={record.purchase_id}
                record={record}
                selected={selected?.purchase_id === record.purchase_id}
                onSelect={() => setSelected(record)}
              />
            ))}
          </div>
        ) : (
          <ExplorerEmptyState icon={CalendarX2} title={emptyTitle} description={emptyDescription} />
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7 border-slate-200"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7 border-slate-200"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  const detailPanel = selected ? (
    <ExtendValidityPanel
      key={selected.purchase_id}
      record={selected}
      canExtend={canExtend}
      onClose={() => setSelected(null)}
      onExtended={handleExtended}
    />
  ) : (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <CalendarClock className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-700 mb-1">No subscription selected</h3>
      <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
        Select a subscription from the list to view details and extend its validity.
      </p>
    </div>
  )

  return (
    <>
      <ExplorerLayout topBar={topBar} detailPanel={detailPanel}>
        {list}
      </ExplorerLayout>

      {/* Mobile: docked panel is hidden < lg, so show the editor in a dialog. */}
      <Dialog
        open={!!selected && !isDesktop}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="p-0 gap-0 overflow-hidden sm:max-w-md">
          <DialogTitle className="sr-only">Extend validity</DialogTitle>
          {selected && (
            <div className="h-[70vh]">
              <ExtendValidityPanel
                key={`dlg-${selected.purchase_id}`}
                record={selected}
                canExtend={canExtend}
                onClose={() => setSelected(null)}
                onExtended={handleExtended}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
