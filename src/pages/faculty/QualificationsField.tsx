import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { joinQualifications, MAX_QUALIFICATIONS, splitQualifications } from './qualifications'

/**
 * Qualifications as a list: one row per qualification, Enter adds the next
 * row, Backspace on an empty row removes it, and a pasted "MBBS, MD, DNB"
 * becomes three rows. The parent keeps the joined text (what the API stores).
 */
export function QualificationsField({ id, items, onChange, disabled, invalid, describedBy }: {
  id: string
  items: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}) {
  // Rows being typed, blanks included; the parent only sees the filled ones
  const [rows, setRows] = useState<string[]>(() => (items.length ? items : ['']))
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const focusNext = useRef<number | null>(null)
  const last = useRef(items.join('\n'))

  // A reset from outside (the record loaded) replaces the rows
  useEffect(() => {
    const key = items.join('\n')
    if (key === last.current) return
    last.current = key
    setRows(items.length ? items : [''])
  }, [items])

  useEffect(() => {
    if (focusNext.current === null) return
    refs.current[focusNext.current]?.focus()
    focusNext.current = null
  })

  const commit = (next: string[]) => {
    setRows(next.length ? next : [''])
    const filled = next.map((r) => r.replace(/\s+/g, ' ').trim()).filter(Boolean)
    // What the parent will hand back (duplicates dropped), so it does not reset the rows
    last.current = splitQualifications(joinQualifications(filled)).join('\n')
    onChange(filled)
  }

  const setRow = (i: number, value: string) => {
    // Typing a comma or semicolon starts the next qualification
    if (/[,;]/.test(value) && splitQualifications(value).length > 1) {
      const parts = splitQualifications(value)
      const next = [...rows.slice(0, i), ...parts, ...rows.slice(i + 1)].slice(0, MAX_QUALIFICATIONS)
      focusNext.current = Math.min(i + parts.length - 1, next.length - 1)
      commit(next)
      return
    }
    commit(rows.map((r, k) => (k === i ? value : r)))
  }

  const add = (at: number) => {
    if (rows.length >= MAX_QUALIFICATIONS) return
    const next = [...rows.slice(0, at + 1), '', ...rows.slice(at + 1)]
    focusNext.current = at + 1
    setRows(next)
  }

  const remove = (i: number) => {
    const next = rows.filter((_, k) => k !== i)
    focusNext.current = Math.max(0, i - 1)
    commit(next)
  }

  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (rows[i].trim()) add(i)
    } else if (e.key === 'Backspace' && rows[i] === '' && rows.length > 1) {
      e.preventDefault()
      remove(i)
    }
  }

  const onPaste = (i: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    const parts = splitQualifications(text)
    if (parts.length < 2) return
    e.preventDefault()
    const keep = rows[i].trim() ? [rows[i]] : []
    const next = [...rows.slice(0, i), ...keep, ...parts, ...rows.slice(i + 1)].slice(0, MAX_QUALIFICATIONS)
    focusNext.current = Math.min(i + keep.length + parts.length - 1, next.length - 1)
    commit(next)
  }

  return (
    <div className="space-y-2" role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy}>
      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li key={i} className="flex items-center gap-2">
            <Input
              ref={(el) => { refs.current[i] = el }}
              id={i === 0 ? id : undefined}
              value={row}
              onChange={(e) => setRow(i, e.target.value)}
              onKeyDown={onKeyDown(i)}
              onPaste={onPaste(i)}
              placeholder={i === 0 ? 'e.g., MBBS' : 'e.g., MD (Anatomy)'}
              aria-label={`Qualification ${i + 1}`}
              aria-invalid={invalid || undefined}
              maxLength={200}
              disabled={disabled}
              className="bg-card"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-danger"
              onClick={() => remove(i)}
              disabled={disabled || (rows.length === 1 && !row)}
              aria-label={`Remove qualification ${i + 1}${row ? `, ${row}` : ''}`}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" size="sm" className="bg-card" onClick={() => add(rows.length - 1)} disabled={disabled || rows.length >= MAX_QUALIFICATIONS || !rows[rows.length - 1].trim()}>
        <Plus aria-hidden="true" className="h-3.5 w-3.5" />Add qualification
      </Button>
    </div>
  )
}
