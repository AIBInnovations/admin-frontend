import { useEffect, useState } from 'react'
import { Download, Loader2, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTablePagination } from '@/components/common/DataTable'
import { apiErrorMessage } from '@/components/common/detail'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { feedbackService, type FeedbackCounts, type FeedbackListParams } from '@/services/feedback.service'
import { BulkBar } from './components/BulkBar'
import { FilterSelect, SearchField } from './components/filters'
import { ReviewList } from './components/ReviewList'
import { pageOf, patchParams, useRemote } from './remote'
import { plural, PRIORITY_LABEL, STATUS_LABEL, STATUSES } from './lib'
import type { ViewProps } from './FeedbackGroups'

const PAGE_SIZE = 20

const STATUS_TABS: { id: string; label: string; count: keyof FeedbackCounts }[] = [
  { id: '', label: 'Needs attention', count: 'attention' },
  { id: 'open', label: 'Open', count: 'open' },
  ...STATUSES.map((s) => ({ id: s as string, label: STATUS_LABEL[s], count: s as keyof FeedbackCounts })),
  { id: 'all', label: 'All', count: 'all' },
]
const RATINGS = [
  { value: '1,2', label: '1 or 2 stars' },
  { value: '1', label: '1 star' }, { value: '2', label: '2 stars' }, { value: '3', label: '3 stars' },
  { value: '4', label: '4 stars' }, { value: '5', label: '5 stars' }, { value: 'none', label: 'Comment without a rating' },
]
const SORTS = [
  { value: 'oldest', label: 'Oldest first' },
  { value: 'rating_low', label: 'Lowest rating first' },
  { value: 'rating_high', label: 'Highest rating first' },
  { value: 'due', label: 'Due soonest first' },
  { value: 'updated', label: 'Recently changed first' },
]
const FILTER_KEYS = ['q', 'rating', 'comment', 'faculty', 'subject', 'package', 'assigned', 'priority', 'overdue']

export function FeedbackInbox({ params, setParams, update, scope, options }: ViewProps) {
  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('videos.update')
  const page = pageOf(params)
  const status = STATUS_TABS.some((t) => t.id === params.get('status')) ? params.get('status')! : ''
  const [showFilters, setShowFilters] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const query: FeedbackListParams = {
    ...scope,
    search: params.get('q') || undefined,
    rating: RATINGS.some((r) => r.value === params.get('rating')) ? params.get('rating')! : undefined,
    has_comment: ['true', 'false'].includes(params.get('comment') || '') ? params.get('comment')! : undefined,
    assigned_to: params.get('assigned') || undefined,
    priority: params.get('priority') || undefined,
    overdue: params.get('overdue') === 'true' ? 'true' : undefined,
    status: status && status !== 'all' ? status : undefined,
    attention: status === '' ? 'true' : undefined,
    sort: SORTS.some((s) => s.value === params.get('sort')) ? params.get('sort')! : undefined,
  }
  const key = JSON.stringify(query)
  const { data, loading, error, refresh } = useRemote(`list:${page}:${key}`, () => feedbackService.list({ ...query, page, limit: PAGE_SIZE }))
  const reviews = data?.reviews ?? []
  const total = data?.pagination.total ?? 0
  const totalPages = data?.pagination.totalPages ?? 1
  const active = FILTER_KEYS.filter((k) => params.get(k)).length + (scope.from ? 1 : 0)

  useEffect(() => { setSelected(new Set()) }, [key, page])
  // The last row of the last page went away: step back
  useEffect(() => {
    if (!loading && data && data.reviews.length === 0 && total > 0 && page > totalPages) {
      setParams(patchParams(params, { page: totalPages > 1 ? String(totalPages) : null }, true), { replace: true })
    }
  }, [loading, data, total, page, totalPages, params, setParams])

  const clearFilters = () => {
    const next = new URLSearchParams(params)
    for (const k of [...FILTER_KEYS, 'range', 'from', 'to', 'page', 'sort']) next.delete(k)
    setParams(next, { replace: true })
  }
  const exportCsv = async () => {
    setExporting(true)
    try {
      const { filename } = await feedbackService.exportCsv(query)
      toast.success(`Exported ${plural(total, 'review')} to ${filename}`)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'The export could not be made. Please try again.'))
    } finally {
      setExporting(false)
    }
  }

  const pageIds = reviews.map((r) => r._id)
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const packages = options.packages.filter((p) => !scope.subject_id || p.subject === scope.subject_id)

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-1" role="group" aria-label="Status">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id || 'attention'}
            type="button"
            aria-pressed={status === t.id}
            onClick={() => update({ status: t.id || null })}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
              status === t.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary/40',
            )}
          >
            {t.label}
            {data && <span className={cn('tabular-nums', status === t.id ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{formatCount(data.counts[t.count])}</span>}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <SearchField value={params.get('q') || ''} onChange={(v) => update({ q: v || null })} label="Search comment, video or student" className="min-w-0 flex-1 sm:max-w-sm" />
          <Button type="button" variant="outline" className="bg-card sm:hidden" aria-expanded={showFilters} aria-controls="feedback-filters" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />Filters{active > 0 && ` (${active})`}
          </Button>
          <Button type="button" variant="outline" className="ml-auto hidden bg-card sm:inline-flex" onClick={exportCsv} disabled={exporting || !total}>
            {exporting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4" />}Export CSV
          </Button>
        </div>
        <div id="feedback-filters" className={cn('grid-cols-1 gap-2 sm:flex sm:min-h-20 sm:flex-wrap sm:content-start', showFilters ? 'grid' : 'hidden')}>
          <FilterSelect label="Rating" anyLabel="Any rating" value={query.rating || ''} options={RATINGS} onChange={(v) => update({ rating: v })} />
          <FilterSelect label="Comment" anyLabel="With or without comment" value={query.has_comment || ''} options={[{ value: 'true', label: 'With a comment' }, { value: 'false', label: 'Without a comment' }]} onChange={(v) => update({ comment: v })} />
          {options.faculty.length > 0 && <FilterSelect label="Faculty" anyLabel="Any faculty" searchable value={scope.faculty_id || ''} options={options.faculty} onChange={(v) => update({ faculty: v })} />}
          {options.subjects.length > 0 && <FilterSelect label="Subject" anyLabel="Any subject" searchable value={scope.subject_id || ''} options={options.subjects} onChange={(v) => update({ subject: v, package: null })} />}
          {options.packages.length > 0 && <FilterSelect label="Package" anyLabel="Any package" searchable value={scope.package_id || ''} options={packages} onChange={(v) => update({ package: v })} />}
          <FilterSelect label="Assigned to" anyLabel="Assigned to anyone" searchable value={query.assigned_to || ''}
            options={[{ value: 'me', label: 'Me' }, { value: 'none', label: 'Not assigned' }, ...options.assignees.filter((a) => !a.is_me).map((a) => ({ value: a._id, label: a.name }))]}
            onChange={(v) => update({ assigned: v })} />
          <FilterSelect label="Priority" anyLabel="Any priority" value={query.priority || ''} options={(['high', 'normal', 'low'] as const).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} onChange={(v) => update({ priority: v })} />
          <FilterSelect label="Due" anyLabel="Any due date" value={query.overdue || ''} options={[{ value: 'true', label: 'Overdue only' }]} onChange={(v) => update({ overdue: v })} />
          <FilterSelect label="Sort" anyLabel="Newest first" value={query.sort || ''} options={SORTS} onChange={(v) => update({ sort: v })} />
          {active > 0 && <Button type="button" variant="ghost" onClick={clearFilters}>Clear filters</Button>}
          <Button type="button" variant="outline" className="bg-card sm:hidden" onClick={exportCsv} disabled={exporting || !total}>
            {exporting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4" />}Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="flex min-h-11 items-center gap-3 border-b border-border px-5 py-2 text-[13px] text-muted-foreground">
          {canUpdate && pageIds.length > 0 && (
            <label className="flex items-center gap-3">
              <Checkbox checked={allOnPage} onCheckedChange={(v) => setSelected(v === true ? new Set(pageIds) : new Set())} aria-label="Select every review on this page" />
            </label>
          )}
          <span aria-live="polite">
            {data ? (selected.size > 0 ? `${plural(selected.size, 'review')} selected` : plural(total, 'review')) : 'Loading'}
          </span>
        </div>
        <ReviewList
          reviews={reviews}
          loading={loading}
          error={error?.message}
          onRetry={refresh}
          selected={canUpdate ? selected : undefined}
          onSelect={canUpdate ? (id, on) => setSelected((prev) => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next }) : undefined}
          empty={active > 0
            ? { title: 'No reviews match these filters', action: <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button> }
            : status === ''
              ? { title: 'Nothing needs attention', description: 'Reviews with 1 or 2 stars, and comments that are not praise, wait here until someone resolves or dismisses them.', action: <Button variant="outline" size="sm" onClick={() => update({ status: 'all' })}>Show all reviews</Button> }
              : { title: status === 'all' ? 'No reviews yet' : 'No reviews here', description: status === 'all' ? 'Reviews appear here when students rate or comment on a video.' : undefined }}
        />
      </div>

      <DataTablePagination currentPage={page} totalPages={totalPages} totalCount={total} onPageChange={(p) => setParams(patchParams(params, { page: p > 1 ? String(p) : null }, true))} />

      {canUpdate && selected.size > 0 && (
        <BulkBar ids={[...selected]} assignees={options.assignees} onDone={() => { setSelected(new Set()); refresh() }} onClear={() => setSelected(new Set())} />
      )}
    </div>
  )
}
