import { useEffect, useId, useState } from 'react'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { subjectsService } from '@/services/subjects.service'
import { packagesService } from '@/services/packages.service'
import { facultyService } from '@/services/faculty.service'
import { feedbackService, type Assignee } from '@/services/feedback.service'
import { useAuth } from '@/contexts/AuthContext'

export interface Option { value: string; label: string; hint?: string }

interface FilterSelectProps {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  /** Adds a search box (long lists). */
  searchable?: boolean
  /** What "nothing chosen" reads as. */
  anyLabel: string
  className?: string
}

/** One filter. The button says the filter's name until something is chosen. */
export function FilterSelect({ label, value, options, onChange, searchable, anyLabel, className }: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  const chosen = options.find((o) => o.value === value)
  const text = value ? chosen?.label ?? 'Chosen' : anyLabel
  const pick = (v: string) => { onChange(v); setOpen(false) }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button" variant="outline" role="combobox" aria-expanded={open} aria-label={`${label}: ${text}`}
          className={cn('h-9 w-full justify-between gap-2 bg-card font-normal sm:w-auto sm:max-w-[220px]', value && 'border-primary/40 bg-accent text-accent-foreground', className)}
        >
          <span className="truncate">{text}</span>
          <ChevronsUpDown aria-hidden="true" className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" collisionPadding={12} className="w-[min(280px,calc(100vw-2rem))] p-0">
        <Command>
          {searchable && <CommandInput placeholder={`Search ${label.toLowerCase()}`} />}
          <CommandList>
            <CommandEmpty>Nothing matches.</CommandEmpty>
            <CommandGroup>
              {[{ value: '', label: anyLabel } as Option, ...options].map((o) => (
                <CommandItem key={o.value || 'any'} value={`${o.label} ${o.value}`} onSelect={() => pick(o.value)}>
                  <Check aria-hidden="true" className={cn('mr-2 h-4 w-4 shrink-0', value === o.value ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="ml-2 shrink-0 text-xs text-muted-foreground">{o.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** Search that waits for a pause in typing, and follows the URL (Back, cleared filters). */
export function SearchField({ value, onChange, label, className }: { value: string; onChange: (v: string) => void; label: string; className?: string }) {
  const id = useId()
  const [text, setText] = useState(value)
  useEffect(() => { setText(value) }, [value])
  useEffect(() => {
    if (text.trim() === value) return
    const t = setTimeout(() => onChange(text.trim().slice(0, 100)), 350)
    return () => clearTimeout(t)
    // onChange is a fresh closure every render; only the text matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, value])
  return (
    <div className={cn('relative w-full sm:w-72', className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id} value={text} maxLength={100} placeholder={label} autoComplete="off"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onChange(text.trim()) }}
        className="h-9 bg-card pl-9 pr-9"
      />
      {text && (
        <button type="button" aria-label="Clear search" onClick={() => { setText(''); onChange('') }}
          className="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

/**
 * The lists behind the filters. Each loads once and on its own: one that fails
 * (or that this admin may not read) leaves its filter out, never the page.
 */
export function useFilterOptions() {
  const { hasPermission } = useAuth()
  const [subjects, setSubjects] = useState<Option[]>([])
  const [packages, setPackages] = useState<(Option & { subject: string | null })[]>([])
  const [faculty, setFaculty] = useState<Option[]>([])
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const canSubjects = hasPermission('subjects.read')
  const canPackages = hasPermission('packages.read')
  const canFaculty = hasPermission('faculty.read')

  useEffect(() => {
    let live = true
    const set = <T,>(fn: (v: T) => void) => (v: T) => { if (live) fn(v) }
    if (canSubjects) {
      subjectsService.getSubjects({ limit: 200, sort_by: 'name', sort_order: 'asc' })
        .then((r) => set(setSubjects)((r.data?.entities ?? []).map((s) => ({ value: s._id, label: s.name })))).catch(() => {})
    }
    if (canPackages) {
      packagesService.getAll({ limit: 200 })
        .then((r) => set(setPackages)((r.data?.entities ?? []).map((p) => {
          const subject = p.subject_id as unknown as { _id: string; name: string } | string | null
          return { value: p._id, label: p.name, subject: typeof subject === 'string' ? subject : subject?._id ?? null }
        }))).catch(() => {})
    }
    if (canFaculty) {
      facultyService.getAll({ limit: 200, sort_by: 'name', sort_order: 'asc' })
        .then((r) => set(setFaculty)([...(r.data?.entities ?? []).map((f) => ({ value: f._id, label: f.name, hint: f.is_active ? undefined : 'Inactive' })), { value: 'none', label: 'No lecturer set' }])).catch(() => {})
    }
    feedbackService.assignees().then(set(setAssignees)).catch(() => {})
    return () => { live = false }
  }, [canSubjects, canPackages, canFaculty])

  return { subjects, packages, faculty, assignees }
}
