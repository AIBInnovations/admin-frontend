import { useState } from 'react'
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { plural } from '@/components/users/lib'
import { formatDuration } from '@/lib/format'
import type { Package } from '@/services/packages.service'

export interface ContentSummary { series_count?: number; module_count?: number; video_count?: number; document_count?: number; duration_seconds?: number }

const refName = (v: unknown) => (v && typeof v === 'object' && 'name' in v ? String((v as { name: unknown }).name) : '')

/** What a package or combo holds, in one line. */
export function summaryText(s?: ContentSummary | null): string {
  if (!s) return ''
  return [
    s.series_count !== undefined ? `${s.series_count.toLocaleString('en-IN')} series` : null,
    s.module_count !== undefined ? plural(s.module_count, 'module') : null,
    s.video_count !== undefined ? plural(s.video_count, 'video') : null,
    s.document_count !== undefined ? plural(s.document_count, 'document') : null,
  ].filter(Boolean).join(', ')
}

interface Props {
  value: string[]
  onChange: (ids: string[]) => void
  packages: Package[]
  loading: boolean
  error: string | null
  onRetry: () => void
  disabled?: boolean
  /** Names of saved packages that may not be in the list any more. */
  knownNames: Record<string, string>
}

/** Pick the packages inside a combo, and see what they add up to. */
export function BundlePicker({ value, onChange, packages, loading, error, onRetry, disabled, knownNames }: Props) {
  const [open, setOpen] = useState(false)
  const byId = new Map(packages.map((p) => [p._id, p as Package & { content_summary?: ContentSummary }]))
  const chosen = value.map((id) => ({ id, pkg: byId.get(id) }))
  const summaries = chosen.map((c) => c.pkg?.content_summary).filter((s): s is ContentSummary => !!s)
  const total = summaries.length > 0 && summaries.length === chosen.length
    ? summaries.reduce<ContentSummary>((a, s) => ({
      series_count: (a.series_count ?? 0) + (s.series_count ?? 0), module_count: (a.module_count ?? 0) + (s.module_count ?? 0),
      video_count: (a.video_count ?? 0) + (s.video_count ?? 0), document_count: (a.document_count ?? 0) + (s.document_count ?? 0),
    }), {})
    : null
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])

  return (
    <div className="space-y-2.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-labelledby="bundle-label" disabled={disabled || (loading && !packages.length)} className="h-9 w-full justify-between bg-background px-3 font-normal">
            <span className="min-w-0 truncate text-left">{value.length > 0 ? `${value.length} package${value.length > 1 ? 's' : ''} selected` : loading ? 'Loading packages…' : 'None (not a combo)'}</span>
            {loading ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin opacity-60" /> : <ChevronsUpDown aria-hidden="true" className="h-3.5 w-3.5 opacity-50" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[max(var(--radix-popover-trigger-width),300px)] max-w-[calc(100vw-2rem)] p-0" align="start" collisionPadding={12}>
          <Command>
            <CommandInput placeholder="Search packages..." />
            <CommandList>
              <CommandEmpty>No packages found.</CommandEmpty>
              <CommandGroup>
                {packages.map((p) => {
                  const on = value.includes(p._id)
                  return (
                    <CommandItem key={p._id} value={`${p.name} ${refName(p.subject_id)} ${p._id}`} onSelect={() => toggle(p._id)}>
                      <Check aria-hidden="true" className={cn('mr-2 h-4 w-4 shrink-0', on ? 'opacity-100' : 'opacity-0')} />
                      <span className="min-w-0">
                        <span className="block break-words">{p.name}</span>
                        <span className="block text-xs text-muted-foreground">{[refName(p.subject_id), refName(p.package_type_id), !p.is_active ? 'Inactive' : null].filter(Boolean).join(' · ')}</span>
                      </span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && !loading && <p role="alert" className="text-xs text-danger">The package list could not be loaded: {error} <button type="button" onClick={onRetry} className="font-medium underline underline-offset-2">Try again</button></p>}

      {chosen.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <ul className="divide-y divide-border">
            {chosen.map(({ id, pkg }) => (
              <li key={id} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className={cn('break-words text-sm font-medium', !pkg && !loading && !knownNames[id] && 'text-danger')}>{pkg?.name ?? knownNames[id] ?? (loading ? 'Loading…' : 'Deleted package')}</p>
                  <p className="text-xs text-muted-foreground">
                    {pkg ? [refName(pkg.subject_id), pkg.tiers?.length ? pkg.tiers.map((t) => formatDuration(t.duration_days)).join(', ') : formatDuration(pkg.duration_days), summaryText(pkg.content_summary)].filter(Boolean).join(' · ')
                      : loading ? '' : knownNames[id] ? 'Not in the list of packages that can be bundled.' : 'This package no longer exists. Remove it.'}
                  </p>
                </div>
                <button type="button" disabled={disabled} onClick={() => toggle(id)} aria-label={`Remove ${pkg?.name ?? knownNames[id] ?? 'package'} from the combo`} className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          {total && <p className="border-t border-border bg-muted/40 px-3.5 py-2 text-[13px]"><span className="font-medium">Combined contents:</span> <span className="text-muted-foreground">{summaryText(total)}</span></p>}
        </div>
      )}
    </div>
  )
}
