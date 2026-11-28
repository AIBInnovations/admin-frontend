import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, BellRing, Loader2, X } from 'lucide-react'
import { StatusPill, apiErrorInfo, type Tone } from '@/components/common/detail'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { errText, plural, unwrap, useResource } from '@/components/users/lib'
import { relativeTime } from '@/lib/relativeTime'
import {
  subscriptionsService,
  type ReminderCandidate,
  type ReminderChannels,
  type ReminderCheck,
  type ReminderItem,
  type ReminderResult,
  type ReminderSendResult,
} from '@/services/subscriptions.service'

const ist = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })
const day = (iso: string | null) => (iso && !Number.isNaN(Date.parse(iso)) ? ist.format(new Date(iso)) : 'No date')
const endsText = (n: number | null) => (n === null ? '' : n <= 0 ? 'ends today' : n === 1 ? 'ends tomorrow' : `ends in ${n} days`)
const BY: Record<string, string> = { cron: 'the daily reminder', admin: 'a reminder run', manual: 'hand' }
const recentText = (r: NonNullable<ReminderCandidate['recent']>) => `Reminded ${relativeTime(r.at)}${r.triggered_by === 'manual' ? (r.sent_by_admin_name ? ` by ${r.sent_by_admin_name}` : ' by hand') : ` by ${BY[r.triggered_by] ?? 'the daily reminder'}`}`

const RESULT: Record<ReminderResult['status'], { label: string; tone: Tone }> = {
  sent: { label: 'Sent', tone: 'success' },
  partial: { label: 'Partly sent', tone: 'warning' },
  failed: { label: 'Not sent', tone: 'danger' },
  skipped: { label: 'Skipped', tone: 'neutral' },
}
const CHANNEL_LABEL = { email: 'Email', push: 'Push', in_app: 'In-app' } as const

/**
 * "Send reminder now" (Aviraj, 28 Nov 2026): the expiry reminder the daily job
 * sends, sent now to the chosen subscriptions, with switches for email, push
 * and in-app (preset to what the daily job uses). A subscription reminded in
 * the last hour needs a second confirmation. Shown beside the Subscriptions
 * list, or in a drawer on narrow screens and on a student's page.
 */
export function ReminderPanel({ items, canSend, onClose, onSent, title }: {
  items: ReminderItem[]
  canSend: boolean
  onClose: () => void
  onSent?: (result: ReminderSendResult) => void
  title?: string
}) {
  const key = items.map((i) => `${i.type}:${i.purchase_id}`).join(',')
  const { data, loading, error, reload } = useResource<ReminderCheck>(
    async () => unwrap(await subscriptionsService.checkReminders(items), 'Could not check these subscriptions'),
    [key],
  )
  const [channels, setChannels] = useState<ReminderChannels | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [recentAsk, setRecentAsk] = useState<ReminderCandidate[] | null>(null)
  const [result, setResult] = useState<ReminderSendResult | null>(null)
  const askRef = useRef<HTMLDivElement>(null)
  const headingId = useId()

  useEffect(() => { if (data && !channels) setChannels(data.defaults) }, [data, channels])
  useEffect(() => { if (recentAsk) askRef.current?.focus() }, [recentAsk])

  const sendable = useMemo(() => (data?.items ?? []).filter((c) => c.can_send), [data])
  const blocked = (data?.items ?? []).length - sendable.length
  const ch = channels ?? data?.defaults ?? { email: true, push: true, in_app: true }
  // A push record is also the app's notification list entry
  const inAppIncluded = ch.push
  const effective: ReminderChannels = { ...ch, in_app: ch.in_app || inAppIncluded }
  const anyChannel = effective.email || effective.push || effective.in_app
  const noEmail = effective.email ? sendable.filter((c) => !c.has_email || c.email_unsubscribed).length : 0

  const send = async (list: ReminderItem[], confirmRecent: boolean) => {
    if (sending || !list.length) return
    setSending(true)
    setSendError(null)
    try {
      const res = unwrap(await subscriptionsService.sendReminders({ items: list, channels: effective, confirm_recent: confirmRecent }), 'The reminder was not sent')
      setRecentAsk(null)
      setResult(res)
      const done = res.totals.sent + res.totals.partial
      if (done > 0) toast.success(`Reminder sent to ${plural(done, 'student')}`)
      else toast.error('No reminder was sent')
      onSent?.(res)
    } catch (err) {
      const info = apiErrorInfo<{ recent?: ReminderCandidate[] }>(err)
      if (info.code === 'REMINDER_SENT_RECENTLY' && info.details?.recent?.length) setRecentAsk(info.details.recent)
      else setSendError(errText(err, 'The reminder was not sent. Please try again.'))
    } finally {
      setSending(false)
    }
  }
  const all: ReminderItem[] = sendable.map((c) => ({ type: c.type, purchase_id: c.purchase_id }))
  const recentIds = new Set((recentAsk ?? []).map((c) => c.purchase_id))
  const rest = all.filter((i) => !recentIds.has(i.purchase_id))

  const many = items.length > 1
  return (
    <div className="flex h-full min-h-0 flex-col bg-card" role="region" aria-labelledby={headingId}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 id={headingId} className="text-[15px] font-semibold">{title || 'Send reminder now'}</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {many ? `${plural(items.length, 'subscription')} chosen. ` : ''}The same expiry reminder the daily job sends, sent now. The daily reminder still goes as usual.
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="-mr-2 h-8 w-8 shrink-0" onClick={onClose} aria-label="Close"><X aria-hidden="true" /></Button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {loading && !data ? (
          <div role="status" aria-label="Checking the subscriptions" className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 rounded-md" />)}
          </div>
        ) : !data ? (
          <div role="alert" className="space-y-3 rounded-lg bg-danger-soft px-3.5 py-3 text-sm text-danger">
            <p>{error || 'Could not check these subscriptions.'}</p>
            <Button size="sm" variant="outline" className="bg-card" onClick={() => reload()}>Try again</Button>
          </div>
        ) : result ? (
          <Results result={result} />
        ) : (
          <>
            <section aria-label="Who gets it" className="space-y-2">
              <h3 className="text-sm font-semibold">{sendable.length === 1 ? 'Who gets it' : `Who gets it (${sendable.length})`}</h3>
              {blocked > 0 && <p className="text-[13px] text-muted-foreground">{plural(blocked, 'subscription')} cannot get a reminder and {blocked === 1 ? 'is' : 'are'} skipped.</p>}
              <ul className="divide-y divide-border rounded-lg border border-border">
                {data.items.slice(0, 100).map((c) => <Candidate key={`${c.type}:${c.purchase_id}`} c={c} emailOn={effective.email} />)}
              </ul>
            </section>

            <fieldset className="space-y-3" disabled={sending}>
              <legend className="mb-1 text-sm font-semibold">Send by</legend>
              <ChannelSwitch id="rem-email" label="Email" checked={ch.email} onChange={(v) => setChannels({ ...ch, email: v })}
                hint={noEmail ? `${plural(noEmail, 'student')} without an email address (or unsubscribed) will not get the email.` : 'With the renew button and the unsubscribe link, as the daily email.'} />
              <ChannelSwitch id="rem-push" label="Push" checked={ch.push} onChange={(v) => setChannels({ ...ch, push: v })}
                hint={data.push_configured ? 'To the student\'s signed-in phones, unless they turned push off.' : 'Push is not set up on this server, so it will be skipped. It goes out on the live server.'} />
              <ChannelSwitch id="rem-inapp" label="In-app" checked={effective.in_app} disabled={inAppIncluded} onChange={(v) => setChannels({ ...ch, in_app: v })}
                hint={inAppIncluded ? 'Included with push: a push also appears in the app\'s notification list.' : 'Adds it to the student\'s notification list in the app.'} />
              {!anyChannel && <p role="alert" className="text-sm text-danger">Switch on at least one way to send it.</p>}
            </fieldset>

            {recentAsk && (
              <div ref={askRef} tabIndex={-1} role="alertdialog" aria-labelledby="rem-recent-title" aria-describedby="rem-recent-desc" className="space-y-3 rounded-lg border border-warning/40 bg-warning-soft px-3.5 py-3 outline-none">
                <div className="flex gap-2">
                  <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <div className="min-w-0">
                    <h3 id="rem-recent-title" className="text-sm font-semibold">{recentAsk.length === 1 ? 'Reminded less than an hour ago' : `${recentAsk.length} were reminded less than an hour ago`}</h3>
                    <ul id="rem-recent-desc" className="mt-1 space-y-0.5 text-[13px]">
                      {recentAsk.slice(0, 10).map((c) => <li key={c.purchase_id} className="break-words">{c.student?.name || 'Student'}, {c.item_name}: {c.recent ? recentText(c.recent) : 'recently'}</li>)}
                      {recentAsk.length > 10 && <li>and {recentAsk.length - 10} more</li>}
                    </ul>
                    <p className="mt-1 text-[13px]">Send {recentAsk.length === 1 ? 'it' : 'to them'} again anyway?</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => send(all, true)} disabled={sending}>{sending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <BellRing aria-hidden="true" />}{sending ? 'Sending…' : 'Send again anyway'}</Button>
                  {rest.length > 0 && <Button size="sm" variant="outline" className="bg-card" onClick={() => send(rest, false)} disabled={sending}>Skip them, send to {plural(rest.length, 'other')}</Button>}
                  <Button size="sm" variant="ghost" onClick={() => setRecentAsk(null)} disabled={sending}>Cancel</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-border px-5 py-3">
        {sendError && <p role="alert" className="mb-2 text-sm text-danger">{sendError}</p>}
        {result ? (
          <div className="flex justify-end"><Button onClick={onClose}>Done</Button></div>
        ) : !canSend ? (
          <p className="rounded-lg bg-warning-soft px-3.5 py-2.5 text-[13px] text-warning">You do not have permission to send reminders (users.update).</p>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" className="bg-card" onClick={onClose} disabled={sending}>Cancel</Button>
            <Button onClick={() => send(all, false)} disabled={sending || !data || !sendable.length || !anyChannel || !!recentAsk}>
              {sending ? <Loader2 aria-hidden="true" className="animate-spin" /> : <BellRing aria-hidden="true" />}
              {sending ? 'Sending…' : sendable.length > 1 ? `Send to ${plural(sendable.length, 'student')}` : 'Send reminder now'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function Candidate({ c, emailOn }: { c: ReminderCandidate; emailOn: boolean }) {
  return (
    <li className="px-3.5 py-2.5">
      <p className="break-words text-sm font-medium">{c.student?.name || 'Deleted account'}{c.student?.student_id && <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">{c.student.student_id}</span>}</p>
      <p className="break-words text-[13px] text-muted-foreground">{c.item_name || 'Deleted item'}{c.tier_name ? `, ${c.tier_name}` : ''}{c.expires_at ? `, ${endsText(c.days_left)} (${day(c.expires_at)})` : ''}</p>
      {!c.can_send && <p className="mt-0.5 text-xs font-medium text-warning">Skipped: {c.problem_label || 'cannot get a reminder'}</p>}
      {c.can_send && c.recent && <p className="mt-0.5 text-xs text-warning">{recentText(c.recent)}</p>}
      {c.can_send && emailOn && !c.has_email && <p className="mt-0.5 text-xs text-muted-foreground">No email address on the account</p>}
      {c.can_send && emailOn && c.has_email && c.email_unsubscribed && <p className="mt-0.5 text-xs text-muted-foreground">Unsubscribed from emails</p>}
    </li>
  )
}

function ChannelSwitch({ id, label, checked, onChange, hint, disabled }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; hint: string; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
        <p id={`${id}-hint`} className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} aria-describedby={`${id}-hint`} className="mt-0.5 shrink-0" />
    </div>
  )
}

function Results({ result }: { result: ReminderSendResult }) {
  const t = result.totals
  return (
    <section aria-live="polite" className="space-y-3">
      <h3 className="text-sm font-semibold">
        {t.sent + t.partial > 0 ? `Sent to ${plural(t.sent + t.partial, 'student')}` : 'Nothing was sent'}
        {t.failed > 0 && `, ${t.failed} not sent`}
        {t.skipped > 0 && `, ${t.skipped} skipped`}
      </h3>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {result.results.map((r) => (
          <li key={`${r.type}:${r.purchase_id}`} className="space-y-1 px-3.5 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 break-words text-sm font-medium">{r.student?.name || 'Deleted account'}</p>
              <StatusPill tone={RESULT[r.status].tone}>{RESULT[r.status].label}</StatusPill>
            </div>
            <p className="break-words text-[13px] text-muted-foreground">{r.item_name}</p>
            {r.problem_label && r.status === 'skipped' && <p className="text-xs text-muted-foreground">{r.problem_label}</p>}
            {r.channels && (
              <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                {(['email', 'push', 'in_app'] as const).map((k) => (
                  <li key={k} className={r.channels![k] === 'sent' ? 'text-success' : r.channels![k] === 'failed' ? 'text-danger' : 'text-muted-foreground'}>
                    {CHANNEL_LABEL[k]}: {r.channels![k] === 'sent' ? 'sent' : r.channels![k] === 'failed' ? 'failed' : 'skipped'}
                    {r.note_labels?.[k] && r.notes?.[k] !== 'off' && r.notes?.[k] !== 'with_push' ? ` (${r.note_labels[k]!.toLowerCase()})` : r.notes?.[k] === 'with_push' ? ' (with the push)' : ''}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
