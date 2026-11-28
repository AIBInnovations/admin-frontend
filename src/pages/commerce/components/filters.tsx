import { useState, type ReactNode } from 'react'
import { Check, ChevronsUpDown, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface Option { label: string; value: string }

/** One labelled choice. '' means no limit. */
export function FilterSelect({ label, value, onChange, options, all }: { label: string; value: string; onChange: (v: string) => void; options: Option[]; all: string }) {
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <Select value={value || 'all'} onValueChange={(v) => onChange(v === 'all' ? '' : v)}>
        <SelectTrigger className="h-9 bg-card" aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{all}</SelectItem>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

/** The same, with a search box, for long lists. */
export function FilterCombo({ label, value, onChange, options, all }: { label: string; value: string; onChange: (v: string) => void; options: Option[]; all: string }) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)
  const pick = (v: string) => { onChange(v); setOpen(false) }
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} aria-label={label} className="h-9 w-full justify-between gap-2 bg-card px-3 font-normal shadow-sm">
            <span className="truncate">{current?.label || (value ? 'Not found' : all)}</span>
            <ChevronsUpDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" collisionPadding={12} className="w-[min(320px,calc(100vw-1.5rem))] p-0">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}`} />
            <CommandList>
              <CommandEmpty>Nothing found.</CommandEmpty>
              <CommandGroup>
                <CommandItem value={all} onSelect={() => pick('')}><Check aria-hidden="true" className={cn('mr-2 h-4 w-4', value ? 'opacity-0' : 'opacity-100')} />{all}</CommandItem>
                {options.map((o) => (
                  <CommandItem key={o.value} value={`${o.label} ${o.value}`} onSelect={() => pick(o.value)}>
                    <Check aria-hidden="true" className={cn('mr-2 h-4 w-4 shrink-0', value === o.value ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/** The extra filters, folded away until needed. Opens by itself when one is set. */
export function MoreFilters({ count, action, children }: { count: number; action?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(count > 0)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" aria-expanded={open} aria-controls="more-filters" onClick={() => setOpen((o) => !o)} className="h-9 bg-card text-sm">
          <SlidersHorizontal aria-hidden="true" />
          {open ? 'Fewer filters' : 'More filters'}
          {count > 0 && <span className="rounded-full bg-accent px-1.5 text-xs font-semibold tabular-nums text-accent-foreground">{count}</span>}
        </Button>
        {action}
      </div>
      {open && (
        <div id="more-filters" className="grid gap-x-3 gap-y-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          {children}
        </div>
      )}
    </div>
  )
}

export function ClearFilters({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} className="h-9 text-sm">
      <X aria-hidden="true" />Clear filters
    </Button>
  )
}

/** Figures for the whole filtered set, above a list. */
export function Totals({ items, loading }: { items: { label: string; value: ReactNode; hint?: string }[]; loading?: boolean }) {
  return (
    <dl aria-busy={loading} className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border shadow-card transition-opacity duration-150 lg:grid-cols-4', loading && 'opacity-60')}>
      {items.map((i) => (
        <div key={i.label} className="min-w-0 bg-card px-4 py-3">
          <dt className="text-[13px] text-muted-foreground">{i.label}</dt>
          <dd className="mt-0.5 break-words font-display text-lg font-semibold leading-tight tabular-nums tracking-[-0.01em]">{i.value}</dd>
          {/* hint '' = still loading: its line is held so the tiles do not grow when it lands */}
          {i.hint !== undefined && <dd aria-hidden={i.hint ? undefined : true} className="mt-0.5 min-h-[1.5em] text-xs text-muted-foreground">{i.hint}</dd>}
        </div>
      ))}
    </dl>
  )
}
