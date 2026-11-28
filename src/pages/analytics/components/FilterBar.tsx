import { useEffect, useId, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bookmark, BookmarkPlus, Check, ChevronsUpDown, Link2, MousePointerClick, Search, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { usePersistentState } from '@/hooks/usePersistentState'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { DateRangeFilter } from '@/components/common/DateRangeFilter'
import { analyticsService, type Granularity, type ReportOptions } from '@/services/analytics.service'
import { KIND_NAME, TYPE_NAME, TYPE_ORDER } from '@/components/charts/palette'
import { QUICK_RANGES, crossLabels, describeRange, quickRange, type AnalyticsState, type FilterKey } from '../useAnalyticsState'

interface SavedView { name: string; href: string; at: number }
const MAX_VIEWS = 12

/** Copy this view's link, save it under a name made from what it shows, open a saved one. */
export function ViewTools({ state, name }: { state: AnalyticsState; name: string }) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [views, setViews] = usePersistentState<SavedView[]>('pgme.analytics.saved-views', [])
  const href = `${pathname}${search}`
  const saved = views.some((v) => v.href === href)
  const copy = async () => {
    const url = `${window.location.origin}${href}`
    try { await navigator.clipboard.writeText(url); toast.success('Link copied. It opens this exact view.') } catch { toast.error('The link could not be copied. Copy it from the address bar.') }
  }
  const save = () => {
    if (saved) return
    const label = `${name}, ${describeRange(state.range)}`
    setViews((list) => [{ name: label, href, at: Date.now() }, ...list.filter((v) => v.href !== href)].slice(0, MAX_VIEWS))
    toast.success(`Saved "${label}" to your views`)
  }
  return (
    <div className="flex items-center gap-1.5">
      <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 bg-card" onClick={() => void copy()}>
        <Link2 aria-hidden="true" className="h-4 w-4" /><span className="hidden xl:inline">Copy link</span><span className="sr-only xl:hidden">Copy link to this view</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5 bg-card" aria-label={`Saved views${views.length ? `, ${views.length}` : ''}`}>
            <Bookmark aria-hidden="true" className={cn('h-4 w-4', saved && 'fill-primary text-primary')} /><span className="hidden xl:inline">Views</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[min(340px,calc(100vw-1.5rem))]">
          <DropdownMenuItem disabled={saved} onSelect={save}>
            <BookmarkPlus aria-hidden="true" className="h-4 w-4" />{saved ? 'This view is saved' : 'Save this view'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{views.length ? 'Your saved views (this browser)' : 'No saved views yet'}</DropdownMenuLabel>
          {views.map((v) => (
            <DropdownMenuItem key={v.href} onSelect={() => navigate(v.href)} className="justify-between gap-3">
              <span className="min-w-0 truncate">{v.name}</span>
              <button
                type="button"
                aria-label={`Remove ${v.name}`}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViews((list) => list.filter((x) => x.href !== v.href)); toast.success(`Removed "${v.name}"`) }}
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** What a click on a chart filtered by, each removable. */
export function CrossChips({ state }: { state: AnalyticsState }) {
  const chips = crossLabels(state.filters)
  if (!chips.length) return null
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2" aria-live="polite">
      <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground"><MousePointerClick aria-hidden="true" className="h-3.5 w-3.5" />Filtered from a chart</span>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => state.update(c.key === 'state' ? { state: null, page: null } : { dow: null, hour: null, page: null }, { push: true })}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-primary/30 bg-accent px-3 text-[13px] font-medium text-accent-foreground transition-colors hover:border-primary/60"
        >
          {c.label}<X aria-hidden="true" className="h-3.5 w-3.5" /><span className="sr-only">Remove this filter</span>
        </button>
      ))}
    </div>
  )
}

let cached: Promise<ReportOptions> | null = null
/** Filter choices, loaded once per visit. A failure is retried on the next page. */
export function useReportOptions(): ReportOptions | null {
  const [options, setOptions] = useState<ReportOptions | null>(null)
  useEffect(() => {
    let live = true
    cached ??= analyticsService.options()
    cached.then((o) => { if (live) setOptions(o) }).catch(() => { cached = null })
    return () => { live = false }
  }, [])
  return options
}

export function tierOptions(options: ReportOptions | null, packageId: string): { key: string; label: string }[] {
  const pkg = options?.packages.find((p) => p.package_id === packageId)
  const list = pkg ? pkg.tiers : (options?.packages ?? []).flatMap((p) => p.tiers)
  const days = [...new Set(list.map((t) => t.duration_days))].filter(Boolean).sort((a, b) => a - b)
  return days.map((d) => ({ key: String(d), label: formatDuration(d) }))
}

export function tierLabel(key: string): string {
  if (key === 'none') return 'No plan recorded'
  if (key.startsWith('name:')) return key.slice(5)
  return formatDuration(Number(key))
}

interface PickerProps { label: string; all: string; value: string; onChange: (v: string) => void; choices: { value: string; label: string; hint?: string }[]; fallback?: string; className?: string }

/** A searchable choice, for lists too long for a menu. */
export function Picker({ label, all, value, onChange, choices, fallback, className }: PickerProps) {
  const [open, setOpen] = useState(false)
  const current = choices.find((c) => c.value === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} aria-label={`${label}: ${current?.label ?? all}`} className={cn('h-9 min-w-0 justify-between gap-2 bg-card px-3 font-normal', value && 'border-primary/40', className)}>
          <span className="truncate">{value ? current?.label ?? fallback ?? 'Selected' : all}</span>
          <ChevronsUpDown aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={12} className="w-[min(320px,calc(100vw-1.5rem))] p-0">
        <Command filter={(v, search, keywords) => ([v, ...(keywords ?? [])].join(' ').toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder={`Find a ${label.toLowerCase()}`} className="outline-none!" />
          <CommandList className="max-h-[min(50dvh,300px)]">
            <CommandEmpty>Nothing matches.</CommandEmpty>
            <CommandGroup>
              <CommandItem value={all} onSelect={() => { onChange(''); setOpen(false) }}>
                <span className="flex-1">{all}</span>{!value && <Check aria-hidden="true" className="h-4 w-4 text-primary" />}
              </CommandItem>
              {choices.map((c) => (
                <CommandItem key={c.value} value={c.value} keywords={[c.label, c.hint ?? '']} onSelect={() => { onChange(c.value); setOpen(false) }}>
                  <span className="min-w-0 flex-1"><span className="block truncate">{c.label}</span>{c.hint && <span className="block truncate text-xs text-muted-foreground">{c.hint}</span>}</span>
                  {value === c.value && <Check aria-hidden="true" className="h-4 w-4 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const GRAIN: { value: Granularity; label: string }[] = [
  { value: 'auto', label: 'Automatic' }, { value: 'day', label: 'Daily' }, { value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' },
]

export function GranularitySelect({ value, onChange, className }: { value: Granularity; onChange: (g: Granularity) => void; className?: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Granularity)}>
      <SelectTrigger aria-label="Group by" className={cn('h-9 w-[128px] bg-card', className)}><SelectValue /></SelectTrigger>
      <SelectContent>{GRAIN.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
    </Select>
  )
}

interface FilterBarProps {
  state: AnalyticsState
  /** Which filters make sense here. */
  show?: FilterKey[]
  granularity?: boolean
  compare?: boolean
  /** Rendered above the filters and stuck with them (the tabs). */
  children?: React.ReactNode
  /** Show what a chart click filtered by (the views it applies to). */
  cross?: boolean
}

/** One row of filters above everything it scopes. Stays under the header while scrolling (on a phone it would cover the page). */
export function FilterBar({ state, show = [], granularity = true, compare = true, children, cross = true }: FilterBarProps) {
  const options = useReportOptions()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const switchId = useId()
  const { range, filters } = state
  const has = (k: FilterKey) => show.includes(k)
  const packages = (options?.packages ?? []).filter((p) =>
    (!filters.subject || p.subject_id === filters.subject) && (!filters.kind || p.kind === filters.kind) && (p.is_active || p.package_id === filters.package))
  const tiers = tierOptions(options, filters.package)
  const subjectName = (id: string | null) => options?.subjects.find((s) => s.subject_id === id)?.name
  const shown = show.filter((k) => filters[k]).length

  return (
    <div className="z-20 -mx-4 border-b border-border bg-background/95 px-4 pb-3 pt-2 backdrop-blur-sm sm:-mx-6 sm:px-6 md:sticky md:-top-6 lg:-mx-8 lg:px-8">
      {children}
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Range" className="grid w-full grid-cols-4 rounded-md border border-input bg-card p-0.5 sm:flex sm:w-auto">
          {QUICK_RANGES.map((q) => (
            <button
              key={q.id}
              type="button"
              aria-pressed={range.preset === q.id}
              onClick={() => state.setRange(quickRange(q.id))}
              className={cn('h-8 whitespace-nowrap rounded px-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:px-3', range.preset === q.id && 'bg-accent font-medium text-accent-foreground hover:text-accent-foreground')}
            >
              {q.name}
            </button>
          ))}
        </div>
        <DateRangeFilter value={range.preset === '365d' ? { ...range, preset: 'custom' } : range} onChange={state.setRange} className="max-w-full flex-1 sm:flex-none" />
        {granularity && <GranularitySelect value={state.granularity} onChange={(g) => state.update({ by: g === 'auto' ? null : g })} />}
        {show.length > 0 && (
          <Button type="button" variant="outline" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)} className="h-9 gap-2 bg-card lg:hidden">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />Filters{shown > 0 ? ` (${shown})` : ''}
          </Button>
        )}
        {compare && (
          <label htmlFor={switchId} className={cn('flex h-9 items-center gap-2 text-[13px] text-muted-foreground lg:ml-auto', !range.from && 'opacity-60')} title={range.from ? undefined : 'All time has no earlier period to compare with'}>
            <Switch id={switchId} checked={state.compare && !!range.from} disabled={!range.from} onCheckedChange={(on) => state.update({ compare: on ? null : '0' })} />
            Compare with previous period
          </label>
        )}
      </div>
      {show.length > 0 && (
        <div id={panelId} className={cn('mt-2 grid-cols-2 gap-2 lg:flex lg:flex-wrap', open ? 'grid' : 'hidden')}>
          {has('subject') && (
            <Picker label="Subject" all="All subjects" value={filters.subject} fallback="No subject" onChange={(v) => state.setFilter('subject', v)} className="lg:w-[190px]"
              choices={(options?.subjects ?? []).map((s) => ({ value: s.subject_id, label: s.name, hint: s.is_active ? undefined : 'Inactive' }))} />
          )}
          {has('package') && (
            <Picker label="Package" all="All packages" value={filters.package} fallback="Deleted package" onChange={(v) => state.setFilter('package', v)} className="lg:w-[220px]"
              choices={packages.map((p) => ({ value: p.package_id, label: p.name, hint: subjectName(p.subject_id) ?? 'No subject' }))} />
          )}
          {has('tier') && (
            <Select value={filters.tier || 'all'} onValueChange={(v) => state.setFilter('tier', v === 'all' ? '' : v)}>
              <SelectTrigger aria-label="Plan" className={cn('h-9 bg-card lg:w-[140px]', filters.tier && 'border-primary/40')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                {tiers.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                {filters.tier && !tiers.some((t) => t.key === filters.tier) && <SelectItem value={filters.tier}>{tierLabel(filters.tier)}</SelectItem>}
              </SelectContent>
            </Select>
          )}
          {has('kind') && (
            <Select value={filters.kind || 'all'} onValueChange={(v) => state.setFilter('kind', v === 'all' ? '' : v)}>
              <SelectTrigger aria-label="Package type" className={cn('h-9 bg-card lg:w-[170px]', filters.kind && 'border-primary/40')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All package types</SelectItem>
                {(['theory', 'practical', 'combo', 'other'] as const).map((k) => <SelectItem key={k} value={k}>{KIND_NAME[k]}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {has('type') && (
            <Select value={filters.type || 'all'} onValueChange={(v) => state.setFilter('type', v === 'all' ? '' : v)}>
              <SelectTrigger aria-label="Product type" className={cn('h-9 bg-card lg:w-[160px]', filters.type && 'border-primary/40')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {TYPE_ORDER.map((t) => <SelectItem key={t} value={t}>{TYPE_NAME[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {shown > 0 && (
            <Button type="button" variant="ghost" onClick={state.clearFilters} className="h-9 justify-start gap-1.5 px-2 text-muted-foreground">
              <X aria-hidden="true" className="h-4 w-4" />Clear filters
            </Button>
          )}
        </div>
      )}
      {cross && <CrossChips state={state} />}
    </div>
  )
}

/** Nothing sold with these filters. */
export function NoResults({ what, onClear }: { what: string; onClear?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Search aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{what}</p>
      {onClear && <Button variant="outline" size="sm" onClick={onClear}>Clear filters</Button>}
    </div>
  )
}
