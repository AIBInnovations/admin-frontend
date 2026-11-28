import { Link, useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/common/detail'
import { Delta } from '@/components/charts/Delta'
import { formatCount, istDayTime, percent } from '@/components/charts/format'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import type { VideoRow, VideoSort } from '@/services/videoAnalytics.service'
import { STATUS, ago, pathOf, rating, shortTime, watchTime } from './videoFormat'

export interface SortState { vsort: VideoSort; dir: 'asc' | 'desc' }

interface Column {
  key: string
  header: string
  /** The second header line: which period the number is for. */
  basis?: string
  sort?: VideoSort
  right?: boolean
  cell: (r: VideoRow) => React.ReactNode
  className?: string
}

interface Props {
  rows: VideoRow[]
  sort: SortState
  onSort: (s: SortState) => void
  /** Where a row opens (the video's own numbers). */
  rowHref: (r: VideoRow) => string
  /** "Past month", "All time" or a date span: what Views, viewers and ratings cover. */
  rangeWord: string
  compare: boolean
  refreshing?: boolean
  pagination: { page: number; limit: number; total: number; totalPages: number }
  onPage: (page: number) => void
}

/**
 * Every video of the scope, a page at a time. Sorting happens on the server, so
 * "least watched" is right across the whole package, not just this page. The
 * whole row opens the video; the title is the real link (keyboard, new tab).
 */
export function VideoUsageTable({ rows, sort, onSort, rowHref, rangeWord, compare, refreshing, pagination, onPage }: Props) {
  const navigate = useNavigate()
  const wide = useMediaQuery('(min-width: 768px)')
  const title = (r: VideoRow) => (
    <span className="flex min-w-0 items-center gap-2">
      <Link to={rowHref(r)} className="min-w-0 truncate rounded-sm font-medium hover:text-primary" title={r.title}>{r.title}</Link>
      {r.status !== 'live' && <StatusPill tone={STATUS[r.status].tone} className="h-5 shrink-0 px-2 text-[11px]"><span title={STATUS[r.status].hint}>{STATUS[r.status].label}</span></StatusPill>}
    </span>
  )
  const columns: Column[] = [
    ...(wide
      ? [
          { key: 'series', header: 'Series', sort: 'order' as const, cell: (r: VideoRow) => <span className="block max-w-[180px] truncate" title={r.series_name ?? 'Deleted series'}>{r.series_name ?? 'Deleted series'}</span> },
          { key: 'module', header: 'Module', sort: 'order' as const, cell: (r: VideoRow) => <span className="block max-w-[190px] truncate text-muted-foreground" title={r.module_name ?? 'Deleted module'}>{r.module_name ?? 'Deleted module'}</span> },
          { key: 'video', header: 'Video', sort: 'title' as const, cell: (r: VideoRow) => <span className="block max-w-[340px]">{title(r)}</span>, className: 'sticky left-0 z-[1]' },
        ]
      : [{
          key: 'video', header: 'Video', sort: 'title' as const, className: 'sticky left-0 z-[1]',
          cell: (r: VideoRow) => <span className="block max-w-[58vw]">{title(r)}<span className="block truncate text-xs text-muted-foreground">{pathOf(r)}</span></span>,
        }]),
    {
      key: 'views', header: 'Views', basis: rangeWord, sort: 'views', right: true,
      cell: (r) => (
        <span className="inline-flex items-baseline justify-end gap-1.5">
          <span className={cn(r.views === 0 && 'text-muted-foreground')}>{formatCount(r.views)}</span>
          {compare && r.previous_views !== null && (r.views > 0 || r.previous_views > 0) && <Delta now={r.views} before={r.previous_views} className="text-[11px]" />}
        </span>
      ),
    },
    { key: 'viewers', header: 'Unique viewers', basis: rangeWord, sort: 'viewers', right: true, cell: (r) => <span className={cn(r.viewers === 0 && 'text-muted-foreground')}>{formatCount(r.viewers)}</span> },
    { key: 'watch', header: 'Watch time', basis: 'All time', sort: 'watch', right: true, cell: (r) => watchTime(r.watch_seconds) },
    { key: 'avg', header: 'Per viewer', basis: 'All time, average', sort: 'avg_watch', right: true, cell: (r) => <span title={r.duration_seconds ? `Video length ${shortTime(r.duration_seconds)}` : undefined}>{shortTime(r.avg_watch_seconds)}</span> },
    { key: 'completion', header: 'Completion', basis: 'Now, average', sort: 'completion', right: true, cell: (r) => (r.completion === null ? <span className="text-muted-foreground" title="Nobody has started it">—</span> : percent(r.completion)) },
    { key: 'completed', header: 'Finished', basis: 'Now', sort: 'completed', right: true, cell: (r) => <span title={`${formatCount(r.completed)} of ${formatCount(r.started)} who started`}>{formatCount(r.completed)}</span> },
    { key: 'rating', header: 'Rating', basis: `${rangeWord}, average`, sort: 'rating', right: true, cell: (r) => <span className={cn(r.rating !== null && r.rating < 3 && 'font-medium text-danger', r.rating === null && 'text-muted-foreground')}>{rating(r.rating)}</span> },
    { key: 'ratings', header: 'Ratings', basis: rangeWord, sort: 'ratings', right: true, cell: (r) => formatCount(r.ratings) },
    { key: 'last', header: 'Last watched', basis: 'Any time', sort: 'last', right: true, cell: (r) => (r.last_watched_at ? <span title={istDayTime(r.last_watched_at)}>{ago(r.last_watched_at) ?? istDayTime(r.last_watched_at)}</span> : <span className="text-muted-foreground">Never</span>) },
  ]

  const header = (c: Column) => {
    const on = !!c.sort && sort.vsort === c.sort
    const Icon = on ? (sort.dir === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown
    const label = (
      <span className={cn('flex flex-col', c.right ? 'items-end' : 'items-start')}>
        <span className="inline-flex items-center gap-1">{c.header}{c.sort && <Icon aria-hidden="true" className={cn('h-3 w-3', !on && 'opacity-40')} />}</span>
        {c.basis && <span className="text-[11px] font-normal text-muted-foreground/80">{c.basis}</span>}
      </span>
    )
    if (!c.sort) return label
    // Numbers open on "most first"; text and course order open A to Z
    const first: 'asc' | 'desc' = c.right ? 'desc' : 'asc'
    return (
      <button type="button" onClick={() => onSort({ vsort: c.sort!, dir: on ? (sort.dir === 'desc' ? 'asc' : 'desc') : first })} className={cn('-mx-1 rounded px-1 py-0.5 hover:text-foreground', on && 'text-foreground', c.right && 'ml-auto')}>
        {label}<span className="sr-only">{on ? `, sorted ${sort.dir === 'desc' ? 'high to low' : 'low to high'}` : ', sort'}</span>
      </button>
    )
  }

  const { page, limit, total, totalPages } = pagination
  const first = total ? (page - 1) * limit + 1 : 0
  const last = Math.min(total, page * limit)
  return (
    <>
      <div className={cn('report-table pg-scroll-x relative overflow-x-auto transition-opacity duration-150', refreshing && 'opacity-60')} aria-busy={refreshing || undefined} role="region" aria-label="Videos" tabIndex={0}>
        <table className="w-full text-sm">
          <caption className="sr-only">Videos, with views, viewers, watch time, completion and ratings</caption>
          <thead>
            <tr className="border-y border-border bg-muted/40">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={c.sort && sort.vsort === c.sort ? (sort.dir === 'desc' ? 'descending' : 'ascending') : undefined}
                  className={cn('h-12 whitespace-nowrap px-4 text-[13px] font-medium text-muted-foreground', c.right ? 'text-right' : 'text-left', c.className, c.className && 'bg-[color-mix(in_srgb,hsl(var(--muted))_40%,hsl(var(--card)))]')}
                >
                  {header(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const href = rowHref(r)
              return (
                <tr
                  key={r.video_id}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('a, button')) return
                    if (window.getSelection()?.toString()) return
                    if (e.metaKey || e.ctrlKey) window.open(href, '_blank', 'noopener')
                    else navigate(href)
                  }}
                  className="group cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-accent/50"
                >
                  {columns.map((c) => (
                    c.key === 'video'
                      ? <th key={c.key} scope="row" className={cn('px-4 py-2.5 text-left align-middle font-normal', c.className, 'bg-card group-hover:bg-[color-mix(in_srgb,hsl(var(--accent))_50%,hsl(var(--card)))]')}>{c.cell(r)}</th>
                      : <td key={c.key} className={cn('whitespace-nowrap px-4 py-2.5 align-middle', c.right && 'text-right tabular-nums')}>{c.cell(r)}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3 text-[13px] text-muted-foreground">
        <span aria-live="polite">{total ? `${formatCount(first)} to ${formatCount(last)} of ${formatCount(total)} videos` : 'No videos'}</span>
        {totalPages > 1 && (
          <span className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" />Previous</Button>
            <span className="tabular-nums">Page {page} of {totalPages}</span>
            <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">Next<ChevronRight className="h-4 w-4" /></Button>
          </span>
        )}
      </div>
    </>
  )
}
