import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { apiErrorMessage } from '@/components/common/detail'
import { feedbackService, type Assignee, type FeedbackChange } from '@/services/feedback.service'
import { plural } from '../lib'
import { FilterSelect } from './filters'

interface BulkBarProps {
  ids: string[]
  assignees: Assignee[]
  onDone: () => void
  onClear: () => void
}

/** What can be done to several reviews at once. Closing them asks for the reason first. */
export function BulkBar({ ids, assignees, onDone, onClear }: BulkBarProps) {
  const [busy, setBusy] = useState(false)
  const [closing, setClosing] = useState<'resolved' | 'dismissed' | null>(null)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)

  const run = async (change: FeedbackChange, verb: string) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await feedbackService.bulk(ids, change)
      const r = res.data
      if (!res.success || !r) throw new Error(res.message)
      if (r.updated > 0) toast.success(`${verb} ${plural(r.updated, 'review')}`)
      if (r.failed.length > 0) toast.warning(`${plural(r.failed.length, 'review')} not changed: ${r.failed[0].message}`, { duration: 8000 })
      else if (r.updated === 0) toast.info('Nothing to change, these reviews already are as you asked')
      setClosing(null)
      setNote('')
      onDone()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const people = [
    ...assignees.filter((a) => a.is_me).map((a) => ({ value: a._id, label: `Me (${a.name})` })),
    ...assignees.filter((a) => !a.is_me).map((a) => ({ value: a._id, label: a.name })),
    { value: 'nobody', label: 'Nobody' },
  ]

  return (
    <>
      <div role="region" aria-label="Actions for the selected reviews" className="pg-dock sticky bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-raised">
        <div className="flex w-full items-center gap-2 sm:mr-auto sm:w-auto">
          <p className="mr-auto pl-1 text-sm font-semibold" aria-live="polite">{plural(ids.length, 'review')} selected</p>
          {busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button variant="ghost" size="icon" aria-label="Clear the selection" onClick={onClear}><X aria-hidden="true" className="h-4 w-4" /></Button>
        </div>
        <FilterSelect
          label="Assign to" anyLabel="Assign to" searchable value="" options={people}
          onChange={(v) => v && run({ assigned_to: v === 'nobody' ? null : v }, v === 'nobody' ? 'Unassigned' : 'Assigned')}
        />
        <Button variant="outline" className="bg-card" disabled={busy} onClick={() => run({ status: 'in_review' }, 'Moved to in review:')}>Move to in review</Button>
        <Button variant="outline" className="bg-card" disabled={busy} onClick={() => { setNoteError(null); setClosing('resolved') }}>Resolve</Button>
        <Button variant="outline" className="bg-card" disabled={busy} onClick={() => { setNoteError(null); setClosing('dismissed') }}>Dismiss</Button>
      </div>

      <Dialog variant="dock" open={!!closing} onOpenChange={(o) => { if (!o && !busy) setClosing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{closing === 'resolved' ? 'Resolve' : 'Dismiss'} {plural(ids.length, 'review')}</DialogTitle>
            <DialogDescription>{closing === 'resolved' ? 'Say what was done. It is kept in the history of each review.' : 'Say why no action is needed. It is kept in the history of each review.'}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!note.trim()) { setNoteError('Write a short note first'); document.getElementById('bulk-note')?.focus(); return }
              run({ status: closing!, note: note.trim() }, closing === 'resolved' ? 'Resolved' : 'Dismissed')
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="bulk-note">{closing === 'resolved' ? 'What was done' : 'Reason'}</Label>
              <Textarea id="bulk-note" rows={3} maxLength={2000} value={note} autoFocus aria-invalid={!!noteError} aria-describedby={noteError ? 'bulk-note-error' : undefined}
                onChange={(e) => { setNote(e.target.value); setNoteError(null) }} />
              {noteError && <p id="bulk-note-error" role="alert" className="text-sm text-danger">{noteError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setClosing(null)} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                {closing === 'resolved' ? (busy ? 'Resolving…' : 'Resolve reviews') : (busy ? 'Dismissing…' : 'Dismiss reviews')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
