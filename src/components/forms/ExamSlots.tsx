import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCount } from '@/lib/format'
import { formsService } from '@/services/forms.service'
import { ConfirmDock } from '@/components/forms/editor/ConfirmDock'
import { Field, TextInput } from '@/components/forms/editor/fields'
import { SortableList } from '@/components/forms/editor/SortableList'

interface ExamSlotsProps {
  slots: string[]
  onChange: (slots: string[]) => void
  /** Slots already saved on the form, which submissions may use. */
  saved: string[]
  formId?: string
  slotFieldKeys: string[]
  disabled?: boolean
}

const PAGE = 500
const MAX_PAGES = 10

/** How many submissions chose this slot. `more` when there were too many to read. */
async function countUses(formId: string, keys: string[], slot: string): Promise<{ count: number; more: boolean }> {
  let count = 0
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const res = await formsService.getSubmissions({ form_id: formId, page, limit: PAGE })
    if (!res.success || !res.data) throw new Error(res.message || 'The submissions could not be checked.')
    for (const s of res.data.entities || []) {
      const values = keys.length ? keys.map((k) => s.responses?.[k]) : Object.values(s.responses ?? {})
      if (values.some((v) => v?.split(',').map((x) => x.trim()).includes(slot))) count += 1
    }
    if (page >= (res.data.pagination?.totalPages || 1)) return { count, more: false }
  }
  return { count, more: true }
}

/** The options an examiner picks from: add, remove, and reorder by drag or keyboard. */
export function ExamSlots({ slots, onChange, saved, formId, slotFieldKeys, disabled }: ExamSlotsProps) {
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState<string | undefined>()
  const [removing, setRemoving] = useState<string | null>(null)

  const add = () => {
    const name = draft.trim()
    if (!name) return
    // The website joins several choices with commas, so a comma would split one slot into two
    if (name.includes(',')) { setProblem('A slot cannot contain a comma'); return }
    if (slots.some((s) => s.toLowerCase() === name.toLowerCase())) { setProblem('This slot already exists'); return }
    setProblem(undefined)
    onChange([...slots, name])
    setDraft('')
  }
  const remove = (slot: string) => onChange(slots.filter((s) => s !== slot))

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">Add the exam slot options that examiners can choose from. Users can select multiple slots.</p>
      {slots.length > 0 && (
        <SortableList items={slots} idOf={(s) => s} nameOf={(s) => s} onReorder={onChange} disabled={disabled}>
          {(slot) => (
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm" title={slot}>{slot}</span>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Remove ${slot}`} disabled={disabled} onClick={() => (formId && saved.includes(slot) ? setRemoving(slot) : remove(slot))}><X /></Button>
            </div>
          )}
        </SortableList>
      )}
      <Field id="new-slot" label="Exam Slots" error={problem}>
        {(c) => (
          <div className="flex gap-2">
            <TextInput {...c} value={draft} onChange={(e) => { setDraft(e.target.value); setProblem(undefined) }} placeholder="e.g. Long case" maxLength={120} disabled={disabled} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
            <Button type="button" variant="outline" size="icon" className="shrink-0 bg-card" aria-label="Add slot" onClick={add} disabled={disabled || !draft.trim()}><Plus /></Button>
          </div>
        )}
      </Field>

      <ConfirmDock
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove "${removing ?? ''}"?`}
        confirmLabel="Remove slot"
        busyLabel="Removing..."
        dismissLabel="Keep slot"
        tone="danger"
        loadImpact={removing && formId ? async () => {
          const { count, more } = await countUses(formId, slotFieldKeys, removing)
          if (count === 0 && !more) return null
          return { blocked: false, dependencies: [{ type: 'submission', label: `submission${count === 1 ? '' : 's'} chose this slot${more ? ' (at least)' : ''}`, count: Number(count), blocking: false }] }
        } : undefined}
        onConfirm={async () => { if (removing) remove(removing) }}
      >
        <p>New submissions will not be able to choose it. Answers already received keep it as text. {removing && slots.length === 1 ? 'This is the last slot.' : ''}</p>
        <p>Nothing changes until you save the form. {formatCount(slots.length)} slot{slots.length === 1 ? '' : 's'} now.</p>
      </ConfirmDock>
    </div>
  )
}
