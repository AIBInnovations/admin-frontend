import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Check, ChevronRight, FolderOpen, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ErrorState, StatusPill } from '@/components/common/detail'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import {
  contentMoveService, newOperationId, SKIP_TEXT,
  type DestModule, type DestPackage, type DestSeries, type DestSubject, type Destinations, type MoveKind, type MoveResult,
} from '@/services/contentMove.service'

/**
 * "Move to..." and "Copy to..." for videos, "Move to series..." for modules and
 * "Move to package..." for series. A full page (no popup): choose package,
 * series and module by name or search, see where the items are now and one
 * sentence of what will happen, then confirm. The server checks the choice
 * first (dry run), so what is left out, and why, shows before anything moves.
 */

export interface PickItem {
  id: string
  name: string
  /** Where it is now: the module of a video, the series of a module, the package of a series. */
  parentId: string | null
}

interface Props {
  kind: MoveKind
  items: PickItem[]
  onClose: () => void
  /** After the server said yes. The toast is already shown. */
  onDone: (result: MoveResult) => void | Promise<void>
}

type Level = 'package' | 'series' | 'module'
const LEVEL: Record<MoveKind, Level> = { 'video-move': 'module', 'video-copy': 'module', 'module-move': 'series', 'series-move': 'package' }
const NOUN: Record<MoveKind, [string, string]> = {
  'video-move': ['video', 'videos'], 'video-copy': ['video', 'videos'], 'module-move': ['module', 'modules'], 'series-move': ['series', 'series'],
}
const count = (n: number, [one, many]: [string, string]) => `${new Intl.NumberFormat('en-IN').format(n)} ${n === 1 ? one : many}`

interface Place { subject?: DestSubject; pkg?: DestPackage; series?: DestSeries; module?: DestModule }

/** Lookups over the destination lists. */
function indexOf(tree: Destinations) {
  const subjects = new Map(tree.subjects.map((s) => [s._id, s]))
  const packages = new Map(tree.packages.map((p) => [p._id, p]))
  const series = new Map(tree.series.map((s) => [s._id, s]))
  const modules = new Map(tree.modules.map((m) => [m._id, m]))
  const group = <T,>(rows: T[], key: (r: T) => string | null) => {
    const out = new Map<string, T[]>()
    for (const r of rows) { const k = key(r) ?? ''; out.set(k, [...(out.get(k) ?? []), r]) }
    return out
  }
  const seriesOf = group(tree.series, (s) => s.package_id)
  const modulesOf = group(tree.modules, (m) => m.series_id)
  const placeOf = (level: Level, id: string | null): Place | null => {
    if (!id) return null
    if (level === 'module') {
      const module = modules.get(id)
      if (!module) return null
      const s = module.series_id ? series.get(module.series_id) : undefined
      const pkg = s?.package_id ? packages.get(s.package_id) : undefined
      return { module, series: s, pkg, subject: pkg?.subject_id ? subjects.get(pkg.subject_id) : undefined }
    }
    if (level === 'series') {
      const s = series.get(id)
      if (!s) return null
      const pkg = s.package_id ? packages.get(s.package_id) : undefined
      return { series: s, pkg, subject: pkg?.subject_id ? subjects.get(pkg.subject_id) : undefined }
    }
    const pkg = packages.get(id)
    return pkg ? { pkg, subject: pkg.subject_id ? subjects.get(pkg.subject_id) : undefined } : null
  }
  return { subjects, packages, series, modules, seriesOf, modulesOf, placeOf }
}

/** Why a place cannot be chosen, or null. */
function blockedReason(p: Place | null, level: Level): string | null {
  if (!p) return 'Not found'
  if (p.pkg && !p.pkg.is_active) return 'Inactive package'
  if (level !== 'package' && p.series && !p.series.is_active) return 'Inactive series'
  if (level === 'module' && p.module && !p.module.is_active) return 'Inactive module'
  return null
}

const pathText = (p: Place | null, upTo: Level) => {
  if (!p) return ''
  const parts = [p.subject?.name, p.pkg?.name, upTo !== 'package' ? p.series?.name : null, upTo === 'module' ? p.module?.name : null]
  return parts.filter(Boolean).join(' › ')
}

export function ContentMovePicker({ kind, items, onClose, onDone }: Props) {
  const level = LEVEL[kind]
  const noun = NOUN[kind]
  const isCopy = kind === 'video-copy'
  const wide = useMediaQuery('(min-width: 768px)')
  // By content, so a parent that re-renders with a new array does not restart the check
  const idsKey = items.map((i) => i.id).join(',')
  const ids = useMemo(() => idsKey.split(','), [idsKey])

  const [tree, setTree] = useState<Destinations | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    setLoadError(null)
    contentMoveService.getDestinations()
      .then((res) => { if (live) { if (res.data) setTree(res.data); else setLoadError(res.message || 'The list of places could not be loaded.') } })
      .catch((err: Error & { status?: number }) => { if (live) setLoadError(err.status === 403 ? 'You do not have access to moving content. Ask a super admin for the permission.' : err.message) })
    return () => { live = false }
  }, [attempt])
  const idx = useMemo(() => (tree ? indexOf(tree) : null), [tree])

  // Where the items are now
  const parentsKey = items.map((i) => i.parentId ?? '').join(',')
  const parents = useMemo(() => [...new Set(parentsKey.split(',').filter(Boolean))], [parentsKey])
  const here = parents.length === 1 ? parents[0] : null
  const herePlace = idx ? idx.placeOf(level, here) : null

  const [pkgId, setPkgId] = useState<string | null>(null)
  const [seriesId, setSeriesId] = useState<string | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [step, setStep] = useState<Level>('package')
  const [query, setQuery] = useState('')
  const opened = useRef(false)
  // Open at the current place
  useEffect(() => {
    if (!idx || opened.current) return
    opened.current = true
    if (!herePlace?.pkg) return
    setPkgId(herePlace.pkg._id)
    if (level === 'module' && herePlace.series) { setSeriesId(herePlace.series._id); setStep('module') }
    else if (level === 'series') setStep('series')
  }, [idx, herePlace, level])

  // A series stays in its subject (the server refuses otherwise): only offer those packages.
  const onlySubject = kind === 'series-move' ? herePlace?.subject?._id ?? null : null

  const targetPlace = idx ? idx.placeOf(level, targetId) : null

  // ── The server's check of the choice ───────────────────────────────────
  const [check, setCheck] = useState<{ state: 'idle' | 'checking' | 'ok' | 'error'; result?: MoveResult; message?: string }>({ state: 'idle' })
  const seq = useRef(0)
  useEffect(() => {
    const n = ++seq.current
    if (!targetId) { setCheck({ state: 'idle' }); return }
    setCheck({ state: 'checking' })
    contentMoveService.run(kind, ids, targetId, { dryRun: true })
      .then((res) => { if (seq.current === n) setCheck(res.data ? { state: 'ok', result: res.data } : { state: 'error', message: res.message }) })
      .catch((err: Error) => { if (seq.current === n) setCheck({ state: 'error', message: err.message }) })
  }, [kind, ids, targetId])

  // ── Confirm ────────────────────────────────────────────────────────────
  const [busy, setBusy] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const op = useRef<{ target: string; id: string } | null>(null)
  const verb = isCopy ? 'Copy' : 'Move'
  async function confirm() {
    if (busy || !targetId) return
    // The same choice keeps its operation id, so pressing again after a lost answer never does it twice
    if (op.current?.target !== targetId) op.current = { target: targetId, id: newOperationId() }
    setBusy(true)
    setRunError(null)
    try {
      const res = await contentMoveService.run(kind, ids, targetId, { operationId: op.current.id })
      if (!res.data) throw new Error(res.message || `${verb} did not work`)
      const skipped = res.data.skipped.length
      toast.success(res.message || `${verb} done`, skipped ? { description: `${count(skipped, noun)} left out.` } : undefined)
      await onDone(res.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setRunError(message)
      toast.error(`${verb} did not work`, { description: message })
    } finally {
      setBusy(false)
    }
  }

  // ── Choosing ───────────────────────────────────────────────────────────
  const pickPackage = (p: DestPackage) => {
    setPkgId(p._id); setSeriesId(null)
    setTargetId(level === 'package' ? p._id : null)
    if (level !== 'package') setStep('series')
  }
  const pickSeries = (s: DestSeries) => {
    setSeriesId(s._id)
    setTargetId(level === 'series' ? s._id : null)
    if (level === 'module') setStep('module')
  }
  const pickModule = (m: DestModule) => setTargetId(m._id)
  const pickResult = (id: string) => {
    const p = idx?.placeOf(level, id)
    if (!p) return
    if (p.pkg) setPkgId(p.pkg._id)
    if (p.series) setSeriesId(p.series._id)
    setTargetId(id)
    setStep(level)
    setQuery('')
  }

  /** The place the items are in now cannot be chosen for a move (it would change nothing). */
  const isHere = (id: string) => !isCopy && here === id

  // ── Lists ──────────────────────────────────────────────────────────────
  const packages = useMemo(() => {
    if (!tree) return []
    return tree.packages.filter((p) => !onlySubject || p.subject_id === onlySubject)
  }, [tree, onlySubject])
  const bySubject = useMemo(() => {
    if (!idx) return [] as { subject: DestSubject | null; packages: DestPackage[] }[]
    const groups = new Map<string, DestPackage[]>()
    for (const p of packages) groups.set(p.subject_id ?? '', [...(groups.get(p.subject_id ?? '') ?? []), p])
    const order = [...idx.subjects.values()].map((s) => s._id)
    return [...groups.entries()]
      .sort(([a], [b]) => (order.indexOf(a) === -1 ? 1e9 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 1e9 : order.indexOf(b)))
      .map(([sid, list]) => ({ subject: idx.subjects.get(sid) ?? null, packages: list }))
  }, [idx, packages])
  const seriesList = idx && pkgId ? idx.seriesOf.get(pkgId) ?? [] : []
  const moduleList = idx && seriesId ? idx.modulesOf.get(seriesId) ?? [] : []

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!idx || !q) return []
    const pool: string[] = level === 'module' ? [...idx.modules.keys()] : level === 'series' ? [...idx.series.keys()] : packages.map((p) => p._id)
    return pool
      .map((id) => ({ id, place: idx.placeOf(level, id) }))
      .filter(({ place }) => place && (!onlySubject || place.pkg?.subject_id === onlySubject) && pathText(place, level).toLowerCase().includes(q))
      .slice(0, 60)
  }, [idx, query, level, packages, onlySubject])

  // ── Words ──────────────────────────────────────────────────────────────
  const sourceNames = idx ? parents.map((id) => idx.placeOf(level, id)) : []
  const fromName = (p: Place | null) => (level === 'module' ? p?.module?.name : level === 'series' ? p?.series?.name : p?.pkg?.name) ?? 'an unknown place'
  const fromText: ReactNode = parents.length === 1 ? <strong className="font-semibold">{fromName(sourceNames[0] ?? null)}</strong> : `${parents.length} ${level === 'series' ? 'series' : `${level}s`}`
  const plan = check.state === 'ok' ? check.result : undefined
  const n = plan ? plan.count : items.length
  const t = targetPlace
  const toText: ReactNode = !t ? null : level === 'module'
    ? <><strong className="font-semibold">{t.module?.name}</strong> in {t.series?.name}{t.pkg && herePlace?.pkg?._id !== t.pkg._id ? ` (${t.pkg.name})` : ''}</>
    : level === 'series'
      ? <><strong className="font-semibold">{t.series?.name}</strong> in {t.pkg?.name}</>
      : <strong className="font-semibold">{t.pkg?.name}</strong>
  const sentence: ReactNode = !t
    ? `Choose the ${level} to ${isCopy ? 'copy' : 'move'} ${items.length === 1 ? 'it' : 'them'} to.`
    : isCopy
      ? <>Copy {count(n, noun)} to {toText}.</>
      : <>Move {count(n, noun)} from {fromText} to {toText}.</>

  const notes: string[] = []
  if (t) {
    const sourcePkgs = new Set(sourceNames.map((p) => p?.pkg?._id).filter(Boolean))
    const otherPkg = t.pkg && [...sourcePkgs].some((id) => id !== t.pkg!._id)
    const otherSubject = t.subject && sourceNames.some((p) => p?.subject && p.subject._id !== t.subject!._id)
    if (isCopy) notes.push('The copies play the same video files: nothing is uploaded or processed again. They start with no views, reviews or watch progress, and keep the tags.')
    else if (kind === 'video-move') notes.push('Each video keeps its views, reviews and students\' watch progress.')
    if (kind === 'module-move') notes.push(`${plan?.videos_with_them !== undefined ? count(plan.videos_with_them, ['video goes', 'videos go']) : 'Their videos go'} with ${n === 1 ? 'it' : 'them'}. Documents belong to the series and stay where they are.`)
    if (kind === 'series-move') notes.push(`${plan ? `${count(plan.modules_with_them ?? 0, ['module', 'modules'])} and ${count(plan.documents_with_them ?? 0, ['document', 'documents'])}` : 'Its modules, videos and documents'} go with ${n === 1 ? 'it' : 'them'}.`)
    if (otherPkg && !isCopy && t.pkg) notes.push(`Students get ${n === 1 ? 'it' : 'them'} through ${t.pkg.name} from now on, no longer through ${sourcePkgs.size === 1 ? sourceNames[0]?.pkg?.name ?? 'the old package' : 'the old packages'}.`)
    if (isCopy && t.pkg) notes.push(`Students of ${t.pkg.name} see the copies${t.pkg.publish_status === 'draft' ? ' once the package is published' : ''}.`)
    if (otherSubject && t.subject) notes.push(`${t.pkg?.name ?? 'This'} is in another subject (${t.subject.name}).`)
    if (plan?.linked_live_sessions) notes.push(`${count(plan.linked_live_sessions, ['live session stays', 'live sessions stay'])} linked to ${n === 1 ? 'this series' : 'these series'}, with ${plan.linked_live_sessions === 1 ? 'its' : 'their'} own access settings.`)
    if ((t.module && t.module.publish_status === 'draft') || (level !== 'package' && t.series?.publish_status === 'draft') || t.pkg?.publish_status === 'draft') notes.push('The place you chose is a draft: students do not see it yet.')
  }
  const canConfirm = !!targetId && check.state === 'ok' && !!plan && plan.count > 0 && !busy
  const actionLabel = `${verb} ${count(plan?.count ?? items.length, noun)}`

  // ── Pieces ─────────────────────────────────────────────────────────────
  const title = kind === 'video-copy' ? `Copy ${count(items.length, noun)}` : kind === 'video-move' ? `Move ${count(items.length, noun)}` : kind === 'module-move' ? `Move ${count(items.length, noun)} to another series` : `Move ${count(items.length, noun)} to another package`

  const column = (key: Level, heading: ReactNode, back: (() => void) | null, body: ReactNode) => (
    <section key={key} aria-label={typeof heading === 'string' ? heading : undefined} className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex min-h-11 items-center gap-1.5 border-b border-border px-3 py-2">
        {back && !wide && (
          <Button type="button" variant="ghost" size="icon" className="-ml-1.5 h-8 w-8 shrink-0" onClick={back} aria-label="Back"><ArrowLeft className="h-4 w-4" /></Button>
        )}
        <h3 className="min-w-0 truncate text-[13px] font-semibold text-foreground">{heading}</h3>
      </div>
      <div data-level={key} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 md:max-h-[min(52vh,520px)]">{body}</div>
    </section>
  )

  const option = (o: { id: string; name: string; meta?: string; selected: boolean; current: boolean; drill: boolean; disabled: string | null; badges?: ReactNode; onClick: () => void }) => (
    <li key={o.id}>
      <button
        type="button"
        onClick={o.onClick}
        disabled={!!o.disabled}
        aria-pressed={o.selected}
        title={o.name}
        className={cn(
          'flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          o.selected ? 'bg-accent text-accent-foreground ring-1 ring-inset ring-primary/35' : 'hover:bg-muted',
          o.disabled && 'cursor-not-allowed opacity-55 hover:bg-transparent',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{o.name}</span>
          {(o.meta || o.disabled || o.current || o.badges) && (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
              {o.meta && <span className="tabular-nums">{o.meta}</span>}
              {o.current && <StatusPill tone="info" className="h-5 px-2 text-[11px]">{isCopy ? 'Here now' : 'Current'}</StatusPill>}
              {o.disabled && <StatusPill className="h-5 px-2 text-[11px]">{o.disabled}</StatusPill>}
              {o.badges}
            </span>
          )}
        </span>
        {o.selected && !o.drill ? <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" /> : o.drill ? <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
      </button>
    </li>
  )
  const draft = (s: 'draft' | 'published') => (s === 'draft' ? <StatusPill tone="warning" className="h-5 px-2 text-[11px]">Draft</StatusPill> : null)
  const empty = (text: string) => <p className="px-2.5 py-6 text-center text-[13px] text-muted-foreground">{text}</p>

  const packageColumn = column('package', 'Package', null, bySubject.length === 0 ? empty('No packages.') : bySubject.map(({ subject, packages: list }) => (
    <div key={subject?._id ?? 'none'} className="pb-1">
      <p className="px-2.5 pb-1 pt-2 text-xs font-medium text-muted-foreground">{subject?.name ?? 'No subject'}</p>
      <ul className="space-y-0.5">
        {list.map((p) => option({
          id: p._id,
          name: p.name,
          meta: level === 'package' ? undefined : `${count(p.series_count, ['series', 'series'])}`,
          selected: pkgId === p._id,
          current: level === 'package' ? here === p._id : herePlace?.pkg?._id === p._id,
          drill: level !== 'package',
          disabled: !p.is_active ? 'Inactive' : level === 'package' && isHere(p._id) ? 'Already here' : null,
          badges: <>{draft(p.publish_status)}{p.is_combo && <StatusPill tone="info" className="h-5 px-2 text-[11px]">Combo</StatusPill>}</>,
          onClick: () => pickPackage(p),
        }))}
      </ul>
    </div>
  )))

  const seriesColumn = column('series', pkgId ? `Series in ${idx?.packages.get(pkgId)?.name ?? 'package'}` : 'Series', () => setStep('package'), !pkgId ? empty('Choose a package first.') : seriesList.length === 0 ? empty('This package has no series.') : (
    <ul className="space-y-0.5">
      {seriesList.map((s) => option({
        id: s._id,
        name: s.name,
        meta: count(s.module_count, ['module', 'modules']),
        selected: seriesId === s._id,
        current: level === 'series' ? here === s._id : herePlace?.series?._id === s._id,
        drill: level === 'module',
        disabled: !s.is_active ? 'Inactive' : level === 'series' && isHere(s._id) ? 'Already here' : null,
        badges: draft(s.publish_status),
        onClick: () => pickSeries(s),
      }))}
    </ul>
  ))

  const moduleColumn = column('module', seriesId ? `Modules in ${idx?.series.get(seriesId)?.name ?? 'series'}` : 'Module', () => setStep('series'), !seriesId ? empty('Choose a series first.') : moduleList.length === 0 ? empty('This series has no modules.') : (
    <ul className="space-y-0.5">
      {moduleList.map((m) => option({
        id: m._id,
        name: m.name,
        meta: count(m.video_count, ['video', 'videos']),
        selected: targetId === m._id,
        current: here === m._id,
        drill: false,
        disabled: !m.is_active ? 'Inactive' : isHere(m._id) ? 'Already here' : null,
        badges: draft(m.publish_status),
        onClick: () => pickModule(m),
      }))}
    </ul>
  ))

  const columns = level === 'module' ? [packageColumn, seriesColumn, moduleColumn] : level === 'series' ? [packageColumn, seriesColumn] : [packageColumn]
  const shownColumns = wide ? columns : [step === 'module' ? moduleColumn : step === 'series' ? seriesColumn : packageColumn]

  const searchResults = (
    <section aria-label="Search results" className="rounded-xl border border-border bg-card">
      <p aria-live="polite" className="border-b border-border px-3 py-2 text-[13px] font-semibold">{results.length === 0 ? `No ${level === 'series' ? 'series' : `${level}s`} match "${query.trim()}"` : `${results.length}${results.length === 60 ? '+' : ''} ${results.length === 1 ? level : level === 'series' ? 'series' : `${level}s`} found`}</p>
      {results.length === 0 ? (
        <div className="px-3 py-6 text-center"><Button type="button" variant="outline" size="sm" onClick={() => setQuery('')}>Clear search</Button></div>
      ) : (
        <ul className="max-h-[min(60vh,560px)] space-y-0.5 overflow-y-auto p-1.5">
          {results.map(({ id, place }) => option({
            id,
            name: (level === 'module' ? place?.module?.name : level === 'series' ? place?.series?.name : place?.pkg?.name) ?? '',
            meta: [place?.subject?.name, place?.pkg?.name, level === 'module' ? place?.series?.name : null].filter((x, i) => x && !(level === 'package' && i === 1)).join(' › '),
            selected: targetId === id,
            current: here === id,
            drill: false,
            disabled: blockedReason(place, level) ?? (isHere(id) ? 'Already here' : null),
            onClick: () => pickResult(id),
          }))}
        </ul>
      )}
    </section>
  )

  // What else changes, what the server left out, or why it refused. On a phone it sits
  // under the list; on a wide screen in the action bar, so it is in view when confirming.
  const whatHappens = (
    <div aria-live="polite" className={cn('space-y-1.5 text-[13px]', wide ? 'mt-1 text-muted-foreground' : 'rounded-xl border border-border bg-card px-4 py-3')}>
      {!wide && <p className="font-semibold text-foreground">What happens</p>}
      {wide
        ? <p className="break-words text-muted-foreground">{notes.join(' ')}</p>
        : <ul className="list-disc space-y-1 pl-5 text-muted-foreground">{notes.map((x) => <li key={x}>{x}</li>)}</ul>}
      {check.state === 'checking' && <p className="flex items-center gap-1.5 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking with the server</p>}
      {plan && plan.skipped.length > 0 && (
        <div className="rounded-lg bg-warning-soft px-3 py-2 text-warning">
          <p className="font-medium">{count(plan.skipped.length, noun)} left out</p>
          <ul className="mt-1 max-h-24 space-y-0.5 overflow-y-auto">{plan.skipped.slice(0, 8).map((s) => <li key={s.id} className="break-words">{s.name}: {SKIP_TEXT[s.reason] ?? s.reason}</li>)}</ul>
        </div>
      )}
      {check.state === 'error' && <p role="alert" className="break-words rounded-lg bg-danger-soft px-3 py-2 text-danger">{check.message}</p>}
    </div>
  )

  const shownItems = items.slice(0, 3).map((i) => i.name).join(', ') + (items.length > 3 ? ` and ${items.length - 3} more` : '')
  const hereText = herePlace ? pathText(herePlace, level) : parents.length > 1 ? `${parents.length} different ${level === 'series' ? 'series' : `${level}s`}` : 'Unknown'

  return (
    <Dialog open guardUnsaved={false} onOpenChange={(v) => { if (!v && !busy) onClose() }}>
      <DialogContent size="wide" backLabel="Back">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="break-words">{shownItems}</DialogDescription>
        </DialogHeader>

        <p className="flex min-w-0 items-start gap-2 rounded-lg bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          <FolderOpen aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">Now in <span className="font-medium text-foreground">{hereText}</span></span>
        </p>

        {loadError ? (
          <ErrorState title="The places could not be loaded" message={loadError} onRetry={() => setAttempt((x) => x + 1)} />
        ) : !idx ? (
          <div aria-busy="true" aria-label="Loading places" className="grid gap-3 md:grid-cols-3">
            {[0, 1, 2].slice(0, wide ? columns.length || 3 : 1).map((i) => <div key={i} className="h-72 animate-pulse rounded-xl border border-border bg-muted/50" />)}
          </div>
        ) : (
          <>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <label htmlFor="move-search" className="sr-only">Search by name</label>
              <input
                id="move-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={level === 'module' ? 'Search packages, series and modules' : level === 'series' ? 'Search packages and series' : 'Search packages'}
                className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
              )}
            </div>
            {onlySubject && herePlace?.subject && <p className="text-[13px] text-muted-foreground">A series can only move to a package of its own subject ({herePlace.subject.name}). To move it elsewhere, move its modules.</p>}

            {query.trim() ? searchResults : (
              <div className={cn('grid gap-3', wide && (level === 'module' ? 'grid-cols-3' : level === 'series' ? 'grid-cols-2' : 'grid-cols-1'))}>{shownColumns}</div>
            )}

            {t && !wide && whatHappens}
          </>
        )}

        <DialogFooter>
          <div className="w-full min-w-0 self-center sm:mr-auto sm:w-auto sm:flex-1">
            <p aria-live="polite" className="break-words text-sm text-foreground">{runError ? <span role="alert" className="text-danger">{runError}</span> : sentence}</p>
            {t && wide && whatHappens}
          </div>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => void confirm()} disabled={!canConfirm}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> {isCopy ? 'Copying…' : 'Moving…'}</> : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
