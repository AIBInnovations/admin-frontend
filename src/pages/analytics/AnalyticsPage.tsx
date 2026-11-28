import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { cn } from '@/lib/utils'
import { FilterBar, ViewTools } from './components/FilterBar'
import { FeedbackTab } from './components/FeedbackTab'
import { OverviewTab } from './components/OverviewTab'
import { SalesTab } from './components/SalesTab'
import { StudentsTab } from './components/StudentsTab'
import { RetentionTab } from './components/RetentionTab'
import { RefundsTab } from './components/RefundsTab'
import { CompareTab } from './components/CompareTab'
import { VideosTab } from './components/VideosTab'
import { TAB_SCOPE, useAnalyticsState, type AnalyticsState } from './useAnalyticsState'

/**
 * The first four are the tabs this page has had; the rest are new. The
 * filters shown and `cross` (chart clicks filter it) come from TAB_SCOPE, the
 * same table each tab's reports are built from.
 */
const TABS = [
  { id: 'overview', name: 'Overview', ...TAB_SCOPE.overview, Panel: OverviewTab },
  { id: 'sales', name: 'Sales', ...TAB_SCOPE.sales, Panel: SalesTab },
  { id: 'students', name: 'Students', ...TAB_SCOPE.students, Panel: StudentsTab },
  { id: 'feedback', name: 'Feedback', ...TAB_SCOPE.feedback, Panel: FeedbackTab },
  { id: 'retention', name: 'Retention', ...TAB_SCOPE.retention, Panel: RetentionTab },
  { id: 'refunds', name: 'Refunds', ...TAB_SCOPE.refunds, Panel: RefundsTab },
  { id: 'compare', name: 'Compare', ...TAB_SCOPE.compare, Panel: CompareTab },
  // Round 7: per package, which videos are watched, finished and rated, and who watches
  { id: 'videos', name: 'Videos', ...TAB_SCOPE.videos, Panel: VideosTab },
]

function Tabs({ state, current }: { state: AnalyticsState; current: string }) {
  // A video opened on the Videos tab closes when another tab is chosen
  const go = (id: string) => state.update({ tab: id === 'overview' ? null : id, page: null, video: null }, { push: true })
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === current)
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    const t = TABS[(next + TABS.length) % TABS.length]
    go(t.id)
    document.getElementById(`tab-${t.id}`)?.focus()
  }
  // On a narrow screen the chosen tab may sit past the edge (Videos is last): bring it into the strip
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const list = listRef.current
    const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!list || !tab) return
    const left = tab.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft
    if (left < list.scrollLeft || left + tab.offsetWidth > list.scrollLeft + list.clientWidth) list.scrollLeft = Math.max(0, left - 16)
  }, [current])
  return (
    <div ref={listRef} role="tablist" aria-label="Analytics sections" onKeyDown={onKey} className="mb-3 flex gap-1 overflow-x-auto overscroll-x-contain border-b border-border [scrollbar-width:none]">
      {TABS.map((t) => (
        <button
          key={t.id}
          id={`tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={t.id === current}
          aria-controls="analytics-panel"
          tabIndex={t.id === current ? 0 : -1}
          onClick={() => go(t.id)}
          className={cn('-mb-px h-10 whitespace-nowrap border-b-2 border-transparent px-3 text-sm text-muted-foreground transition-colors hover:text-foreground sm:px-4', t.id === current && 'border-primary font-medium text-foreground')}
        >
          {t.name}
        </button>
      ))}
    </div>
  )
}

/**
 * An insight's "See why" lands on the block that proves it (#focus-<block>):
 * once the block exists, it scrolls into view and a sky ring pulses once.
 */
function useProofFocus() {
  const { hash, search } = useLocation()
  useEffect(() => {
    const id = hash.replace(/^#/, '')
    if (!id) return
    let tries = 0
    let timer = 0
    const find = () => document.getElementById(id.startsWith('focus-') ? id : `focus-${id}`) ?? document.getElementById(id)
    const tick = () => {
      const el = find()
      // Wait until the block has its content (no skeleton inside)
      if (el && !el.querySelector('[role="status"]')) {
        el.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
        el.classList.remove('chart-proof')
        void el.offsetWidth
        el.classList.add('chart-proof')
        timer = window.setTimeout(() => el.classList.remove('chart-proof'), 1700)
        return
      }
      if ((tries += 1) < 40) timer = window.setTimeout(tick, 150)
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [hash, search])
}

export function AnalyticsPage() {
  const state = useAnalyticsState('30d')
  const tab = TABS.find((t) => t.id === state.params.get('tab')) ?? TABS[0]
  useProofFocus()
  return (
    <div className="pg-viz space-y-6">
      <PageHeader
        title="Analytics"
        description="Platform performance, user engagement, and content metrics"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Analytics' }]}
        action={<ViewTools state={state} name={`Analytics, ${tab.name}`} />}
      />
      <FilterBar state={state} show={tab.filters} cross={tab.cross}>
        <Tabs state={state} current={tab.id} />
      </FilterBar>
      <div id="analytics-panel" role="tabpanel" aria-labelledby={`tab-${tab.id}`}>
        <tab.Panel state={state} />
      </div>
    </div>
  )
}
