import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiErrorMessage } from '@/components/common/detail'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import type { ApiResponse } from '@/services/api.service'

/** The reason an API call failed, in words an admin can act on. */
export function errText(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (errStatus(err) === 429) return 'Too many requests in a short time. Wait a minute and try again.'
  if ((err as { message?: string })?.message === 'Network Error') return 'The server could not be reached. Check your connection and try again.'
  return apiErrorMessage(err, fallback)
}

export function errStatus(err: unknown): number | undefined {
  const e = err as { status?: number; response?: { status?: number } } | null
  return e?.status ?? e?.response?.status
}

/** The data of a successful answer, or an error with the server's message. */
export function unwrap<T>(res: ApiResponse<T>, fallback = 'The server did not return the data.'): T {
  if (!res?.success || res.data === undefined || res.data === null) throw new Error(res?.message || fallback)
  return res.data
}

/** For calls whose answer has no body. */
export function ensureOk(res: ApiResponse<unknown>, fallback = 'The change was not saved.') {
  if (!res?.success) throw new Error(res?.message || fallback)
}

interface Resource<T> {
  data: T | null
  loading: boolean
  /** Set when the last load failed. `data` keeps the previous answer. */
  error: string | null
  status?: number
  reload: (opts?: { silent?: boolean }) => Promise<void>
  setData: React.Dispatch<React.SetStateAction<T | null>>
}

/** Loads on mount and when deps change; stale answers are dropped. */
export function useResource<T>(load: () => Promise<T>, deps: unknown[]): Resource<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<number | undefined>()
  const { nextFetchId, isStale } = useLatestFetch()
  const loadRef = useRef(load)
  loadRef.current = load

  const reload = useCallback(async (opts?: { silent?: boolean }) => {
    const id = nextFetchId()
    if (!opts?.silent) setLoading(true)
    try {
      const next = await loadRef.current()
      if (isStale(id)) return
      setData(next)
      setError(null)
      setStatus(undefined)
    } catch (err) {
      if (isStale(id)) return
      setError(errText(err))
      setStatus(errStatus(err))
    } finally {
      if (!isStale(id)) setLoading(false)
    }
  }, [nextFetchId, isStale])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void reload() }, deps)

  return { data, loading, error, status, reload, setData }
}

/**
 * Search, filters and page kept in the URL, so Back, refresh and sharing work.
 * Values equal to their default stay out of the URL.
 */
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams()
  const defaultsRef = useRef(defaults)
  const state = useMemo(() => {
    const out = { ...defaultsRef.current } as Record<string, string>
    for (const key of Object.keys(out)) out[key] = params.get(key) ?? out[key]
    return out as T
  }, [params])

  const set = useCallback((patch: Partial<T>) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(patch)) {
        if (!value || value === defaultsRef.current[key] || (key === 'page' && value === '1')) next.delete(key)
        else next.set(key, value as string)
      }
      if (!('page' in patch)) next.delete('page') // a new filter starts at page 1
      return next
    }, { replace: true })
  }, [setParams])

  const clear = useCallback(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const key of Object.keys(defaultsRef.current)) next.delete(key)
      next.delete('page')
      return next
    }, { replace: true })
  }, [setParams])

  return { state, set, clear, page: Math.max(1, Number(params.get('page')) || 1), setPage: (n: number) => set({ page: String(n) } as unknown as Partial<T>) }
}

/** A search box bound to the URL: types instantly, searches after a pause. */
export function useUrlSearch(value: string, commit: (value: string) => void, minChars = 3) {
  const [input, setInput] = useState(value)
  const commitRef = useRef(commit)
  commitRef.current = commit
  const committed = useRef(value)
  // Back/forward changed the URL: follow it
  useEffect(() => {
    if (value === committed.current) return
    committed.current = value
    setInput(value)
  }, [value])
  useEffect(() => {
    const next = input.trim().length >= minChars ? input.trim() : ''
    if (next === committed.current) return
    const timer = setTimeout(() => { committed.current = next; commitRef.current(next) }, 400)
    return () => clearTimeout(timer)
  }, [input, minChars])
  return [input, setInput] as const
}

/**
 * Unsaved-changes guard of a routed editor. Returns `leave(to)`, which drops
 * the guard and then navigates, for use after a successful save.
 */
export function useEditorGuard(dirty: boolean) {
  const [released, setReleased] = useState(false)
  useUnsavedChanges(dirty && !released)
  const navigate = useNavigate()
  return useCallback((to: string, options?: { replace?: boolean }) => {
    flushSync(() => setReleased(true))
    navigate(to, options)
  }, [navigate])
}

/** Focus the first field with an error, wherever it is in the form. */
export function focusFirstError(form: HTMLElement | null) {
  requestAnimationFrame(() => {
    const el = form?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (!el) return
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    el.focus({ preventScroll: true })
  })
}

/** After deleting the last row of the last page, step back one page. */
export function usePageInRange(page: number, totalPages: number | undefined, loading: boolean, setPage: (n: number) => void) {
  useEffect(() => {
    if (!loading && totalPages !== undefined && totalPages >= 1 && page > totalPages) setPage(totalPages)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, totalPages, loading])
}

// ── Dates, always IST ────────────────────────────────────────────────────

const istDay = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })
const istDayTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })

const valid = (v: string | Date | null | undefined) => {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}
export const dayIST = (v: string | Date | null | undefined) => { const d = valid(v); return d ? istDay.format(d) : 'Not set' }
export const dayTimeIST = (v: string | Date | null | undefined) => { const d = valid(v); return d ? `${istDayTime.format(d)} IST` : 'Not set' }

/** "2026-11-30T18:00" typed as IST wall time → ISO timestamp. */
export const istInputToISO = (value: string) => new Date(`${value}:00+05:30`).toISOString()
/** ISO timestamp → "2026-11-30T18:00" IST, for a datetime-local field. */
export function isoToIstInput(iso: string | Date | null | undefined): string {
  const d = valid(iso)
  if (!d) return ''
  return new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 16)
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`
