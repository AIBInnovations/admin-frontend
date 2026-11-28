import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronsUpDown, RotateCw, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { apiService } from '@/services/api.service'
import { subjectsService } from '@/services/subjects.service'
import { packagesService } from '@/services/packages.service'
import { apiErrorMessage } from '@/components/common/detail'
import type { VisibleTo } from '@/services/liveSessions.service'
import { Field, SelectControl, type ControlProps } from './fields'

export interface PickOption { id: string; name: string; sub?: string }

// ── Loading options ──────────────────────────────────────────────────────
export interface OptionList { options: PickOption[]; loading: boolean; error: string | null; reload: () => void }

/** Loads a list of options once (and again on `reload`); late answers are dropped. */
export function useOptions(load: () => Promise<PickOption[]>, enabled = true): OptionList {
  const [options, setOptions] = useState<PickOption[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    if (!enabled) return
    let alive = true
    setLoading(true)
    setError(null)
    loadRef.current()
      .then((list) => { if (alive) setOptions(list) })
      .catch((e) => { if (alive) setError(apiErrorMessage(e, 'This list could not be loaded.')) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [enabled, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { options, loading, error, reload }
}

interface Paged<T> { success: boolean; message?: string; data?: { entities: T[]; pagination?: { totalPages?: number } } }

/** Every page of a list endpoint that allows 100 rows per page. */
export async function loadAll<T>(page: (n: number) => Promise<Paged<T>>, max = 10): Promise<T[]> {
  const rows: T[] = []
  for (let n = 1; n <= max; n += 1) {
    const res = await page(n)
    if (!res.success || !res.data) throw new Error(res.message || 'This list could not be loaded.')
    rows.push(...(res.data.entities || []))
    if (n >= (res.data.pagination?.totalPages || 1)) break
  }
  return rows
}

export const loadSubjects = (activeOnly: boolean) => async (): Promise<PickOption[]> => {
  const rows = await loadAll((page) => subjectsService.getSubjects({ page, limit: 100, sort_by: 'name', sort_order: 'asc', ...(activeOnly ? { is_active: true } : {}) }) as never)
  return (rows as { _id: string; name: string; is_active?: boolean }[]).map((s) => ({ id: s._id, name: s.name, sub: s.is_active === false ? 'Inactive' : undefined }))
}

export const loadPackages = async (): Promise<PickOption[]> => {
  const rows = await loadAll((page) => packagesService.getAll({ page, limit: 100, is_active: true }))
  return rows.map((p) => ({ id: p._id, name: p.name, sub: p.subject_id?.name }))
}

interface FacultyRow { _id: string; name: string; subjects?: ({ name?: string } | string)[]; subject_id?: { name?: string } | string | null; specialization?: string; is_active?: boolean }

/** A faculty member may teach several subjects; older rows have one, or only a specialization. */
export function facultySubjects(f: FacultyRow): string {
  const many = (f.subjects || []).map((s) => (typeof s === 'object' ? s?.name : null)).filter(Boolean)
  if (many.length) return many.join(', ')
  if (f.subject_id && typeof f.subject_id === 'object' && f.subject_id.name) return f.subject_id.name
  return f.specialization || ''
}

export const loadFaculty = async (): Promise<PickOption[]> => {
  const rows = await loadAll((page) => apiService.get<{ entities: FacultyRow[]; pagination?: { totalPages?: number } }>(`admin/faculty?limit=100&page=${page}`))
  return rows.map((f) => ({ id: f._id, name: f.name, sub: [facultySubjects(f), f.is_active === false ? 'inactive' : ''].filter(Boolean).join(', ') || undefined }))
}

// ── One of many ──────────────────────────────────────────────────────────
interface RefPickerProps {
  control: ControlProps
  value: string
  onChange: (id: string) => void
  list: OptionList
  placeholder?: string
  /** Adds a first row that clears the value. */
  noneLabel?: string
  emptyText?: string
  /** Shown while the chosen id is not in the list (deleted, archived or filtered out). */
  missingLabel?: string
  disabled?: boolean
  onOpen?: () => void
}

export function RefPicker({ control, value, onChange, list, placeholder = 'Choose one', noneLabel, emptyText = 'Nothing matches.', missingLabel = 'No longer available', disabled, onOpen }: RefPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = list.options.find((o) => o.id === value)
  const label = selected?.name ?? (value ? (list.loading ? 'Loading…' : missingLabel) : noneLabel ?? placeholder)

  const pick = (id: string) => { onChange(id); setOpen(false) }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) onOpen?.() }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between bg-card px-3 font-normal aria-invalid:border-danger', !selected && 'text-muted-foreground')}
          {...control}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown aria-hidden="true" className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[max(var(--radix-popover-trigger-width),260px)] max-w-[calc(100vw-2rem)] p-0" align="start" collisionPadding={12}>
        <Command>
          <CommandInput placeholder="Search" />
          <CommandList>
            {list.loading && <p className="px-3 py-4 text-sm text-muted-foreground" role="status">Loading…</p>}
            {list.error && (
              <div className="space-y-2 px-3 py-4 text-sm" role="alert">
                <p className="text-danger">{list.error}</p>
                <Button type="button" variant="outline" size="sm" onClick={list.reload}><RotateCw />Try again</Button>
              </div>
            )}
            {!list.loading && !list.error && <CommandEmpty>{emptyText}</CommandEmpty>}
            {!list.loading && !list.error && (
              <CommandGroup>
                {noneLabel && (
                  <CommandItem value={`__none ${noneLabel}`} onSelect={() => pick('')}>
                    <Check aria-hidden="true" className={cn('h-4 w-4', value ? 'opacity-0' : 'opacity-100')} />
                    <span className="text-muted-foreground">{noneLabel}</span>
                  </CommandItem>
                )}
                {list.options.map((o) => (
                  <CommandItem key={o.id} value={`${o.name} ${o.sub ?? ''} ${o.id}`} onSelect={() => pick(o.id)}>
                    <Check aria-hidden="true" className={cn('h-4 w-4 shrink-0', value === o.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="min-w-0">
                      <span className="block truncate">{o.name}</span>
                      {o.sub && <span className="block truncate text-xs text-muted-foreground">{o.sub}</span>}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ── Several of many ──────────────────────────────────────────────────────
interface RefChecklistProps {
  id: string
  label: string
  noun: [one: string, many: string]
  value: string[]
  onChange: (ids: string[]) => void
  list: OptionList
  error?: string
  disabled?: boolean
}

export function RefChecklist({ id, label, noun, value, onChange, list, error, disabled }: RefChecklistProps) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = useMemo(() => list.options.filter((o) => !q || `${o.name} ${o.sub ?? ''}`.toLowerCase().includes(q)), [list.options, q])
  const missing = list.loading || list.error ? [] : value.filter((v) => !list.options.some((o) => o.id === v))
  const toggle = (oid: string, on: boolean) => onChange(on ? [...value, oid] : value.filter((v) => v !== oid))

  return (
    <div role="group" aria-labelledby={`${id}-label`} aria-describedby={error ? `${id}-error` : undefined} className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p id={`${id}-label`} className="text-[13px] font-medium">{label}<span className="text-danger" aria-hidden="true"> *</span></p>
        <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">{value.length} {value.length === 1 ? noun[0] : noun[1]} chosen</p>
      </div>
      <div className={cn('rounded-md border bg-card', error ? 'border-danger' : 'border-input')}>
        <div className="relative border-b border-border">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id={id}
            aria-invalid={error ? true : undefined}
            aria-label={`Search ${noun[1]}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }}
            placeholder={`Search ${noun[1]}`}
            disabled={disabled}
            className="h-9 w-full rounded-t-md bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1.5">
          {list.loading && <div className="space-y-2 p-1.5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-5 w-2/3" />)}</div>}
          {list.error && (
            <div className="space-y-2 p-2 text-sm" role="alert">
              <p className="text-danger">{list.error}</p>
              <Button type="button" variant="outline" size="sm" onClick={list.reload}><RotateCw />Try again</Button>
            </div>
          )}
          {!list.loading && !list.error && shown.length === 0 && (
            <p className="px-2 py-3 text-sm text-muted-foreground">{q ? `No ${noun[1]} match "${query.trim()}".` : `There are no active ${noun[1]} yet.`}</p>
          )}
          {!list.error && shown.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 hover:bg-muted">
              <Checkbox checked={value.includes(o.id)} onCheckedChange={(c) => toggle(o.id, c === true)} disabled={disabled} />
              <span className="min-w-0 text-sm">
                {o.name}
                {o.sub && <span className="text-muted-foreground"> ({o.sub})</span>}
              </span>
            </label>
          ))}
        </div>
      </div>
      {missing.length > 0 && (
        <p className="flex flex-wrap items-center gap-2 text-[13px] text-warning">
          {missing.length} chosen {missing.length === 1 ? noun[0] : noun[1]} no longer {missing.length === 1 ? 'exists or is' : 'exist or are'} inactive.
          <button type="button" className="inline-flex items-center gap-1 font-medium underline underline-offset-2" onClick={() => onChange(value.filter((v) => !missing.includes(v)))}>
            <X aria-hidden="true" className="h-3.5 w-3.5" />Remove
          </button>
        </p>
      )}
      {error && <p id={`${id}-error`} className="text-[13px] text-danger">{error}</p>}
    </div>
  )
}

// ── Who can see it ───────────────────────────────────────────────────────
export interface VisibilityValue { to: VisibleTo; subjects: string[]; packages: string[] }
export const EVERYONE: VisibilityValue = { to: 'all', subjects: [], packages: [] }

export function visibilityError(v: VisibilityValue): string | undefined {
  if (v.to === 'subject' && v.subjects.length === 0) return 'Choose at least one subject'
  if (v.to === 'package' && v.packages.length === 0) return 'Choose at least one package'
  return undefined
}

/** The visibility fields every content API takes. */
export function visibilityPayload(v: VisibilityValue) {
  return {
    visible_to: v.to,
    visible_to_subjects: v.to === 'subject' ? v.subjects : [],
    visible_to_packages: v.to === 'package' ? v.packages : [],
  }
}

interface VisibilityFieldsProps {
  noun: string
  value: VisibilityValue
  onChange: (v: VisibilityValue) => void
  error?: string
  disabled?: boolean
}

export function VisibilityFields({ noun, value, onChange, error, disabled }: VisibilityFieldsProps) {
  const subjects = useOptions(loadSubjects(true), value.to === 'subject')
  const packages = useOptions(loadPackages, value.to === 'package')
  const help: Record<VisibleTo, string> = {
    all: `${noun} is visible to all users.`,
    subject: `Only users who have selected one of the chosen subjects will see this ${noun.toLowerCase()}.`,
    package: `Only users who have purchased one of the chosen packages will see this ${noun.toLowerCase()}.`,
  }
  return (
    <div className="space-y-4">
      <Field id="visible_to" label="Visible To" hint={help[value.to]}>
        {(control) => (
          <SelectControl
            control={control}
            value={value.to}
            onChange={(to) => onChange({ to: to as VisibleTo, subjects: [], packages: [] })}
            disabled={disabled}
            choices={[
              { value: 'all', label: 'All Users' },
              { value: 'subject', label: 'Subject Specific' },
              { value: 'package', label: 'Package Specific' },
            ]}
          />
        )}
      </Field>
      {value.to === 'subject' && (
        <RefChecklist id="visible-subjects" label="Select Subjects" noun={['subject', 'subjects']} value={value.subjects} onChange={(s) => onChange({ ...value, subjects: s })} list={subjects} error={error} disabled={disabled} />
      )}
      {value.to === 'package' && (
        <RefChecklist id="visible-packages" label="Select Packages" noun={['package', 'packages']} value={value.packages} onChange={(p) => onChange({ ...value, packages: p })} list={packages} error={error} disabled={disabled} />
      )}
    </div>
  )
}
