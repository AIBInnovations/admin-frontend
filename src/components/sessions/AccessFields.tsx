import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, RotateCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { packagesService } from '@/services/packages.service'
import { loadAll, useOptions, type OptionList, type PickOption } from '@/components/forms/editor/pickers'
import { accessSentence, type AccessMode } from './sessionAccess'

/** Every package (active and inactive), named with its type and subject. */
export const loadAccessPackages = async (): Promise<PickOption[]> => {
  const rows = await loadAll((page) => packagesService.getAll({ page, limit: 100 }))
  return rows.map((p) => ({
    id: p._id,
    name: p.name,
    sub: [p.package_type_id?.name, p.subject_id?.name, p.is_active === false ? 'inactive' : p.publish_status === 'draft' ? 'draft' : '']
      .filter(Boolean)
      .join(' · ') || undefined,
  }))
}

const CHOICES: { value: AccessMode; title: (price: string) => string; hint: string }[] = [
  { value: 'everyone', title: () => 'Everyone (as today)', hint: 'Anyone can register. Free or paid follows Pricing below.' },
  {
    value: 'subscribers_free',
    title: (price) => `Package subscribers join free, others pay ${price}`,
    hint: 'Subscribers of the chosen packages register free. Everyone else pays the session price.',
  },
  { value: 'subscribers_only', title: () => 'Only package subscribers', hint: 'Only subscribers of the chosen packages can register and join. Nobody can buy a seat.' },
]

interface AccessFieldsProps {
  mode: AccessMode
  packageIds: string[]
  onMode: (mode: AccessMode) => void
  onPackages: (ids: string[]) => void
  price: number | null
  isFree: boolean
  packagesError?: string
  disabled?: boolean
  /** Workshop days follow the workshop. */
  locked?: boolean
}

/** "Who can join": three choices, the packages, and the rule in one line. */
export function AccessFields({ mode, packageIds, onMode, onPackages, price, isFree, packagesError, disabled, locked }: AccessFieldsProps) {
  const packages = useOptions(loadAccessPackages)
  const priceLabel = price && price > 0 ? `₹${Number(price).toLocaleString('en-IN')}` : 'the session price'
  const names = packageIds.map((id) => packages.options.find((o) => o.id === id)?.name ?? (packages.loading ? 'Loading…' : 'Deleted package'))
  const sentence = accessSentence(mode, mode === 'everyone' ? [] : names, price, mode === 'subscribers_free' ? false : isFree)

  return (
    <div className="space-y-4">
      <fieldset disabled={disabled || locked} className="min-w-0 space-y-2">
        <legend className="sr-only">Who can join</legend>
        <div className="grid gap-2 md:grid-cols-3" role="radiogroup" aria-label="Who can join">
          {CHOICES.map((c) => {
            const on = mode === c.value
            return (
              <label
                key={c.value}
                className={cn(
                  'flex min-w-0 cursor-pointer gap-3 rounded-md border px-3.5 py-3 transition-colors duration-150',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary',
                  on ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-muted/50',
                  (disabled || locked) && 'cursor-not-allowed opacity-60',
                )}
              >
                <input
                  type="radio"
                  name="access_mode"
                  value={c.value}
                  checked={on}
                  onChange={() => onMode(c.value)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                  aria-describedby={`access-${c.value}-hint`}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-snug">{c.title(priceLabel)}</span>
                  <span id={`access-${c.value}-hint`} className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{c.hint}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {mode !== 'everyone' && !locked && (
        <PackagePicker value={packageIds} onChange={onPackages} list={packages} error={packagesError} disabled={disabled} />
      )}

      <p aria-live="polite" className="text-[13px] text-foreground">
        <span className="font-medium">{sentence}</span>
        {mode !== 'everyone' && <span className="text-muted-foreground"> A combo that contains a chosen package counts too. The session stays visible to whoever "Visible To" allows.</span>}
      </p>
    </div>
  )
}

interface PackagePickerProps {
  value: string[]
  onChange: (ids: string[]) => void
  list: OptionList
  error?: string
  disabled?: boolean
}

/** Searchable multi-select with chips. */
function PackagePicker({ value, onChange, list, error, disabled }: PackagePickerProps) {
  const [open, setOpen] = useState(false)
  const chosen = useMemo(
    () => value.map((id) => ({ id, option: list.options.find((o) => o.id === id) })),
    [value, list.options],
  )
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p id="access-packages-label" className="text-[13px] font-medium">
          Packages whose subscribers can join<span className="text-danger" aria-hidden="true"> *</span>
        </p>
        <p className="shrink-0 text-xs tabular-nums text-muted-foreground" aria-live="polite">{value.length} chosen</p>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="access_package_ids"
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-labelledby="access-packages-label"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'access-packages-error' : undefined}
            disabled={disabled}
            className={cn('w-full justify-between bg-card px-3 font-normal text-muted-foreground', error && 'border-danger')}
          >
            <span className="truncate">{value.length ? 'Add or remove packages' : 'Choose packages'}</span>
            <ChevronsUpDown aria-hidden="true" className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[max(var(--radix-popover-trigger-width),280px)] max-w-[calc(100vw-2rem)] p-0" align="start" collisionPadding={12}>
          <Command>
            <CommandInput placeholder="Search packages" />
            <CommandList>
              {list.loading && <p className="px-3 py-4 text-sm text-muted-foreground" role="status">Loading…</p>}
              {list.error && (
                <div className="space-y-2 px-3 py-4 text-sm" role="alert">
                  <p className="text-danger">{list.error}</p>
                  <Button type="button" variant="outline" size="sm" onClick={list.reload}><RotateCw />Try again</Button>
                </div>
              )}
              {!list.loading && !list.error && <CommandEmpty>No packages match.</CommandEmpty>}
              {!list.loading && !list.error && (
                <CommandGroup>
                  {list.options.map((o) => (
                    <CommandItem key={o.id} value={`${o.name} ${o.sub ?? ''} ${o.id}`} onSelect={() => toggle(o.id)}>
                      <Check aria-hidden="true" className={cn('h-4 w-4 shrink-0', value.includes(o.id) ? 'opacity-100' : 'opacity-0')} />
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
      {chosen.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Chosen packages">
          {chosen.map(({ id, option }) => (
            <li
              key={id}
              className={cn(
                'inline-flex max-w-full items-center gap-1 rounded-full border py-0.5 pl-2.5 pr-1 text-[13px]',
                option || list.loading ? 'border-border bg-muted' : 'border-warning bg-warning-soft text-warning',
              )}
            >
              <span className="min-w-0 truncate">
                {option?.name ?? (list.loading ? 'Loading…' : 'Deleted package')}
                {option?.sub && <span className="text-muted-foreground"> · {option.sub}</span>}
              </span>
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== id))}
                disabled={disabled}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
                aria-label={`Remove ${option?.name ?? 'this package'}`}
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p id="access-packages-error" className="text-[13px] text-danger">{error}</p>}
    </div>
  )
}
