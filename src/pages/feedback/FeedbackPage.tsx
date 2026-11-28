import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { DateRangeFilter, rangeFromParams, rangeToParams } from '@/components/common/DateRangeFilter'
import { Stat } from '@/components/common/detail'
import { formatCount } from '@/lib/format'
import { cn } from '@/lib/utils'
import { feedbackService, type FeedbackScope } from '@/services/feedback.service'
import { Change, Hint } from './components/figures'
import { useFilterOptions } from './components/filters'
import { FeedbackInbox } from './FeedbackInbox'
import { ByFacultyView, ByVideoView } from './FeedbackGroups'
import { patchParams, useRemote } from './remote'
import { average, plural } from './lib'

const VIEWS = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'faculty', label: 'By faculty' },
  { id: 'video', label: 'By video' },
] as const

/** Student feedback on videos: what needs attention, who handles it, and how each lecturer and video is doing. */
export function FeedbackPage() {
  const [params, setParams] = useSearchParams()
  const view = VIEWS.find((v) => v.id === params.get('view'))?.id ?? 'inbox'
  const range = rangeFromParams(params, 'all')
  const options = useFilterOptions()

  const scope: FeedbackScope = {
    faculty_id: params.get('faculty') || undefined,
    subject_id: params.get('subject') || undefined,
    package_id: params.get('package') || undefined,
    series_id: view === 'video' ? params.get('series') || undefined : undefined,
    module_id: view === 'video' ? params.get('module') || undefined : undefined,
    from: range.from || undefined,
    to: range.to || undefined,
  }
  const scopeKey = JSON.stringify(scope)
  const { data: s, loading, error } = useRemote(`summary:${scopeKey}`, () => feedbackService.summary(scope))

  const update = (patch: Record<string, string | null>) => setParams(patchParams(params, patch), { replace: true })
  /** The same page with the scope kept and the list narrowed to what the number counts. */
  const listHref = (patch: Record<string, string>) => {
    const next = new URLSearchParams()
    for (const key of ['faculty', 'subject', 'package', 'range', 'from', 'to']) {
      const v = params.get(key)
      if (v) next.set(key, v)
    }
    for (const [k, v] of Object.entries(patch)) next.set(k, v)
    return `/feedback?${next.toString()}`
  }
  const first = loading && !s
  const failed = !!error && !s

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback"
        description="What students say about the videos, and what the team does about it"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Feedback' }]}
        action={<DateRangeFilter value={range} onChange={(r) => setParams(rangeToParams(r, patchParams(params, {})), { replace: true })} align="end" className="w-full sm:w-auto" />}
      />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Average rating" loading={first} value={failed ? 'Not loaded' : average(s?.average)} href={listHref({ view: 'faculty', sort: 'lowest' })}
          hint={s ? <Hint text={plural(s.rating_count, 'rating')} change={s.change && <Change value={s.change.average} />} /> : null} />
        <Stat label="Low ratings (1 or 2 stars)" loading={first} value={failed ? 'Not loaded' : formatCount(s?.low_count ?? 0)} href={listHref({ status: 'all', rating: '1,2' })}
          hint={s ? <Hint text={s.rating_count ? `${Math.round((s.low_count / s.rating_count) * 100)}% of ratings` : 'No ratings yet'} change={s.change && <Change value={s.change.low_count} goodWhenUp={false} />} /> : null} />
        <Stat label="Open" loading={first} value={failed ? 'Not loaded' : formatCount(s?.open_count ?? 0)} href={listHref({ status: 'open' })}
          hint={s ? `${formatCount(s.unassigned_count)} not assigned` : null} />
        <Stat label="Overdue" loading={first} value={failed ? 'Not loaded' : formatCount(s?.overdue_count ?? 0)} href={listHref({ status: 'all', overdue: 'true' })}
          hint={s ? (s.overdue_count ? 'Past the planned date' : 'Nothing is late') : null} />
      </section>

      <div role="tablist" aria-label="Feedback views" className="flex gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain shadow-[inset_0_-1px_0_hsl(var(--border))]">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            id={`tab-${v.id}`}
            aria-selected={view === v.id}
            aria-controls="feedback-panel"
            tabIndex={view === v.id ? 0 : -1}
            onClick={() => setParams(patchParams(params, { view: v.id === 'inbox' ? null : v.id, sort: null, q: null }))}
            onKeyDown={(e) => {
              const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
              if (!step) return
              e.preventDefault()
              const next = VIEWS[(VIEWS.findIndex((x) => x.id === view) + step + VIEWS.length) % VIEWS.length]
              setParams(patchParams(params, { view: next.id === 'inbox' ? null : next.id, sort: null, q: null }), { replace: true })
              document.getElementById(`tab-${next.id}`)?.focus()
            }}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              view === v.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="feedback-panel" aria-labelledby={`tab-${view}`}>
        {view === 'inbox' && <FeedbackInbox params={params} setParams={setParams} update={update} scope={scope} options={options} />}
        {view === 'faculty' && <ByFacultyView params={params} setParams={setParams} update={update} scope={scope} options={options} />}
        {view === 'video' && <ByVideoView params={params} setParams={setParams} update={update} scope={scope} options={options} />}
      </div>
    </div>
  )
}
