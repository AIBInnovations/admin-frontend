import { cloneElement, isValidElement, useEffect, useId, useMemo, useState, type ComponentType, type ReactElement, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Check, ChevronsUpDown, Loader2, RotateCw, Search, UserCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usersService, type User } from '@/services/users.service'
import { useLatestFetch } from '@/hooks/useLatestFetch'
import { errText } from './lib'
import { StudentLink } from '@/components/students/StudentLink'

/** Building blocks shared by the user, package, settings and notification forms. */

// ── Fields ───────────────────────────────────────────────────────────────

interface FieldProps {
  label: ReactNode
  /** Links the label to the control. The control also gets its error announced. */
  id: string
  required?: boolean
  optional?: boolean
  error?: string
  hint?: ReactNode
  className?: string
  /** One control. It receives id and the aria attributes. */
  children: ReactNode
  /** Right of the label: a counter, a link. */
  aside?: ReactNode
}

export function Field({ label, id, required, optional, error, hint, className, children, aside }: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
      id: (children.props as { id?: string }).id ?? id,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy,
      ...(required ? { 'aria-required': true } : {}),
    })
    : children
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="text-[13px] font-medium">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
          {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
        </Label>
        {aside && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{aside}</span>}
      </div>
      {control}
      {error
        ? <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p>
        : hint ? <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function ToggleRow({ id, label, description, checked, onChange, disabled }: {
  id: string; label: string; description?: ReactNode; checked: boolean; onChange: (c: boolean) => void; disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
        {description && <p id={`${id}-desc`} className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} aria-describedby={description ? `${id}-desc` : undefined} />
    </div>
  )
}

// ── Choices ──────────────────────────────────────────────────────────────

interface Choice<V extends string> {
  value: V
  label: ReactNode
  hint?: ReactNode
  icon?: ComponentType<{ className?: string }>
  disabled?: boolean
  /** Right-aligned detail, e.g. a price. */
  meta?: ReactNode
}

/** A short set of options shown side by side. Arrow keys move between them. */
export function Segmented<V extends string>({ value, onChange, options, disabled, label, className }: {
  value: V; onChange: (v: V) => void; options: Choice<V>[]; disabled?: boolean; label: string; className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1', className)} onKeyDown={(e) => moveChoice(e, options, value, onChange)}>
      {options.map((o) => {
        const on = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} disabled={disabled || o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 disabled:opacity-50',
              on ? 'bg-card text-foreground shadow-card ring-1 ring-border' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon && <Icon className={cn('h-3.5 w-3.5', on && 'text-primary')} />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Larger choices with a line of explanation. */
export function ChoiceCards<V extends string>({ value, onChange, options, disabled, label, columns = 'sm:grid-cols-2' }: {
  value: V | ''; onChange: (v: V) => void; options: Choice<V>[]; disabled?: boolean; label: string; columns?: string
}) {
  const focusable = value || options.find((o) => !o.disabled)?.value
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-2.5', columns)} onKeyDown={(e) => moveChoice(e, options, value as V, onChange)}>
      {options.map((o) => {
        const on = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value} type="button" role="radio" aria-checked={on} tabIndex={o.value === focusable ? 0 : -1} disabled={disabled || o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex min-w-0 items-start gap-3 rounded-lg border p-3.5 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55',
              on ? 'border-primary bg-accent ring-1 ring-primary' : 'border-border bg-card hover:border-primary/40',
            )}
          >
            <span aria-hidden="true" className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card')}>
              {on && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {Icon && <Icon className={cn('h-4 w-4 shrink-0', on ? 'text-primary' : 'text-muted-foreground')} />}
                <span className="min-w-0 break-words">{o.label}</span>
              </span>
              {o.hint && <span className="mt-0.5 block text-xs text-muted-foreground">{o.hint}</span>}
            </span>
            {o.meta && <span className="shrink-0 text-right text-sm font-medium tabular-nums">{o.meta}</span>}
          </button>
        )
      })}
    </div>
  )
}

function moveChoice<V extends string>(e: React.KeyboardEvent, options: Choice<V>[], value: V, onChange: (v: V) => void) {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
  if (!step) return
  e.preventDefault()
  const usable = options.filter((o) => !o.disabled)
  const i = usable.findIndex((o) => o.value === value)
  const next = usable[(i + step + usable.length) % usable.length]
  if (!next) return
  onChange(next.value)
  const group = e.currentTarget as HTMLElement
  requestAnimationFrame(() => group.querySelector<HTMLElement>('[role=radio][aria-checked=true]')?.focus())
}

// ── Searchable select ────────────────────────────────────────────────────

export interface SelectOption { value: string; label: string; hint?: string; disabled?: boolean }

interface SearchSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  disabled?: boolean
  /** Shown when the saved value is not in the list (deleted or inactive). */
  missingLabel?: string
  className?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}

export function SearchSelect({ id, value, onChange, options, placeholder, searchPlaceholder = 'Search', emptyText = 'Nothing found', loading, error, onRetry, disabled, missingLabel, className, ...aria }: SearchSelectProps) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const selected = options.find((o) => o.value === value)
  if (error && !loading) {
    return (
      <div className="flex h-9 items-center justify-between gap-2 rounded-md border border-danger/40 bg-danger-soft px-3 text-sm text-danger">
        <span className="truncate">{error}</span>
        {onRetry && <button type="button" onClick={onRetry} className="shrink-0 font-medium underline underline-offset-2">Try again</button>}
      </div>
    )
  }
  const text = selected?.label ?? (value ? (loading ? 'Loading…' : missingLabel ?? 'No longer available') : loading ? 'Loading…' : placeholder)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id} type="button" variant="outline" role="combobox" aria-expanded={open} aria-controls={listId} disabled={disabled || (loading && !options.length)}
          className={cn('h-9 w-full justify-between gap-2 bg-background px-3 font-normal', !selected && 'text-muted-foreground', aria['aria-invalid'] && 'border-danger', className)}
          {...aria}
        >
          <span className="min-w-0 truncate text-left" title={typeof text === 'string' ? text : undefined}>{text}</span>
          {loading ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin opacity-60" /> : <ChevronsUpDown aria-hidden="true" className="h-3.5 w-3.5 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[max(var(--radix-popover-trigger-width),260px)] max-w-[calc(100vw-2rem)] p-0" align="start" collisionPadding={12}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList id={listId}>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.value} value={`${o.label} ${o.hint ?? ''} ${o.value}`} disabled={o.disabled} onSelect={() => { onChange(o.value); setOpen(false) }}>
                  <Check aria-hidden="true" className={cn('mr-2 h-4 w-4 shrink-0', value === o.value ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0">
                    <span className="block break-words">{o.label}</span>
                    {o.hint && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ── Editor page frame ────────────────────────────────────────────────────

/** The action bar of a routed editor: stays in view, full width of the page. */
export function EditorBar({ onCancel, cancelHref, submitLabel, savingLabel, saving, disabled, error, note, icon: Icon, tone = 'default', type = 'submit', onSubmit, extra }: {
  onCancel?: () => void
  cancelHref?: string
  submitLabel: string
  savingLabel: string
  saving: boolean
  disabled?: boolean
  error?: string | null
  note?: ReactNode
  icon?: ComponentType<{ className?: string }>
  tone?: 'default' | 'destructive'
  type?: 'submit' | 'button'
  onSubmit?: () => void
  extra?: ReactNode
}) {
  return (
    <div className="sticky -bottom-4 z-20 -mx-4 -mb-4 mt-6 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6 lg:-mx-8 lg:px-8" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className={cn('min-w-0 text-[13px]', (error || note) && 'mb-2.5 sm:mb-0')} aria-live="polite">
          {error ? <p role="alert" className="flex items-start gap-1.5 text-danger"><AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="min-w-0 break-words">{error}</span></p> : note ? <div className="text-muted-foreground">{note}</div> : null}
        </div>
        <div className="flex shrink-0 gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
          {extra}
          {cancelHref
            ? <Button type="button" variant="outline" asChild className="bg-card"><Link to={cancelHref}>Cancel</Link></Button>
            : onCancel && <Button type="button" variant="outline" className="bg-card" onClick={onCancel} disabled={saving}>Cancel</Button>}
          <Button type={type} onClick={onSubmit} variant={tone === 'destructive' ? 'destructive' : 'default'} disabled={saving || disabled}>
            {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
            {saving ? savingLabel : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** A failed refresh while older data stays on screen. */
export function StaleNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 text-sm text-warning">
      <span className="min-w-0">Could not refresh: {message} Showing what was loaded before.</span>
      <Button size="sm" variant="outline" className="bg-card" onClick={onRetry}><RotateCw className="h-3.5 w-3.5" />Try again</Button>
    </div>
  )
}

export function Notice({ tone = 'info', title, children, className }: { tone?: 'info' | 'warning' | 'danger' | 'success'; title?: ReactNode; children?: ReactNode; className?: string }) {
  const tones = {
    info: 'border-primary/15 bg-accent text-accent-foreground',
    warning: 'border-warning/25 bg-warning-soft text-warning',
    danger: 'border-danger/25 bg-danger-soft text-danger',
    success: 'border-success/25 bg-success-soft text-success',
  }
  return (
    <div role={tone === 'danger' ? 'alert' : 'note'} className={cn('rounded-lg border px-4 py-3 text-sm', tones[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn('text-[13px] leading-relaxed', title && 'mt-0.5')}>{children}</div>}
    </div>
  )
}

// ── Confirmation dock ────────────────────────────────────────────────────

interface ConfirmDockProps {
  open: boolean
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  confirmLabel: string
  workingLabel: string
  tone?: 'default' | 'destructive'
  onConfirm: () => Promise<void> | void
  onClose: () => void
  disabled?: boolean
  cancelLabel?: string
}

/** A question docked at the bottom. Stays open with the reason if the action fails. */
export function ConfirmDock({ open, title, description, children, confirmLabel, workingLabel, tone = 'destructive', onConfirm, onClose, disabled, cancelLabel = 'Cancel' }: ConfirmDockProps) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (open) { setError(null); setWorking(false) } }, [open])
  const run = async () => {
    if (working) return
    setWorking(true)
    setError(null)
    try {
      await onConfirm()
      setWorking(false)
      onClose()
    } catch (err) {
      setError(errText(err))
      setWorking(false)
    }
  }
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next && !working) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription asChild><div>{description}</div></AlertDialogDescription> : <AlertDialogDescription className="sr-only">Confirm this action</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={working}>{cancelLabel}</AlertDialogCancel>
          <Button variant={tone === 'destructive' ? 'destructive' : 'default'} onClick={run} disabled={working || disabled}>
            {working && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
            {working ? workingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── People ───────────────────────────────────────────────────────────────

export function PersonAvatar({ name, photo, size = 'md' }: { name?: string | null; photo?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const [broken, setBroken] = useState(false)
  const box = { sm: 'h-8 w-8 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-14 w-14 text-lg' }[size]
  const initials = (name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
  return (
    <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-semibold text-accent-foreground', box)}>
      {photo && !broken
        ? <img src={photo} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
        : initials || <UserCircle className="h-1/2 w-1/2" />}
    </span>
  )
}

export const personName = (u?: { name?: string | null; phone_number?: string | null; email?: string | null } | null) =>
  u?.name?.trim() || u?.phone_number || u?.email || 'Unnamed student'

/** Adds students one at a time by name, phone, email or student ID. */
export function StudentPicker({ id, value, onChange, disabled, label, placeholder = 'Search by name, phone, email or student ID', activeOnly = true }: {
  id: string; value: User[]; onChange: (users: User[]) => void; disabled?: boolean; label: string; placeholder?: string; activeOnly?: boolean
}) {
  const [query, setQuery] = useState('')
  const { results, searching, error, searched } = useStudentSearch(query, activeOnly)
  const chosen = useMemo(() => new Set(value.map((u) => u._id)), [value])
  const left = results.filter((u) => !chosen.has(u._id))
  return (
    <div className="space-y-2.5">
      {value.length > 0 && (
        <ul aria-label={`${label}: chosen`} className="flex flex-wrap gap-1.5">
          {value.map((u) => (
            <li key={u._id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-card py-0.5 pl-2.5 pr-1 text-[13px]">
              {/* A new tab, so the form being filled in here is not lost */}
              <span className="truncate"><StudentLink student={u} fallback={personName(u)} newTab className="font-normal" /></span>
              <button type="button" disabled={disabled} onClick={() => onChange(value.filter((x) => x._id !== u._id))} aria-label={`Remove ${personName(u)}`} className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} aria-label={label} value={query} disabled={disabled} autoComplete="off" onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="pl-9 pr-9"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (left.length === 1) { onChange([...value, left[0]]); setQuery('') } } }} />
        {searching && <Loader2 aria-hidden="true" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
      <div aria-live="polite">
        {error && <p className="text-xs text-danger">{error}</p>}
        {left.length > 0 && (
          <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card">
            {left.map((u) => (
              <li key={u._id}>
                <button type="button" disabled={disabled} onClick={() => { onChange([...value, u]); setQuery('') }} className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent/50">
                  <PersonAvatar name={u.name} photo={u.photo_url} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{personName(u)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{[u.phone_number, u.email].filter(Boolean).join(' · ')}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {searched && !searching && !error && left.length === 0 && (
          <p className="text-xs text-muted-foreground">{results.length ? 'Everyone found is already added.' : `No student matches "${query.trim()}".`}</p>
        )}
      </div>
    </div>
  )
}

/** Debounced student search; a late answer never replaces a newer one. */
export function useStudentSearch(query: string, activeOnly = false) {
  const [results, setResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { nextFetchId, isStale } = useLatestFetch()
  useEffect(() => {
    const q = query.trim()
    const fetchId = nextFetchId()
    setError(null)
    if (q.length < 2) { setResults([]); setSearching(false); setSearched(false); return }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await usersService.getAll({ search: q, limit: 10, ...(activeOnly ? { is_active: true } : {}) })
        if (isStale(fetchId)) return
        setResults(res.data?.entities || [])
        setSearched(true)
      } catch (err) {
        if (isStale(fetchId)) return
        setResults([])
        setError(errText(err, 'The search did not work. Try again.'))
      } finally {
        if (!isStale(fetchId)) setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, activeOnly, nextFetchId, isStale])
  return { results, searching, searched, error }
}

// ── Small states ─────────────────────────────────────────────────────────

export function RowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5"><Skeleton className="h-4 w-1/3" /><Skeleton className="ml-auto h-4 w-20" /><Skeleton className="h-4 w-16" /></div>
      ))}
    </div>
  )
}

/** Accessible progress bar for uploads. */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const v = Math.min(100, Math.max(0, Math.round(value)))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground"><span>{label}</span><span className="tabular-nums">{v}%</span></div>
      <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}
