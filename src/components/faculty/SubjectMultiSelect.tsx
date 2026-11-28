import { useId, useState } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

export interface SubjectOption { _id: string; name: string; is_active?: boolean }

const MAX = 20

interface SubjectMultiSelectProps {
  id?: string
  /** Subjects to choose from. */
  options: SubjectOption[]
  /** Chosen subjects, primary first. */
  value: SubjectOption[]
  onChange: (next: SubjectOption[]) => void
  disabled?: boolean
  error?: string
  describedBy?: string
}

/** Several subjects, one of them primary. The primary is simply the first one. */
export function SubjectMultiSelect({ id, options, value, onChange, disabled, error, describedBy }: SubjectMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const group = useId()
  const chosen = new Set(value.map((v) => v._id))
  // A linked subject that is switched off or deleted is not offered, but stays listed until it is removed
  const toggle = (s: SubjectOption) => onChange(chosen.has(s._id) ? value.filter((v) => v._id !== s._id) : [...value, s])
  const makePrimary = (s: SubjectOption) => onChange([s, ...value.filter((v) => v._id !== s._id)])

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id} type="button" variant="outline" role="combobox" aria-expanded={open} aria-invalid={!!error} aria-describedby={describedBy} disabled={disabled}
            className={cn('h-9 w-full justify-between bg-card font-normal', error && 'border-danger')}
          >
            <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>
              {value.length === 0 ? 'Choose subjects' : value.length === 1 ? '1 subject' : `${value.length} subjects`}
            </span>
            <ChevronsUpDown aria-hidden="true" className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" collisionPadding={12} className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-0">
          <Command>
            <CommandInput placeholder="Search subjects" />
            <CommandList>
              <CommandEmpty>No subject matches.</CommandEmpty>
              <CommandGroup>
                {options.map((s) => (
                  <CommandItem key={s._id} value={`${s.name} ${s._id}`} disabled={!chosen.has(s._id) && value.length >= MAX} onSelect={() => toggle(s)} aria-selected={chosen.has(s._id)}>
                    <span className={cn('mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border', chosen.has(s._id) ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}>
                      {chosen.has(s._id) && <Check aria-hidden="true" className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{s.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border bg-card" aria-label="Chosen subjects">
          {value.map((s, i) => (
            <li key={s._id} className="flex items-center gap-3 px-3 py-2">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-sm pointer-coarse:min-h-10">
                <input type="radio" name={group} checked={i === 0} onChange={() => makePrimary(s)} disabled={disabled} className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]" />
                <span className="min-w-0 truncate">{s.name}{s.is_active === false && <span className="text-muted-foreground"> (inactive)</span>}</span>
                {i === 0 && <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">Primary</span>}
              </label>
              <button type="button" aria-label={`Remove ${s.name}`} disabled={disabled} onClick={() => toggle(s)} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
