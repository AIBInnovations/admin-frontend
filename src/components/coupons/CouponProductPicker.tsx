import { useEffect, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Search, Plus } from 'lucide-react'
import { packagesService } from '@/services/packages.service'
import { liveSessionsService } from '@/services/liveSessions.service'
import { workshopsService } from '@/services/workshops.service'
import { booksService } from '@/services/books.service'
import { formsService } from '@/services/forms.service'
import { CouponApplicableProduct, CouponProductType } from '@/services/coupons.service'

interface PickerValueItem extends CouponApplicableProduct {
  label?: string
}

interface CouponProductPickerProps {
  value: PickerValueItem[]
  onChange: (value: PickerValueItem[]) => void
  disabled?: boolean
}

const TYPE_LABELS: Record<CouponProductType, string> = {
  package: 'Package',
  session: 'Live Session',
  workshop: 'Workshop',
  ebook: 'E-book',
  book: 'Physical Book',
  form: 'Form',
}

async function fetchProducts(type: CouponProductType, search: string): Promise<{ id: string; label: string }[]> {
  const params: Record<string, unknown> = { search: search || undefined, limit: 20 }
  let res
  if (type === 'package') {
    res = await packagesService.getAll(params)
    return (res.data?.entities || []).map((p: any) => ({ id: p._id, label: p.name }))
  }
  if (type === 'session') {
    res = await liveSessionsService.getAll(params)
    return (res.data?.entities || []).map((s: any) => ({ id: s._id, label: s.title }))
  }
  if (type === 'workshop') {
    res = await workshopsService.getAll(params)
    return (res.data?.entities || []).map((w: any) => ({
      id: w._id,
      label: `${w.title} (${w.day_count} day${w.day_count === 1 ? '' : 's'})`,
    }))
  }
  if (type === 'form') {
    res = await formsService.getAll(params)
    return (res.data?.entities || []).map((f: any) => ({ id: f._id, label: f.title }))
  }
  // ebook / book both come from the Book collection — filter by the ebook flag client-side
  res = await booksService.getAll(params)
  const wantEbook = type === 'ebook'
  return (res.data?.entities || [])
    .filter((b: any) => (b.ebook === true) === wantEbook)
    .map((b: any) => ({ id: b._id, label: b.title }))
}

export function CouponProductPicker({ value, onChange, disabled }: CouponProductPickerProps) {
  const [type, setType] = useState<CouponProductType>('package')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<{ id: string; label: string }[]>([])
  const [loading, setLoading] = useState(false)

  const runSearch = useCallback(async () => {
    setLoading(true)
    try {
      setResults(await fetchProducts(type, search))
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [type, search])

  // Auto-search when type changes; debounce on search text
  useEffect(() => {
    const t = setTimeout(runSearch, 300)
    return () => clearTimeout(t)
  }, [runSearch])

  const isSelected = (id: string) => value.some((v) => v.product_type === type && v.product_id === id)

  const add = (item: { id: string; label: string }) => {
    if (isSelected(item.id)) return
    onChange([...value, { product_type: type, product_id: item.id, label: item.label }])
  }

  const remove = (item: PickerValueItem) => {
    onChange(value.filter((v) => !(v.product_type === item.product_type && v.product_id === item.product_id)))
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span
              key={`${v.product_type}:${v.product_id}`}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] px-2 py-1"
            >
              <span className="opacity-60 capitalize">{v.product_type}</span>
              <span className="font-medium truncate max-w-[160px]">{v.label || `#${v.product_id.slice(-6)}`}</span>
              {!disabled && (
                <button type="button" onClick={() => remove(v)} className="hover:text-error">
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Type + search */}
      <div className="flex gap-2">
        <Select value={type} onValueChange={(v) => setType(v as CouponProductType)} disabled={disabled}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(TYPE_LABELS) as CouponProductType[]).map((t) => (
              <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${TYPE_LABELS[type].toLowerCase()}s...`}
            className="pl-8"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Results */}
      <div className="max-h-40 overflow-y-auto rounded border divide-y">
        {loading ? (
          <p className="text-xs text-muted-foreground px-3 py-3">Searching...</p>
        ) : results.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-3">No {TYPE_LABELS[type].toLowerCase()}s found</p>
        ) : (
          results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => add(r)}
              disabled={disabled || isSelected(r.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="truncate">{r.label}</span>
              {isSelected(r.id) ? <span className="text-[10px] text-primary">Added</span> : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
