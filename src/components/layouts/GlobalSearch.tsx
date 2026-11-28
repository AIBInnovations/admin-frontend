import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Film, Loader2, Package as PackageIcon, Plus, Search, TicketPercent, User as UserIcon, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { usersService } from '@/services/users.service'
import { packagesService } from '@/services/packages.service'
import { videosService } from '@/services/videos.service'
import { booksService } from '@/services/books.service'
import { couponsService } from '@/services/coupons.service'
import { visibleNavigation } from './navigation'

interface Hit { key: string; label: string; hint?: string; href: string; icon: LucideIcon }
interface Group { name: string; hits: Hit[] }

const ACTIONS = [
  { label: 'New coupon', href: '/commerce/coupons/new', permission: 'coupons.create', words: 'create add discount' },
  { label: 'Grant access to a student', href: '/users/grant-access', permission: 'users.update', words: 'give free complimentary' },
  { label: 'Send a notification', href: '/notifications', permission: 'notifications.read', words: 'push email sms message' },
]

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)
const PER_TYPE = 4

/** What each record search asks the API. One failing type never hides the others. */
const SOURCES: { name: string; permission: string; run: (q: string) => Promise<Hit[]> }[] = [
  {
    name: 'Users', permission: 'users.read',
    run: async (q) => ((await usersService.getAll({ search: q, page: 1, limit: PER_TYPE })).data?.entities ?? []).map((u) => ({
      key: `u${u._id}`, label: u.name || u.phone_number || 'Unnamed student', hint: [u.student_id, u.email || u.phone_number].filter(Boolean).join(' · '), href: `/users/${u._id}`, icon: UserIcon,
    })),
  },
  {
    name: 'Packages', permission: 'packages.read',
    run: async (q) => ((await packagesService.getAll({ search: q, page: 1, limit: PER_TYPE } as never)).data?.entities ?? []).map((p) => {
      const subject = typeof p.subject_id === 'object' ? p.subject_id : null
      return { key: `p${p._id}`, label: p.name, hint: subject?.name, href: `/content/packages/${p._id}`, icon: PackageIcon }
    }),
  },
  {
    name: 'Videos', permission: 'videos.read',
    run: async (q) => ((await videosService.getAll({ search: q, page: 1, limit: PER_TYPE } as never)).data?.entities ?? []).map((v) => ({
      key: `v${v._id}`, label: v.title, href: `/content/videos?search=${encodeURIComponent(v.title)}`, icon: Film,
    })),
  },
  {
    name: 'Books', permission: 'books.read',
    run: async (q) => ((await booksService.getAll({ search: q, page: 1, limit: PER_TYPE } as never)).data?.entities ?? []).map((b) => ({
      key: `b${b._id}`, label: b.title, href: `/content/books/${b._id}`, icon: BookOpen,
    })),
  },
  {
    name: 'Coupons', permission: 'coupons.read',
    run: async (q) => ((await couponsService.getAll({ search: q, page: 1, limit: PER_TYPE } as never)).data?.entities ?? []).map((c) => ({
      key: `c${c._id}`, label: c.code, hint: c.description || undefined, href: `/commerce/coupons/${c._id}`, icon: TicketPercent,
    })),
  },
]

/**
 * Search in the header (Ctrl/⌘ K). Pages and actions match instantly; records
 * are looked up on the server as you type. A panel under the field, not a
 * window in the middle of the screen.
 */
export function GlobalSearch() {
  const { hasPermission, user } = useAuth()
  const navigate = useNavigate()
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [records, setRecords] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const q = query.trim()

  const pages = useMemo<Group[]>(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    const match = (text: string) => words.every((w) => text.toLowerCase().includes(w))
    const nav = visibleNavigation(hasPermission).flatMap((item) =>
      item.children
        ? item.children.map((c) => ({ key: c.href, label: c.name, hint: item.name, href: c.href, icon: item.icon, text: `${c.name} ${item.name} ${c.keywords ?? ''}` }))
        : [{ key: item.href!, label: item.name, href: item.href!, icon: item.icon, text: `${item.name} ${item.keywords ?? ''}` }]
    )
    const actions = ACTIONS.filter((a) => hasPermission(a.permission)).map((a) => ({ key: a.href + a.label, label: a.label, href: a.href, icon: Plus, text: `${a.label} ${a.words}` }))
    const strip = ({ text: _text, ...hit }: Hit & { text: string }): Hit => hit
    return [
      { name: 'Actions', hits: actions.filter((a) => match(a.text)).map(strip) },
      { name: 'Pages', hits: nav.filter((n) => match(n.text)).slice(0, q ? 6 : 8).map(strip) },
    ].filter((g) => g.hits.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, user])

  // Records: debounced, and a slow older answer can never replace a newer one.
  useEffect(() => {
    if (!open || q.length < 2) { setRecords([]); setLoading(false); return }
    let stale = false
    setLoading(true)
    const timer = setTimeout(async () => {
      const sources = SOURCES.filter((s) => hasPermission(s.permission))
      const results = await Promise.allSettled(sources.map((s) => s.run(q)))
      if (stale) return
      setRecords(results.flatMap((r, i) => (r.status === 'fulfilled' && r.value.length ? [{ name: sources[i].name, hits: r.value.slice(0, PER_TYPE) }] : [])))
      setLoading(false)
    }, 250)
    return () => { stale = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open])

  const groups = useMemo(() => [...records, ...pages], [records, pages])
  const flat = useMemo(() => groups.flatMap((g) => g.hits), [groups])
  useEffect(() => { setCursor(0) }, [q, records])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select() })
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const go = (hit: Hit | undefined) => {
    if (!hit) return
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
    navigate(hit.href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      if (flat.length) setCursor((c) => (c + (e.key === 'ArrowDown' ? 1 : -1) + flat.length) % flat.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(flat[cursor])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (query) setQuery('')
      else { setOpen(false); inputRef.current?.blur() }
    }
  }

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${cursor}`)?.scrollIntoView({ block: 'nearest' })
  }, [cursor, open, listId])

  let index = -1
  return (
    <div ref={rootRef} className={cn('min-w-0', open ? 'absolute inset-x-3 top-3 z-50 md:relative md:inset-auto md:top-auto md:w-full md:max-w-md' : 'w-auto md:relative md:w-full md:max-w-md')}>
      {/* Small screens: an icon until it is needed */}
      <button
        type="button"
        onClick={() => { setOpen(true); requestAnimationFrame(() => inputRef.current?.focus()) }}
        aria-label="Search"
        className={cn('flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted md:hidden', open && 'hidden')}
      >
        <Search aria-hidden="true" className="h-[18px] w-[18px]" />
      </button>

      <div className={cn('relative md:block', open ? 'block' : 'hidden')}>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          data-own-focus
          type="text"
          role="combobox"
          aria-label="Search students, packages, videos, books, coupons and pages"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && flat.length ? `${listId}-${cursor}` : undefined}
          autoComplete="off"
          spellCheck={false}
          maxLength={80}
          placeholder="Search students, packages, videos…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onKeyDown={onKeyDown}
          className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-16 text-sm text-foreground shadow-card outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/15 md:h-9"
        />
        <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          {loading && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {query ? (
            <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); inputRef.current?.focus() }} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          ) : (
            // A keyboard shortcut: only for a wide screen with a mouse or trackpad, never on touch
            <kbd className="hidden h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground md:pointer-fine:flex">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
          )}
        </span>

        {open && (
          <div className="pg-fade absolute inset-x-0 top-full mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-raised md:min-w-[420px]">
            <div id={listId} role="listbox" aria-label="Search results" className="max-h-[min(70dvh,520px)] overflow-y-auto p-1.5">
              {groups.map((group) => (
                <div key={group.name} role="group" aria-label={group.name} className="pb-1">
                  <p className="px-2.5 pb-1 pt-2 text-xs font-semibold text-muted-foreground">{group.name}</p>
                  {group.hits.map((hit) => {
                    index += 1
                    const i = index
                    return (
                      <div
                        key={group.name + hit.key}
                        id={`${listId}-${i}`}
                        role="option"
                        aria-selected={i === cursor}
                        onPointerMove={() => setCursor(i)}
                        onClick={() => go(hit)}
                        className={cn('flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5', i === cursor && 'bg-accent')}
                      >
                        <hit.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-foreground">{hit.label}</span>
                          {hit.hint && <span className="block truncate text-xs text-muted-foreground">{hit.hint}</span>}
                        </span>
                        {i === cursor && <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                      </div>
                    )
                  })}
                </div>
              ))}
              {groups.length === 0 && !loading && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing matches “{q}”. Try a name, phone number, student ID or coupon code.</p>
              )}
              {groups.length === 0 && loading && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Searching…</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
