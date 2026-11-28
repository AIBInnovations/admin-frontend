import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing, CalendarClock, CalendarX2, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useAuth } from '@/contexts/AuthContext'
import { ErrorState, apiErrorMessage } from '@/components/common/detail'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { formatExpiry } from '@/lib/relativeTime'
import { useListUrl } from '@/pages/commerce/components/useListUrl'
import {
  subscriptionsService,
  type ReminderItem,
  type SubscriptionRecord,
  type SubscriptionStatusFilter,
  type SubscriptionTypeFilter,
} from '@/services/subscriptions.service'
import { ExtendValidityDrawer } from './components/ExtendValidityDrawer'
import { ExtendValidityPanel } from './components/ExtendValidityPanel'
import { SubscriptionRow } from './components/SubscriptionRow'
import { ReminderPanel } from './components/ReminderPanel'
import { ReminderDrawer } from './components/ReminderDrawer'

const STATUS_TABS: { value: SubscriptionStatusFilter; label: string }[] = [
  { value: 'expiring', label: 'Expiring soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'all', label: 'All' },
]

const TYPE_OPTIONS: { value: SubscriptionTypeFilter; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'package', label: 'Packages' },
  { value: 'session', label: 'Sessions' },
  { value: 'workshop', label: 'Workshops' },
  { value: 'ebook', label: 'eBooks' },
  { value: 'form', label: 'Forms' },
]

const WINDOW_OPTIONS = [7, 30, 90]
const PAGE_SIZE = 20

const selectClass = 'h-9 shrink-0 rounded-md border border-input bg-card px-2.5 text-sm text-foreground'

/** Packages, live sessions and workshops that have not ended get expiry reminders. */
const canGetReminder = (r: SubscriptionRecord) => (r.type === 'package' || r.type === 'session' || r.type === 'workshop')
  && !!r.expires_at && formatExpiry(r.expires_at).status !== 'expired' && !r.renewed && r.is_active !== false
const keyOf = (r: { type: string; purchase_id: string }) => `${r.type}:${r.purchase_id}`
const itemOf = (r: SubscriptionRecord): ReminderItem => ({ type: r.type as ReminderItem['type'], purchase_id: r.purchase_id })

export function SubscriptionsPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canExtend = hasPermission('users.update')
  const canRemind = hasPermission('users.update')
  const url = useListUrl()
  const { params, page, setPage, update, search } = url

  const status = (STATUS_TABS.find((t) => t.value === params.get('status'))?.value ?? 'expiring') as SubscriptionStatusFilter
  const type = (TYPE_OPTIONS.find((t) => t.value === params.get('type'))?.value ?? 'all') as SubscriptionTypeFilter
  const windowDays = WINDOW_OPTIONS.includes(Number(params.get('window'))) ? Number(params.get('window')) : 30
  // Testers' INR 1 orders: hidden by default, like the Purchases list (27 Nov 2026)
  const showTest = params.get('test') === 'include'

  const [records, setRecords] = useState<SubscriptionRecord[] | null>(null)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<SubscriptionRecord | null>(null)
  // "Send reminder now": the rows ticked for it, and the ones the panel is open for
  const [picked, setPicked] = useState<Map<string, SubscriptionRecord>>(new Map())
  const [remind, setRemind] = useState<ReminderItem[] | null>(null)
  // Wide screens have room for the panel beside the list; below that it slides in.
  const wide = useMediaQuery('(min-width: 1024px)')
  const { nextFetchId, isStale } = useLatestFetch()

  const load = useCallback(async () => {
    const id = nextFetchId()
    setLoading(true)
    try {
      const response = await subscriptionsService.getExpiring({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status,
        type,
        all_types: 1,
        test: showTest ? 'include' : undefined,
        window_days: status === 'expiring' ? windowDays : undefined,
        // Most-recently expired first on the Expired tab; nearest upcoming first otherwise.
        sort: status === 'expired' ? 'expires_at:desc' : 'expires_at:asc',
      })
      if (isStale(id)) return
      const entities = response.data?.entities || []
      const last = response.data?.pagination?.totalPages || 0
      if (page > 1 && last > 0 && page > last) { setPage(last); return }
      setRecords(entities)
      setPages(Math.max(1, last))
      setTotal(response.data?.pagination?.total || 0)
      setError(null)
      // Keep the open panel in sync with freshly fetched data.
      setSelected((prev) => (prev ? entities.find((e) => e.purchase_id === prev.purchase_id) || prev : prev))
    } catch (e) {
      if (!isStale(id)) setError(apiErrorMessage(e, 'The subscriptions could not be loaded.'))
    } finally {
      if (!isStale(id)) setLoading(false)
    }
  }, [page, search, status, type, windowDays, showTest, setPage, nextFetchId, isStale])

  useEffect(() => { load() }, [load])

  // A different list (search, tab, type, window) starts with nothing ticked
  const listKey = `${search}|${status}|${type}|${windowDays}|${showTest}`
  useEffect(() => { setPicked(new Map()) }, [listKey])

  const openRemind = (items: ReminderItem[]) => { setSelected(null); setRemind(items) }
  const openExtend = (r: SubscriptionRecord) => { setRemind(null); setSelected(r) }
  const toggle = (r: SubscriptionRecord, on: boolean) => setPicked((prev) => {
    const next = new Map(prev)
    if (on) next.set(keyOf(r), r); else next.delete(keyOf(r))
    return next
  })
  const remindable = (records ?? []).filter(canGetReminder)
  const allOnPage = remindable.length > 0 && remindable.every((r) => picked.has(keyOf(r)))
  const someOnPage = remindable.some((r) => picked.has(keyOf(r)))
  const tickPage = (on: boolean) => setPicked((prev) => {
    const next = new Map(prev)
    for (const r of remindable) { if (on) next.set(keyOf(r), r); else next.delete(keyOf(r)) }
    return next
  })
  const onSent = () => { setPicked(new Map()); void load() }

  const onExtended = (newExpiry: string) => {
    setSelected((prev) => (prev ? { ...prev, expires_at: newExpiry } : prev))
    load()
  }

  const filtered = !!search || status !== 'expiring' || type !== 'all' || windowDays !== 30 || showTest
  const open = (r: SubscriptionRecord) => navigate(`/commerce/purchases/${r.type}/${r.purchase_id}`, {
    state: { back: { label: 'Subscriptions', href: `/users/subscriptions${params.toString() ? `?${params}` : ''}` } },
  })

  const emptyDescription = search
    ? `No results for "${search}". Try a different search.`
    : status === 'expiring'
      ? `Nothing expiring in the next ${windowDays} days.`
      : status === 'expired'
        ? 'No expired subscriptions.'
        : 'Purchases will appear here once users buy access.'

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="rounded-xl border border-border bg-card px-4 py-4 shadow-card sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div>
            <h1 className="font-display text-[22px] font-semibold leading-tight tracking-[-0.015em] sm:text-[26px]">Subscriptions</h1>
            <p className="mt-1 text-sm text-muted-foreground">Track expiry and extend package validity</p>
          </div>
          <span aria-live="polite" className="text-sm tabular-nums text-muted-foreground">{total.toLocaleString('en-IN')} record{total === 1 ? '' : 's'}</span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 bg-card pl-9"
              placeholder="Search by user or package"
              aria-label="Search by user or package"
              value={url.searchInput}
              onChange={(e) => url.setSearchInput(e.target.value)}
            />
          </div>

          <div role="group" aria-label="Show" className="flex shrink-0 items-center gap-1 rounded-lg bg-muted p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                aria-pressed={status === tab.value}
                onClick={() => update({ status: tab.value === 'expiring' ? null : tab.value })}
                className={cn('h-7 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors', status === tab.value ? 'bg-card text-primary shadow-card' : 'text-muted-foreground hover:text-foreground')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <select aria-label="Type" value={type} onChange={(e) => update({ type: e.target.value === 'all' ? null : e.target.value })} className={selectClass}>
            {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          {status === 'expiring' && (
            <select aria-label="Expiring within" value={windowDays} onChange={(e) => update({ window: e.target.value === '30' ? null : e.target.value })} className={selectClass}>
              {WINDOW_OPTIONS.map((w) => <option key={w} value={w}>Next {w} days</option>)}
            </select>
          )}

          <div className="flex shrink-0 items-center gap-2">
            <Switch id="subs-hide-test" checked={!showTest} onCheckedChange={(hide) => update({ test: hide ? null : 'include' })} />
            <label htmlFor="subs-hide-test" className="whitespace-nowrap text-sm">Hide test orders</label>
          </div>

          {filtered && <Button variant="ghost" size="sm" className="h-9 text-sm" onClick={() => { url.setSearchInput(''); url.replaceAll(new URLSearchParams()) }}>Clear filters</Button>}
          {search && <span className="text-xs text-muted-foreground">Searching all subscriptions</span>}
        </div>
      </div>

      {error && records && (
        <p role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {error} Showing what was loaded before.
          <Button size="sm" variant="outline" onClick={load}>Try again</Button>
        </p>
      )}

      <div className="flex min-h-0 flex-1 gap-4">
        <section aria-label="Subscriptions" aria-busy={loading} className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card">
          {canRemind && records && remindable.length > 0 && (
            <div className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-5 py-2">
              <span className="flex items-center gap-2">
                <Checkbox
                  id="subs-pick-page"
                  checked={allOnPage ? true : someOnPage ? 'indeterminate' : false}
                  onCheckedChange={(v) => tickPage(v === true)}
                  aria-label="Choose every subscription on this page that can get a reminder"
                />
                <label htmlFor="subs-pick-page" className="text-[13px] text-muted-foreground">{picked.size > 0 ? `${picked.size.toLocaleString('en-IN')} chosen` : 'Choose to remind several'}</label>
              </span>
              {picked.size > 0 && (
                <span className="flex flex-wrap items-center gap-2 sm:ml-auto">
                  <Button size="sm" onClick={() => openRemind([...picked.values()].map(itemOf))}>
                    <BellRing aria-hidden="true" />Send reminder now
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPicked(new Map())}><X aria-hidden="true" />Clear</Button>
                </span>
              )}
            </div>
          )}
          {!records && loading ? (
            <div role="status" aria-label="Loading subscriptions" className="space-y-1 py-3">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-1/4" /></div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              ))}
            </div>
          ) : !records ? (
            <div className="p-4"><ErrorState message={error || undefined} onRetry={load} /></div>
          ) : records.length > 0 ? (
            <div className={cn('py-1.5 transition-opacity duration-150', loading && 'opacity-60')}>
              {records.map((record) => (
                <SubscriptionRow
                  key={`${record.type}-${record.purchase_id}`}
                  record={record}
                  selected={selected?.purchase_id === record.purchase_id || (remind?.length === 1 && remind[0].purchase_id === record.purchase_id)}
                  onOpen={() => open(record)}
                  onExtend={canExtend && record.extendable ? () => openExtend(record) : undefined}
                  onRemind={canRemind && canGetReminder(record) ? () => openRemind([itemOf(record)]) : undefined}
                  checked={picked.has(keyOf(record))}
                  onCheckedChange={canRemind && canGetReminder(record) ? (on) => toggle(record, on) : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="px-4">
              <EmptyState
                icon={CalendarX2}
                title={filtered ? 'No subscriptions match' : 'No subscriptions yet'}
                description={emptyDescription}
                action={filtered ? <Button variant="outline" size="sm" onClick={() => { url.setSearchInput(''); url.replaceAll(new URLSearchParams()) }}>Clear filters</Button> : undefined}
              />
            </div>
          )}

          {pages > 1 && records && records.length > 0 && (
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-sm text-muted-foreground">
              <span>Page {page} of {pages}</span>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft aria-hidden="true" /></Button>
                <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight aria-hidden="true" /></Button>
              </div>
            </div>
          )}
        </section>

        {wide && (
          <aside aria-label={remind ? 'Send reminder now' : 'Extend validity'} className="sticky top-0 flex max-h-[calc(100dvh-7rem)] w-[380px] shrink-0 flex-col self-start overflow-hidden rounded-xl border border-border bg-card shadow-card xl:w-[420px]">
            {remind ? (
              <ReminderPanel key={remind.map((i) => i.purchase_id).join(',')} items={remind} canSend={canRemind} onClose={() => setRemind(null)} onSent={onSent} />
            ) : selected ? (
              <ExtendValidityPanel key={selected.purchase_id} record={selected} canExtend={canExtend} onClose={() => setSelected(null)} onExtended={onExtended} />
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-8 text-center">
                <CalendarClock aria-hidden="true" className="mb-3 h-7 w-7 text-muted-foreground" />
                <h2 className="text-sm font-semibold">No subscription selected</h2>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">Choose Extend on a subscription to change its validity here, or Remind to send its expiry reminder now (tick several to remind them together). Open a row for its full details.</p>
              </div>
            )}
          </aside>
        )}
      </div>

      {!wide && (
        <ExtendValidityDrawer record={selected} canExtend={canExtend} onClose={() => setSelected(null)} onExtended={onExtended} side="right" />
      )}
      {!wide && <ReminderDrawer items={remind} canSend={canRemind} onClose={() => setRemind(null)} onSent={onSent} />}
    </div>
  )
}
