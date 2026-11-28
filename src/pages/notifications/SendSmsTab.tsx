import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Section } from '@/components/common/detail'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/users/kit'
import { dayTimeIST, errText, istInputToISO, isoToIstInput, plural, unwrap } from '@/components/users/lib'
import { notificationsService } from '@/services/notifications.service'
import { AudiencePicker, audienceProblem, countText, describeAudience, EMPTY_AUDIENCE, scheduleTarget, useAudienceCount, useScheduledDraft, type Audience } from './compose/audience'
import { ComposeFrame, NO_SCHEDULE, ReviewDock, ScheduleSection, scheduleProblem, type Schedule } from './compose/frame'

/** Plain SMS characters. Anything else (Hindi, curly quotes) halves the length of each part. */
const GSM = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/
const GSM_DOUBLE = /[\^{}\\[~\]|€]/g

function getSmsInfo(text: string) {
  const unicode = !GSM.test(text)
  const single = unicode ? 70 : 160
  const concat = unicode ? 67 : 153
  const chars = unicode ? text.length : text.length + (text.match(GSM_DOUBLE)?.length ?? 0)
  if (chars === 0) return { parts: 0, remaining: single, chars: 0, unicode }
  if (chars <= single) return { parts: 1, remaining: single - chars, chars, unicode }
  const parts = Math.ceil(chars / concat)
  const used = chars % concat || concat
  return { parts, remaining: concat - used, chars, unicode }
}

export function SendSmsTab({ editId, onStopEdit, onSent }: { editId: string | null; onStopEdit: () => void; onSent: (scheduled: boolean) => void }) {
  const [audience, setAudience] = useState<Audience>(EMPTY_AUDIENCE)
  const [message, setMessage] = useState('')
  const [schedule, setSchedule] = useState<Schedule>(NO_SCHEDULE)
  const [review, setReview] = useState(false)
  const [showProblems, setShowProblems] = useState(false)
  const reset = () => { setAudience(EMPTY_AUDIENCE); setMessage(''); setSchedule(NO_SCHEDULE); setShowProblems(false) }

  const edit = useScheduledDraft(editId, 'sms', async (id) => unwrap(await notificationsService.getScheduledNotification(id)), (doc, aud) => {
    setAudience(aud)
    setMessage(doc.sms_message || '')
    setSchedule({ enabled: true, at: isoToIstInput(doc.scheduled_at) })
  })
  useUnsavedChanges(!!message && !edit.loading)

  const info = useMemo(() => getSmsInfo(message), [message])
  const messageError = message.trim() ? undefined : 'Enter a message'
  const when = scheduleProblem(schedule)
  const problem = audienceProblem(audience) ?? messageError ?? when
  const count = useAudienceCount(audience, 'sms')
  const totalSms = count.count !== null ? count.count * Math.max(1, info.parts) : null

  const openReview = () => {
    if (problem) { setShowProblems(true); toast.error(problem); return }
    setReview(true)
  }

  const send = async () => {
    const text = message.trim()
    if (schedule.enabled) {
      const at = istInputToISO(schedule.at)
      if (edit.doc) unwrap(await notificationsService.cancelScheduledNotification(edit.doc._id), 'The old schedule could not be cancelled, so nothing was changed.')
      unwrap(await notificationsService.scheduleNotification({ channel: 'sms', ...scheduleTarget(audience), scheduled_at: at, sms_message: text }), 'Failed to schedule SMS')
      toast.success(`SMS scheduled for ${dayTimeIST(at)}`)
      reset(); onSent(true)
      return
    }
    if (edit.doc) unwrap(await notificationsService.cancelScheduledNotification(edit.doc._id), 'The old schedule could not be cancelled, so nothing was sent.')
    const res = audience.target === 'all' ? await notificationsService.sendSmsToAll({ message: text })
      : audience.target === 'session' ? await notificationsService.sendSmsToSession({ session_id: audience.sessionId, message: text })
        : audience.target === 'specific' ? await notificationsService.sendSmsToUsers({ user_ids: audience.users.map((u) => u._id), message: text })
          : audience.subjectScope === 'package' ? await notificationsService.sendSmsToPackage({ package_id: audience.packageId, message: text })
            : audience.subjectScope === 'series' ? await notificationsService.sendSmsToSeries({ series_id: audience.seriesId, message: text })
              : await notificationsService.sendSmsToSubject({ subject_id: audience.subjectId, message: text })
    const { sent, failed, total } = unwrap(res, 'Failed to send SMS')
    toast.success(`SMS sent! ${sent}/${total} delivered${failed > 0 ? `, ${failed} failed` : ''}`)
    reset(); onSent(false)
  }
  const sendSafely = async () => { try { await send() } catch (err) { throw new Error(errText(err, 'Failed to send SMS')) } }

  return (
    <>
      <ComposeFrame
        title="Send SMS"
        editing={editId ? { loading: edit.loading, error: edit.error, scheduledFor: edit.doc?.scheduled_at ?? null, onStop: () => { reset(); onStopEdit() } } : null}
        preview={(
          <Section title="Preview" description="How it looks on a phone.">
            <div className="rounded-2xl bg-muted p-4">
              <p className="w-fit max-w-full whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-card px-3.5 py-2.5 text-sm shadow-card">{message || <span className="text-muted-foreground">Message</span>}</p>
            </div>
            <dl className="mt-4 space-y-1.5 text-[13px]">
              <div className="flex justify-between"><dt className="text-muted-foreground">Parts per person</dt><dd className="font-medium tabular-nums">{info.parts || 0}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Total SMS</dt><dd className="font-medium tabular-nums">{totalSms === null ? 'Not known' : `${count.kind === 'atMost' ? 'up to ' : count.kind === 'atLeast' ? 'at least ' : ''}${totalSms.toLocaleString('en-IN')}`}</dd></div>
            </dl>
          </Section>
        )}
        status={`${describeAudience(audience, 'sms')}${countText(count) ? ` · ${countText(count)}` : ''}`}
        problem={showProblems ? problem : audienceProblem(audience)}
        primaryLabel={schedule.enabled ? (edit.doc ? 'Save Schedule' : 'Schedule SMS') : 'Send SMS'}
        busyLabel={null}
        onPrimary={openReview}
      >
        <Section title="Target Audience"><AudiencePicker idPrefix="sms" value={audience} onChange={setAudience} /></Section>
        <Section title="Message">
          <Field id="sms-message" label="Message" required error={showProblems ? messageError : undefined}>
            <Textarea placeholder="e.g. Dr. Sharma's Anatomy session starts in 30 mins. Join now on PGME!" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1600} rows={5} />
          </Field>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs" aria-live="polite">
            <span className="text-muted-foreground">
              {plural(info.chars, 'character')}
              {info.parts > 1 && <span className="text-warning"> · {info.parts} SMS parts (carriers may bill separately)</span>}
            </span>
            <span className={info.remaining <= 10 && info.parts > 0 ? 'font-medium tabular-nums text-danger' : info.remaining <= 30 && info.parts > 0 ? 'font-medium tabular-nums text-warning' : 'font-medium tabular-nums text-muted-foreground'}>{info.remaining} left in part {info.parts || 1}</span>
          </div>
          {info.unicode && <p className="mt-1.5 text-xs text-warning">This text has characters outside plain SMS (for example Hindi or curly quotes), so each part holds 70 characters instead of 160.</p>}
          <p className="mt-2 text-xs text-muted-foreground">Plain text only, no HTML or markdown. Keep it under {info.unicode ? 70 : 160} characters for a single SMS. Numbers are sent as <span className="font-mono">+91XXXXXXXXXX</span>.</p>
        </Section>
        <ScheduleSection id="sms-schedule-at" noun="SMS" value={schedule} onChange={setSchedule} problem={showProblems ? when : null} />
      </ComposeFrame>
      <ReviewDock
        open={review} onClose={() => setReview(false)} onConfirm={sendSafely} noun="SMS" audience={describeAudience(audience, 'sms')} count={count}
        scheduledAt={schedule.enabled && schedule.at ? istInputToISO(schedule.at) : null} replacing={!!edit.doc}
        rows={[
          { label: 'Message', value: <span className="whitespace-pre-wrap">{message}</span> },
          { label: 'Length', value: `${plural(info.parts, 'part')} per person${totalSms !== null ? `, ${count.kind === 'atMost' ? 'up to ' : count.kind === 'atLeast' ? 'at least ' : ''}${totalSms.toLocaleString('en-IN')} SMS in all` : ''}` },
        ]}
      />
    </>
  )
}
