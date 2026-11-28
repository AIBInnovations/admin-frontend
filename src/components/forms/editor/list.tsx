import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MoreVertical, RotateCw, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable, type ColumnDef } from '@/components/common/DataTable'
import { StatusPill, type Tone } from '@/components/common/detail'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/services/api.service'
import type { ListResponse } from '@/types/api.types'
import { plainError } from './EditorPage'
import { Note } from './fields'

// ── State in the URL ─────────────────────────────────────────────────────
const MIN_SEARCH = 3

/**
 * Search, filters and page live in the URL, so Back, refresh and a shared link
 * all show the same list. `filters` maps each URL key to its "no filter" value.
 */
export function useListState<K extends string>(filters: Record<K, string>) {
  const [params, setParams] = useSearchParams()
  const query = params.get('search') ?? ''
  const [search, setSearch] = useState(query)
  const written = useRef(query)

  // Back or a link changed the search: show it in the box.
  useEffect(() => {
    if (query === written.current) return
    written.current = query
    setSearch(query)
  }, [query])

  // Typing: wait, then put it in the URL without adding a history entry per letter.
  useEffect(() => {
    const trimmed = search.trim()
    const next = trimmed.length >= MIN_SEARCH ? trimmed : ''
    if (next === written.current) return
    const timer = setTimeout(() => {
      written.current = next
      setParams((prev) => {
        const p = new URLSearchParams(prev)
        if (next) p.set('search', next)
        else p.delete('search')
        p.delete('page')
        return p
      }, { replace: true })
    }, 400)
    return () => clearTimeout(timer)
  }, [search, setParams])

  const values = Object.fromEntries((Object.keys(filters) as K[]).map((k) => [k, params.get(k) ?? filters[k]])) as Record<K, string>
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)

  const setFilters = (next: Partial<Record<K, string>>) => setParams((prev) => {
    const p = new URLSearchParams(prev)
    for (const [k, v] of Object.entries(next) as [K, string][]) {
      if (!v || v === filters[k]) p.delete(k)
      else p.set(k, v)
    }
    p.delete('page')
    return p
  }, { replace: true })
  const setPage = useCallback((n: number) => setParams((prev) => {
    const p = new URLSearchParams(prev)
    if (n > 1) p.set('page', String(n))
    else p.delete('page')
    return p
  }, { replace: true }), [setParams])

  const filtered = !!query || (Object.keys(filters) as K[]).some((k) => values[k] !== filters[k])
  const clear = () => {
    written.current = ''
    setSearch('')
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      ;['search', 'page', ...Object.keys(filters)].forEach((k) => p.delete(k))
      return p
    }, { replace: true })
  }
  return { search, setSearch, query, values, setFilters, page, setPage, filtered, clear }
}

// ── Loading ──────────────────────────────────────────────────────────────
export interface RemoteList<T> {
  rows: T[]
  total: number
  totalPages: number
  loading: boolean
  error: string | null
  refresh: () => void
}

/**
 * Loads one page of a list whenever `key` changes. The newest request wins, a
 * failed refresh keeps the rows on screen, and a page that no longer exists
 * (its last row was deleted) steps back.
 */
export function useRemoteList<T>(key: string, load: () => Promise<ApiResponse<ListResponse<T>>>, page: number, setPage: (n: number) => void): RemoteList<T> {
  const [state, setState] = useState<{ rows: T[]; total: number; totalPages: number; key: string | null }>({ rows: [], total: 0, totalPages: 1, key: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const loadRef = useRef(load)
  loadRef.current = load
  const pageRef = useRef(page)
  pageRef.current = page
  const setPageRef = useRef(setPage)
  setPageRef.current = setPage

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    loadRef.current()
      .then((res) => {
        if (!alive) return
        if (!res.success || !res.data) { setError(res.message || 'The list could not be loaded.'); return }
        const rows = res.data.entities || []
        const totalPages = Math.max(1, res.data.pagination?.totalPages || 1)
        // The last row of the last page was deleted: step back
        if (rows.length === 0 && pageRef.current > 1) { setPageRef.current(Math.min(pageRef.current - 1, totalPages)); return }
        setState({ rows, total: res.data.pagination?.total ?? rows.length, totalPages, key })
      })
      .catch((e) => { if (alive) setError(plainError(e, 'The list could not be loaded. Please try again.')) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [key, tick])

  const refresh = useCallback(() => setTick((t) => t + 1), [])
  return { rows: state.rows, total: state.total, totalPages: state.totalPages, loading: loading && state.key !== key, error, refresh }
}

interface ListTableProps<T> {
  list: RemoteList<T>
  columns: ColumnDef<T>[]
  page: number
  onPage: (n: number) => void
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  empty: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }
  filtered: boolean
  filteredTitle: string
  onClear: () => void
}

/** The table with its loading, empty, no-match and error states. */
export function ListTable<T>({ list, columns, page, onPage, rowKey, onRowClick, empty, filtered, filteredTitle, onClear }: ListTableProps<T>) {
  return (
    <div className="space-y-4">
      {list.error && list.rows.length > 0 && (
        <Note tone="danger">
          {list.error} Showing the last results.{' '}
          <button type="button" className="inline-flex items-center gap-1 font-medium underline underline-offset-2" onClick={list.refresh}><RotateCw aria-hidden="true" className="h-3.5 w-3.5" />Try again</button>
        </Note>
      )}
      <DataTable
        data={list.rows}
        columns={columns}
        isLoading={list.loading}
        error={list.error}
        onRetry={list.refresh}
        pagination={{ currentPage: page, totalPages: list.totalPages, totalCount: list.total, onPageChange: onPage }}
        emptyState={filtered
          ? { icon: empty.icon, title: filteredTitle, description: 'Try a different search, or clear the filters.', action: <Button variant="outline" size="sm" onClick={onClear}>Clear filters</Button> }
          : empty}
        onRowClick={onRowClick}
        getRowKey={rowKey}
      />
    </div>
  )
}

// ── Row menu ─────────────────────────────────────────────────────────────
export interface RowAction { label: string; icon: LucideIcon; onSelect: () => void; tone?: 'default' | 'warning' | 'danger'; separated?: boolean; hidden?: boolean; disabled?: boolean }

export function RowMenu({ label, actions }: { label: string; actions: RowAction[] }) {
  const shown = actions.filter((a) => !a.hidden)
  if (shown.length === 0) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={label}><MoreVertical /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {shown.map((a, i) => (
          <div key={a.label}>
            {a.separated && i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={a.onSelect}
              disabled={a.disabled}
              className={cn(a.tone === 'warning' && 'text-warning focus:text-warning', a.tone === 'danger' && 'text-danger focus:text-danger')}
            >
              <a.icon aria-hidden="true" className="mr-2 h-4 w-4" />{a.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Status pills ─────────────────────────────────────────────────────────
const RUN_TONE: Record<string, Tone> = { scheduled: 'info', live: 'success', completed: 'neutral', cancelled: 'danger' }
const titled = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')

/** Scheduled, live, completed, cancelled. */
export const RunStatus = ({ status }: { status: string }) => <StatusPill tone={RUN_TONE[status] ?? 'neutral'}>{titled(status || 'unknown')}</StatusPill>
export const PublishStatusPill = ({ status }: { status?: string | null }) => (
  <StatusPill tone={status === 'published' ? 'success' : 'warning'}>{status === 'published' ? 'Published' : 'Draft'}</StatusPill>
)
export const ActivePill = ({ active }: { active: boolean }) => <StatusPill tone={active ? 'success' : 'danger'}>{active ? 'Active' : 'Inactive'}</StatusPill>
/** A plain label: type, subject, screen. */
export const Tag = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn('inline-flex max-w-full items-center gap-1 truncate rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground', className)}>{children}</span>
)

export function fileSize(mb: number | null | undefined): string {
  if (!mb || mb <= 0) return '—'
  if (mb >= 1000) return `${(mb / 1000).toFixed(1)} GB`
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${mb.toFixed(0)} MB`
}

/** "h:mm:ss"-style length of a video. */
export function videoLength(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '—'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  return mins % 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${Math.floor(mins / 60)}h`
}

/** A small picture in a table, with an icon when there is none or it is gone. */
export function Thumb({ src, icon: Icon, className }: { src?: string | null; icon: LucideIcon; className?: string }) {
  const [broken, setBroken] = useState(false)
  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded bg-muted', className)}>
      {src && !broken
        ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setBroken(true)} />
        : <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />}
    </div>
  )
}
