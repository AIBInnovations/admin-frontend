import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface ListToolbarProps {
  search: string
  onSearch: (v: string) => void
  placeholder: string
  selectAll?: { checked: boolean; indeterminate: boolean; onChange: () => void; label: string }
  /** Filters, between the search and the buttons. */
  filters?: ReactNode
  /** Create buttons, on the right. */
  children?: ReactNode
}

export function ListToolbar({ search, onSearch, placeholder, selectAll, filters, children }: ListToolbarProps) {
  // The box follows every keystroke; the URL follows a moment later.
  const [text, setText] = useState(search)
  const pushed = useRef(search)
  useEffect(() => {
    if (search !== pushed.current) { pushed.current = search; setText(search) }
  }, [search])
  useEffect(() => {
    if (text === pushed.current) return
    const t = setTimeout(() => { pushed.current = text; onSearch(text) }, 150)
    return () => clearTimeout(t)
  }, [text, onSearch])

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-4 py-3">
      {selectAll && (
        // The label is the 40px hit area on touch screens (a checkbox ignores padding)
        <label className="flex shrink-0 cursor-pointer pointer-coarse:-my-3 pointer-coarse:-ml-3 pointer-coarse:p-3">
          <input
            type="checkbox"
            aria-label={selectAll.label}
            checked={selectAll.checked}
            ref={(el) => { if (el) el.indeterminate = selectAll.indeterminate && !selectAll.checked }}
            onChange={selectAll.onChange}
            className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
          />
        </label>
      )}
      <div className="relative min-w-40 max-w-sm flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={placeholder}
          className="h-9 pl-9 pr-8 text-sm [&::-webkit-search-cancel-button]:hidden"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape' && text) { e.preventDefault(); e.stopPropagation(); setText('') } }}
        />
        {text && (
          <button type="button" aria-label="Clear search" onClick={() => setText('')} className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {filters}
      {children && <div className="ml-auto flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}

interface FilterSelectProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}

export function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 max-w-44 rounded-md border border-input bg-card px-2 text-sm text-foreground"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
