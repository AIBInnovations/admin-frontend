import { useEffect, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { X, Search, Plus } from 'lucide-react'
import { usersService, UserLite } from '@/services/users.service'

export interface PickerUser {
  id: string
  label: string
  sublabel?: string
}

interface CouponCustomerPickerProps {
  value: PickerUser[]
  onChange: (value: PickerUser[]) => void
  disabled?: boolean
}

export function CouponCustomerPicker({ value, onChange, disabled }: CouponCustomerPickerProps) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<UserLite[]>([])
  const [loading, setLoading] = useState(false)

  const runSearch = useCallback(async () => {
    if (!search || search.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await usersService.searchLite({ search: search.trim(), limit: 20 })
      setResults(res.data?.users || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(runSearch, 300)
    return () => clearTimeout(t)
  }, [runSearch])

  const isSelected = (id: string) => value.some((v) => v.id === id)

  const add = (u: UserLite) => {
    if (isSelected(u._id)) return
    onChange([...value, { id: u._id, label: u.name || u.email, sublabel: u.email || u.phone_number }])
  }

  const remove = (id: string) => {
    onChange(value.filter((v) => v.id !== id))
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span
              key={v.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] px-2 py-1"
            >
              <span className="font-medium truncate max-w-[160px]">{v.label}</span>
              {!disabled && (
                <button type="button" onClick={() => remove(v.id)} className="hover:text-error">
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone, or student ID..."
          className="pl-8"
          disabled={disabled}
        />
      </div>

      {/* Results */}
      {search.trim().length >= 2 && (
        <div className="max-h-40 overflow-y-auto rounded border divide-y">
          {loading ? (
            <p className="text-xs text-muted-foreground px-3 py-3">Searching...</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-3">No customers found</p>
          ) : (
            results.map((u) => (
              <button
                key={u._id}
                type="button"
                onClick={() => add(u)}
                disabled={disabled || isSelected(u._id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{u.name || 'Unnamed'}</span>
                  <span className="text-muted-foreground"> · {u.email || u.phone_number}</span>
                </span>
                {isSelected(u._id) ? <span className="text-[10px] text-primary shrink-0">Added</span> : <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
