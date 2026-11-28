import { useEffect, useState, type ReactNode } from 'react'
import { CalendarClock, Send } from 'lucide-react'
import { ErrorState, Section } from '@/components/common/detail'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDock, EditorBar, Field, Notice } from '@/components/users/kit'
import { dayTimeIST, istInputToISO, isoToIstInput } from '@/components/users/lib'
import { countText, type AudienceCount } from './audience'

// ── Schedule ─────────────────────────────────────────────────────────────

export interface Schedule { enabled: boolean; at: string }
export const NO_SCHEDULE: Schedule = { enabled: false, at: '' }

export function scheduleProblem(s: Schedule): string | null {
  if (!s.enabled) return null
  if (!s.at) return 'Choose when to send'
  const t = new Date(istInputToISO(s.at)).getTime()
  if (Number.isNaN(t)) return 'Choose when to send'
  return t <= Date.now() ? 'The time must be in the future' : null
}

export function ScheduleSection({ value, onChange, disabled, id, noun, problem }: { value: Schedule; onChange: (s: Schedule) => void; disabled?: boolean; id: string; noun: string; problem?: string | null }) {
  return (
    <Section title="Schedule">
      <div className="space-y-4">
        <label className="flex w-fit cursor-pointer items-center gap-2.5">
          <Checkbox checked={value.enabled} disabled={disabled} onCheckedChange={(c) => onChange({ ...value, enabled: c === true })} />
          <span className="text-sm font-medium">Schedule for later</span>
        </label>
        {value.enabled && (
          <Field id={id} label="Send at" required error={problem ?? undefined} hint={`${noun} will be queued and sent automatically at this time, India time (IST).`}>
            <Input type="datetime-local" value={value.at} disabled={disabled} min={isoToIstInput(new Date(Date.now() + 60_000))} onChange={(e) => onChange({ ...value, at: e.target.value })} className="max-w-[260px]" />
          </Field>
        )}
      </div>
    </Section>
  )
}

// ── Page frame: form on the left, preview beside it, actions at the bottom ─

interface FrameProps {
  title: string
  editing: { loading: boolean; error: string | null; scheduledFor: string | null; onStop: () => void } | null
  preview: ReactNode
  children: ReactNode
  /** Shown left of the buttons. */
  status: string
  problem: string | null
  primaryLabel: string
  busyLabel: string | null
  onPrimary: () => void
  extraAction?: ReactNode
}

export function ComposeFrame({ title, editing, preview, children, status, problem, primaryLabel, busyLabel, onPrimary, extraAction }: FrameProps) {
  if (editing?.loading) return <div role="status" aria-label="Loading the scheduled message" className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>
  if (editing?.error) return <ErrorState title="This scheduled message cannot be edited" message={editing.error} back={{ label: 'Back to Scheduled', href: '/notifications?tab=scheduled' }} />
  return (
    <div className="relative">
      <h2 className="mb-4 text-[17px] font-semibold">{title}</h2>
      {editing && (
        <Notice tone="info" title={`Editing a scheduled message${editing.scheduledFor ? ` (${dayTimeIST(editing.scheduledFor)})` : ''}`} className="mb-5">
          Saving replaces it: the old one is cancelled first, then this one is scheduled.
          <button type="button" onClick={editing.onStop} className="ml-1.5 font-medium underline underline-offset-2">Stop editing</button>
        </Notice>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">{children}</div>
        <aside aria-label="Preview" className="min-w-0 xl:sticky xl:top-0 xl:self-start">{preview}</aside>
      </div>
      <EditorBar
        type="button" onSubmit={onPrimary} saving={!!busyLabel} savingLabel={busyLabel ?? ''} submitLabel={primaryLabel} icon={primaryLabel.startsWith('Schedule') || primaryLabel.startsWith('Save') ? CalendarClock : Send}
        note={<span>{problem ?? status}</span>} extra={extraAction}
      />
    </div>
  )
}

// ── Review ───────────────────────────────────────────────────────────────

interface ReviewProps {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  noun: string
  audience: string
  count: AudienceCount
  scheduledAt: string | null
  /** The message in short, as rows. */
  rows: { label: string; value: ReactNode }[]
  warning?: ReactNode
  /** Replacing a scheduled message. */
  replacing?: boolean
}

/** The last look before anything leaves. Nothing is sent until its button. */
export function ReviewDock({ open, onClose, onConfirm, noun, audience, count, scheduledAt, rows, warning, replacing }: ReviewProps) {
  const [checked, setChecked] = useState(false)
  useEffect(() => { if (open) setChecked(false) }, [open])
  const many = count.count === null || count.count > 50
  const people = count.count === null ? '' : ` to ${count.kind === 'atMost' ? 'up to ' : count.kind === 'atLeast' ? 'at least ' : ''}${count.count.toLocaleString('en-IN')} ${count.count === 1 ? 'person' : 'people'}`
  return (
    <ConfirmDock
      open={open} onClose={onClose} onConfirm={onConfirm} tone="default" cancelLabel="Keep editing" disabled={(many && !checked) || count.count === 0}
      title={scheduledAt ? `Review the scheduled ${noun}` : `Review before sending`}
      description={scheduledAt ? `It is sent automatically on ${dayTimeIST(scheduledAt)}.` : `This ${noun} goes out now and cannot be taken back.`}
      confirmLabel={scheduledAt ? (replacing ? 'Replace schedule' : `Schedule ${noun}`) : `Send${people}`}
      workingLabel={scheduledAt ? 'Scheduling…' : 'Sending…'}
    >
      <dl className="divide-y divide-border rounded-lg border border-border text-sm">
        <ReviewRow label="Goes to"><span className="font-medium">{audience}</span><span className="block text-[13px] text-muted-foreground" aria-live="polite">{countText(count)}</span></ReviewRow>
        {rows.map((r) => <ReviewRow key={r.label} label={r.label}>{r.value}</ReviewRow>)}
        <ReviewRow label="When">{scheduledAt ? dayTimeIST(scheduledAt) : 'Now'}</ReviewRow>
      </dl>
      {count.count === 0 && <p className="text-sm text-danger">Nobody in this audience can receive it. Change the audience.</p>}
      {warning}
      {many && (
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <Checkbox className="mt-0.5" checked={checked} onCheckedChange={(c) => setChecked(c === true)} />
          <span>I have read the message and checked who it goes to.</span>
        </label>
      )}
    </ConfirmDock>
  )
}

function ReviewRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-x-4 gap-y-0.5 px-3.5 py-2.5 sm:grid-cols-[110px_minmax(0,1fr)]">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}
