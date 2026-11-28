import { useEffect, useId, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Copy, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusPill } from '@/components/common/detail'
import type { CareerStatus } from '@/services/careers.service'
import { STATUS } from './lib'

export function CareerStatusPill({ status, className }: { status: CareerStatus | string; className?: string }) {
  const s = STATUS[status as CareerStatus]
  return <StatusPill tone={s?.tone ?? 'neutral'} className={className}>{s?.label ?? status}</StatusPill>
}

/** Search that waits for a pause in typing and follows the URL (Back, Clear filters). */
export function SearchBox({ value, onChange, label, className }: { value: string; onChange: (v: string) => void; label: string; className?: string }) {
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
    <div className={cn('relative min-w-0', className)}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type="search"
        value={text}
        maxLength={100}
        placeholder={label}
        autoComplete="off"
        enterKeyHint="search"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onChange(text.trim()) }}
        className="h-10 bg-card pl-9 pr-10 sm:h-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {text && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => { setText(''); onChange('') }}
          className="absolute right-0.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground sm:h-8 sm:w-8"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

/** A copy button with words, 40px tall on phones. Says "Copied" for a moment. */
export function CopyAction({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-10 bg-card px-3 text-[13px] sm:h-8"
      onClick={() => { navigator.clipboard?.writeText(value).then(() => setCopied(true)).catch(() => {}) }}
    >
      {copied ? <Check aria-hidden="true" className="text-success" /> : <Copy aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </Button>
  )
}

/** Previous / next with the page number. Buttons are 40px tall on phones. */
export function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3">
      <p className="text-sm tabular-nums text-muted-foreground">Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-10 gap-1 bg-card px-3 sm:h-9" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft aria-hidden="true" />Previous
        </Button>
        <Button type="button" variant="outline" className="h-10 gap-1 bg-card px-3 sm:h-9" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next<ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
