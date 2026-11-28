import { useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react'
import { BookMarked, BookText, BookOpen, FileText, Layers, Loader2, Package, Search, Video, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiService } from '@/services/api.service'
import { usePanelSelection } from '../context/PanelSelectionContext'
import { EXPLORER_BASE } from '../parseExplorerPath'
import { explain } from '../access'
import type { PanelEntityKind } from '../panel/panelTypes'

interface Hit {
  kind: PanelEntityKind
  id: string
  name: string
  path: { subject_id: string | null; package_id: string | null; series_id: string | null; module_id: string | null } | null
  trail: string[]
  /** A parent was deleted, so there is nowhere to go. */
  orphan: boolean
  author?: string | null
  publish_status?: string | null
  processing_status?: string | null
}

const META: Record<PanelEntityKind, { label: string; icon: LucideIcon }> = {
  subject: { label: 'Subjects', icon: BookOpen },
  package: { label: 'Packages', icon: Package },
  series: { label: 'Series', icon: Layers },
  module: { label: 'Modules', icon: BookMarked },
  video: { label: 'Videos', icon: Video },
  document: { label: 'Documents', icon: FileText },
  book: { label: 'Books', icon: BookText },
}

function hrefOf(hit: Hit): string | null {
  if (hit.kind === 'subject') return `${EXPLORER_BASE}/subjects/${hit.id}`
  if (hit.kind === 'book') return `${EXPLORER_BASE}/books/${hit.id}`
  if (hit.orphan || !hit.path) return null
  const { subject_id: s, package_id: p, series_id: sr, module_id: m } = hit.path
  const item = `item=${hit.kind}:${hit.id}`
  if (hit.kind === 'document') {
    if (s && p && sr) return `${EXPLORER_BASE}/subjects/${s}/packages/${p}/series/${sr}?tab=documents&${item}`
    return s ? `${EXPLORER_BASE}/subjects/${s}?tab=documents&${item}` : `${EXPLORER_BASE}?${item}`
  }
  if (!s) return null
  let url = `${EXPLORER_BASE}/subjects/${s}`
  if (hit.kind === 'package') return `${url}/packages/${hit.id}`
  if (!p) return null
  url += `/packages/${p}`
  if (hit.kind === 'series') return `${url}/series/${hit.id}`
  if (!sr) return null
  url += `/series/${sr}`
  if (hit.kind === 'module') return `${url}/modules/${hit.id}`
  return m ? `${url}/modules/${m}?${item}` : null
}

/** Find anything in the Explorer by name and go to where it lives. */
export function ExplorerFind({ inputRef }: { inputRef: RefObject<HTMLInputElement | null> }) {
  const { go } = usePanelSelection()
  const listId = useId()
  const box = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [state, setState] = useState<{ q: string; hits: Hit[]; error: string | null; loading: boolean }>({ q: '', hits: [], error: null, loading: false })
  const q = text.trim()

  useEffect(() => {
    if (q.length < 2) { setState({ q: '', hits: [], error: null, loading: false }); return }
    let live = true
    setState((s) => ({ ...s, loading: true }))
    const t = setTimeout(async () => {
      try {
        const res = await apiService.get<{ results: Hit[] }>('admin/explorer/search', { params: { q, limit: 6 } })
        if (live) { setState({ q, hits: res.data?.results ?? [], error: null, loading: false }); setActive(0) }
      } catch (err) {
        if (live) setState({ q, hits: [], error: explain(err, 'search'), loading: false })
      }
    }, 220)
    return () => { live = false; clearTimeout(t) }
  }, [q])

  // Click elsewhere closes the results
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [open])

  const hits = state.hits
  const choose = (hit: Hit | undefined) => {
    const href = hit && hrefOf(hit)
    if (!href) return
    setOpen(false)
    setText('')
    inputRef.current?.blur()
    go(href)
  }
  const groups = useMemo(() => {
    const out: { kind: PanelEntityKind; rows: { hit: Hit; index: number }[] }[] = []
    hits.forEach((hit, index) => {
      const last = out[out.length - 1]
      if (last?.kind === hit.kind) last.rows.push({ hit, index })
      else out.push({ kind: hit.kind, rows: [{ hit, index }] })
    })
    return out
  }, [hits])

  const show = open && q.length >= 2
  return (
    <div ref={box} className="relative min-w-0 flex-1">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label="Find in Explorer"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && hits[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={window.matchMedia('(max-width: 639px)').matches ? 'Search content' : 'Find anything by name'}
        value={text}
        onChange={(e) => { setText(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, hits.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
          else if (e.key === 'Enter') { e.preventDefault(); if (state.q === q) choose(hits[active]) }
          else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (text) setText(''); else { setOpen(false); e.currentTarget.blur() } }
          else if (e.key === 'Tab') setOpen(false)
        }}
        className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {state.loading
        ? <Loader2 aria-hidden="true" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        : !text && <kbd aria-hidden="true" className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground @md:block">/</kbd>}

      {show && (
        <div className="pg-fade absolute left-0 top-full z-40 mt-1.5 w-full min-w-[min(26rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-popover shadow-raised @lg:left-auto @lg:right-0">
          <div id={listId} role="listbox" aria-label="Results" className="max-h-[min(60dvh,460px)] overflow-y-auto p-1.5">
            {groups.map(({ kind, rows }) => {
              const { label, icon: Icon } = META[kind]
              return (
                <div key={kind} role="group" aria-label={label}>
                  <p aria-hidden="true" className="px-2.5 pb-1 pt-2 text-xs font-medium text-muted-foreground">{label}</p>
                  {rows.map(({ hit, index }) => {
                    const href = hrefOf(hit)
                    const note = hit.processing_status && hit.processing_status !== 'ready' ? hit.processing_status : hit.publish_status === 'draft' ? 'draft' : null
                    const where = !href ? 'Not in any folder: what it belonged to was deleted' : [...hit.trail, hit.author].filter(Boolean).join(' / ')
                    return (
                      <div
                        key={hit.id}
                        id={`${listId}-${index}`}
                        role="option"
                        aria-selected={index === active}
                        aria-disabled={!href}
                        onPointerMove={() => setActive(index)}
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => choose(hit)}
                        className={cn('flex items-start gap-2.5 rounded-md px-2.5 py-2', href ? 'cursor-pointer' : 'cursor-default opacity-70', index === active && 'bg-accent')}
                      >
                        <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{hit.name}{note && <span className="ml-2 text-xs font-normal text-warning">{note}</span>}</span>
                          {where && <span className="block truncate text-xs text-muted-foreground">{where}</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          {hits.length === 0 && (
            <p role="status" className="px-4 pb-5 pt-3 text-center text-sm text-muted-foreground">
              {state.error ?? (state.loading || state.q !== q ? 'Searching…' : `Nothing called "${q}".`)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
