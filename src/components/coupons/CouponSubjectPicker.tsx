import { useEffect, useMemo, useState, useId } from 'react'
import { Check, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { subjectsService } from '@/services/subjects.service'

export interface SubjectOption {
  _id: string
  name: string | null
}

interface CouponSubjectPickerProps {
  value: SubjectOption[]
  onChange: (value: SubjectOption[]) => void
  disabled?: boolean
}

/**
 * Pick whole subjects for a coupon ("₹500 off any Community Medicine
 * product"). Subjects are a short list, so all of them load once and the
 * search filters locally.
 */
export function CouponSubjectPicker({ value, onChange, disabled }: CouponSubjectPickerProps) {
  const [all, setAll] = useState<SubjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const searchId = useId()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await subjectsService.getSubjects({ limit: 100 })
        if (cancelled) return
        if (res.success && res.data) {
          setAll(
            (res.data.entities || [])
              .map((s) => ({ _id: s._id, name: s.name }))
              .sort((x, y) => (x.name || '').localeCompare(y.name || '')),
          )
        }
        else setFailed(true)
      } catch {
        if (!cancelled) setFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const chosen = new Set(value.map((v) => v._id))
  // Subjects already on the coupon but missing from the list (deleted) still show, so they can be removed
  const options = useMemo(() => {
    const extra = value.filter((v) => !all.some((a) => a._id === v._id))
    const q = query.trim().toLowerCase()
    return [...extra, ...all].filter((s) => !q || (s.name || '').toLowerCase().includes(q))
  }, [all, value, query])

  const toggle = (s: SubjectOption) => {
    onChange(chosen.has(s._id) ? value.filter((v) => v._id !== s._id) : [...value, s])
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Every product in the chosen subjects gets the discount: each package and subscription length, live sessions, workshops, forms, and books linked to that subject.
      </p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <label htmlFor={searchId} className="sr-only">Search subjects</label>
        <Input id={searchId} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search subjects…" className="pl-8" autoComplete="off" disabled={disabled} />
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">Loading subjects…</p>
      ) : failed ? (
        <p className="text-xs text-danger">Could not load subjects. Refresh the page to try again.</p>
      ) : options.length === 0 ? (
        <p className="text-xs text-muted-foreground">No subjects match “{query}”.</p>
      ) : (
        <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto overscroll-contain">
          {options.map((s) => {
            const on = chosen.has(s._id)
            return (
              <button
                key={s._id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(s)}
                disabled={disabled}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-foreground hover:border-primary/40',
                  !s.name && 'text-danger',
                )}
              >
                {on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                {s.name || 'Deleted subject'}
              </button>
            )
          })}
        </div>
      )}
      {value.length > 0 && <p className="text-xs font-medium text-muted-foreground">{value.length} subject{value.length === 1 ? '' : 's'} chosen</p>}
    </div>
  )
}
