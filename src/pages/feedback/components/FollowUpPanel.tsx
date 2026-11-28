import { useEffect, useRef, useState } from 'react'
import { Loader2, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiErrorInfo, apiErrorMessage, FactGrid, Section, StatusPill } from '@/components/common/detail'
import { istToday } from '@/components/common/DateRangeFilter'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { toIstDateInput } from '@/lib/format'
import {
  feedbackService, type Assignee, type FeedbackAction, type FeedbackChange, type FeedbackDetailResponse, type FeedbackPriority,
  type FeedbackReviewDetail, type FeedbackStatus,
} from '@/services/feedback.service'
import { ACTION_LABEL, CLOSED, istDay, istDayTime, PRIORITY_LABEL, STATUS_LABEL, STATUS_TONE } from '../lib'

const NOBODY = 'nobody'

interface Form { status: FeedbackStatus; assigned: string; priority: FeedbackPriority; action: FeedbackAction; due: string; note: string }
const formOf = (r: FeedbackReviewDetail): Form => ({
  status: r.status, assigned: r.assigned_to?._id ?? NOBODY, priority: r.priority, action: r.action, due: toIstDateInput(r.action_due_at), note: '',
})

interface FollowUpPanelProps {
  review: FeedbackReviewDetail
  assignees: Assignee[]
  canUpdate: boolean
  onSaved: (next: FeedbackDetailResponse) => void
  onReload: () => Promise<void>
}

/** Who handles it, what will be done and by when. Closing it asks what was done. */
export function FollowUpPanel({ review, assignees, canUpdate, onSaved, onReload }: FollowUpPanelProps) {
  const [form, setForm] = useState<Form>(() => formOf(review))
  const [errors, setErrors] = useState<{ note?: string; action?: string; due?: string; general?: string }>({})
  const [saving, setSaving] = useState(false)
  const [outdated, setOutdated] = useState(false)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const base = formOf(review)
  const dirty = (Object.keys(base) as (keyof Form)[]).some((k) => (k === 'note' ? form.note.trim() !== '' : form[k] !== base[k]))
  useUnsavedChanges(dirty && !saving)

  // A newer version arrived: take its values, keep what is being typed
  useEffect(() => {
    setForm((f) => ({ ...formOf(review), note: f.note }))
    setErrors({})
    setOutdated(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review._id, review.updatedAt])

  const isClosed = CLOSED.includes(review.status)
  const closing = form.status !== review.status && CLOSED.includes(form.status)
  const reopening = isClosed && !CLOSED.includes(form.status)
  const locked = isClosed && !reopening
  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f) => ({ ...f, [k]: v })); setErrors({}) }

  if (!canUpdate) {
    return (
      <Section title="Follow-up">
        <FactGrid className="sm:grid-cols-1 xl:grid-cols-1" facts={[
          { label: 'Status', value: <StatusPill tone={STATUS_TONE[review.status]}>{STATUS_LABEL[review.status]}</StatusPill> },
          { label: 'Assigned to', value: review.assigned_to?.name ?? 'Nobody' },
          { label: 'Priority', value: PRIORITY_LABEL[review.priority] },
          { label: 'Action', value: ACTION_LABEL[review.action] },
          { label: 'Due', value: review.action_due_at ? istDay(review.action_due_at) : 'No date' },
        ]} />
      </Section>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    const next: typeof errors = {}
    if (closing && !form.note.trim()) next.note = form.status === 'resolved' ? 'Say what was done before resolving it' : 'Say why it is being dismissed'
    if (form.status === 'action_planned' && form.action === 'none') next.action = 'Choose what will be done'
    if (form.due && form.due !== base.due && form.due < istToday()) next.due = 'Choose today or a later day'
    setErrors(next)
    if (next.action) { document.getElementById('fu-action')?.focus(); return }
    if (next.due) { document.getElementById('fu-due')?.focus(); return }
    if (next.note) { noteRef.current?.focus(); return }

    const change: FeedbackChange = { expected_updated_at: review.updatedAt }
    if (form.status !== base.status) change.status = form.status
    if (!locked) {
      if (form.assigned !== base.assigned) change.assigned_to = form.assigned === NOBODY ? null : form.assigned
      if (form.priority !== base.priority) change.priority = form.priority
      if (form.action !== base.action) change.action = form.action
      if (form.due !== base.due) change.action_due_at = form.due || null
    }
    if (form.note.trim()) change.note = form.note.trim()

    setSaving(true)
    try {
      const res = await feedbackService.update(review._id, change)
      if (!res.success || !res.data) throw new Error(res.message)
      setForm({ ...formOf(res.data.review), note: '' })
      onSaved(res.data)
      toast.success(closing ? (form.status === 'resolved' ? 'Feedback resolved' : 'Feedback dismissed') : reopening ? 'Feedback reopened' : form.status !== base.status ? `Moved to ${STATUS_LABEL[form.status].toLowerCase()}` : form.note.trim() && Object.keys(change).length === 2 ? 'Note added' : 'Changes saved')
    } catch (err) {
      const { code } = apiErrorInfo(err)
      if (code === 'FEEDBACK_CHANGED') setOutdated(true)
      else if (code === 'NOTE_REQUIRED') { setErrors({ note: apiErrorMessage(err) }); noteRef.current?.focus() }
      else if (code === 'ACTION_REQUIRED') setErrors({ action: apiErrorMessage(err) })
      else if (code === 'DUE_IN_PAST') setErrors({ due: apiErrorMessage(err) })
      else setErrors({ general: apiErrorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  const people = [...assignees.filter((a) => a.is_me), ...assignees.filter((a) => !a.is_me)]
  const known = form.assigned === NOBODY || people.some((a) => a._id === form.assigned)
  const label = closing ? (form.status === 'resolved' ? ['Resolve feedback', 'Resolving…'] : ['Dismiss feedback', 'Dismissing…'])
    : reopening ? ['Reopen feedback', 'Reopening…']
      : ['Save changes', 'Saving…']

  return (
    <Section title="Follow-up" description={isClosed ? `Closed ${istDayTime(review.resolved_at)}${review.resolved_by ? ` by ${review.resolved_by.name}` : ''}` : undefined}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {review.resolution_note && isClosed && (
          <div className="rounded-md bg-muted px-3 py-2.5">
            <p className="text-[13px] text-muted-foreground">{review.status === 'resolved' ? 'What was done' : 'Why it was dismissed'}</p>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{review.resolution_note}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="fu-status">Status</Label>
          <Select value={form.status} onValueChange={(v) => set('status', v as FeedbackStatus)} disabled={saving}>
            <SelectTrigger id="fu-status" className="bg-card"><SelectValue /></SelectTrigger>
            <SelectContent position="popper">
              {[review.status, ...review.next_statuses.filter((s) => s !== review.status)].map((s) => (
                <SelectItem key={s} value={s}>{isClosed && s === 'in_review' ? 'In review (reopen)' : STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!locked && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="fu-assigned">Assigned to</Label>
              <Select value={form.assigned} onValueChange={(v) => set('assigned', v)} disabled={saving}>
                <SelectTrigger id="fu-assigned" className="bg-card"><SelectValue /></SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={NOBODY}>Nobody</SelectItem>
                  {!known && <SelectItem value={form.assigned}>{review.assigned_to?.name ?? 'Former admin'}</SelectItem>}
                  {people.map((a) => <SelectItem key={a._id} value={a._id}>{a.is_me ? `${a.name} (me)` : a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fu-action">Action</Label>
              <Select value={form.action} onValueChange={(v) => set('action', v as FeedbackAction)} disabled={saving}>
                <SelectTrigger id="fu-action" className="bg-card" aria-invalid={!!errors.action} aria-describedby={errors.action ? 'fu-action-error' : undefined}><SelectValue /></SelectTrigger>
                <SelectContent position="popper">
                  {(Object.keys(ACTION_LABEL) as FeedbackAction[]).map((a) => <SelectItem key={a} value={a}>{ACTION_LABEL[a]}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.action && <p id="fu-action-error" role="alert" className="text-sm text-danger">{errors.action}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fu-priority">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => set('priority', v as FeedbackPriority)} disabled={saving}>
                  <SelectTrigger id="fu-priority" className="bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent position="popper">
                    {(['high', 'normal', 'low'] as const).map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor="fu-due">Due date</Label>
                <Input id="fu-due" type="date" min={istToday()} value={form.due} disabled={saving} className="bg-card" aria-invalid={!!errors.due} aria-describedby={errors.due ? 'fu-due-error' : undefined} onChange={(e) => set('due', e.target.value)} />
              </div>
              {errors.due && <p id="fu-due-error" role="alert" className="col-span-2 text-sm text-danger">{errors.due}</p>}
              {review.overdue && form.due === base.due && <p className="col-span-2 text-sm font-medium text-danger">Overdue since {istDay(review.action_due_at)}</p>}
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="fu-note">{closing ? (form.status === 'resolved' ? 'What was done (required)' : 'Reason (required)') : 'Note'}</Label>
          <Textarea
            id="fu-note" ref={noteRef} rows={3} maxLength={2000} value={form.note} disabled={saving} className="bg-card"
            placeholder={closing ? (form.status === 'resolved' ? 'New recording uploaded on 2 December' : 'Not about the video') : 'Only admins see this. Students never do.'}
            aria-invalid={!!errors.note} aria-describedby={errors.note ? 'fu-note-error' : undefined}
            onChange={(e) => set('note', e.target.value)}
          />
          {errors.note && <p id="fu-note-error" role="alert" className="text-sm text-danger">{errors.note}</p>}
        </div>

        {outdated && (
          <div role="alert" className="space-y-2 rounded-md bg-warning-soft px-3 py-2.5 text-sm text-warning">
            <p>Someone else changed this feedback while you had it open. Reload to see their change; your note stays here.</p>
            <Button type="button" variant="outline" size="sm" onClick={onReload}><RotateCw aria-hidden="true" className="h-3.5 w-3.5" />Reload</Button>
          </div>
        )}
        {errors.general && <p role="alert" className="text-sm text-danger">{errors.general}</p>}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving || !dirty || outdated}>
            {saving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
            {saving ? label[1] : label[0]}
          </Button>
          {dirty && !saving && <Button type="button" variant="ghost" onClick={() => { setForm(base); setErrors({}) }}>Undo changes</Button>}
        </div>
      </form>
    </Section>
  )
}
