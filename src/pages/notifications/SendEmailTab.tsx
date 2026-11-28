import { useMemo, useRef, useState } from 'react'
import { Eye, Loader2, Paperclip, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Section } from '@/components/common/detail'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, StudentPicker, personName } from '@/components/users/kit'
import { dayTimeIST, errStatus, errText, istInputToISO, isoToIstInput, plural, unwrap } from '@/components/users/lib'
import { notificationsService, type EmailAttachment } from '@/services/notifications.service'
import type { User } from '@/services/users.service'
import { AudiencePicker, audienceProblem, countText, describeAudience, EMPTY_AUDIENCE, loadUsers, scheduleTarget, useAudienceCount, useExcludedIds, useScheduledDraft, type Audience } from './compose/audience'
import { ComposeFrame, NO_SCHEDULE, ReviewDock, ScheduleSection, scheduleProblem, type Schedule } from './compose/frame'

interface PendingAttachment {
  id: string
  /** Null for one that is already on the server (an edited schedule). */
  file: File | null
  filename: string
  url: string | null
  uploading: boolean
}
interface EmailDraft { subject: string; header: string; body: string; footer: string }
const EMPTY: EmailDraft = { subject: '', header: '', body: '', footer: '' }

/** Mirrors the backend's template and its automatic unsubscribe line. */
function buildPreviewHtml(d: EmailDraft): string {
  const headerHtml = d.header.trim() ? `<div style="background-color:#1e40af;color:#ffffff;padding:24px;text-align:center;">${d.header}</div>` : ''
  const unsub = 'You are receiving this email because you have an account with PGME. <a href="#" style="color:#1e40af;text-decoration:underline;">Unsubscribe</a> at any time.'
  const footer = d.footer.trim() ? `${d.footer}<div style="margin-top:12px;">${unsub}</div>` : unsub
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    ${headerHtml}
    <div style="padding:24px;color:#333333;line-height:1.6;">${d.body || '<p style="color:#9ca3af;">Body will appear here</p>'}</div>
    <div style="background-color:#f9fafb;padding:16px 24px;text-align:center;color:#6b7280;font-size:13px;border-top:1px solid #e5e7eb;">${footer}</div>
  </div>
</body></html>`
}

/** The email on its own, with scripts off. */
function EmailFrame({ draft, height }: { draft: EmailDraft; height: number }) {
  const html = useMemo(() => buildPreviewHtml(draft), [draft])
  return <iframe title="Email preview" sandbox="" srcDoc={html} className="w-full rounded-lg border border-border bg-white" style={{ height }} />
}

export function SendEmailTab({ editId, onStopEdit, onSent }: { editId: string | null; onStopEdit: () => void; onSent: (scheduled: boolean) => void }) {
  const [audience, setAudience] = useState<Audience>(EMPTY_AUDIENCE)
  const [excluded, setExcluded] = useState<User[]>([])
  const [draft, setDraft] = useState<EmailDraft>(EMPTY)
  const [attachments, setAttachments] = useState<PendingAttachment[]>([])
  const [schedule, setSchedule] = useState<Schedule>(NO_SCHEDULE)
  const [review, setReview] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [showProblems, setShowProblems] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const set = (patch: Partial<EmailDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const reset = () => { setAudience(EMPTY_AUDIENCE); setExcluded([]); setDraft(EMPTY); setAttachments([]); setSchedule(NO_SCHEDULE); setShowProblems(false) }

  const edit = useScheduledDraft(editId, 'email', async (id) => unwrap(await notificationsService.getScheduledNotification(id)), async (doc, aud) => {
    setAudience(aud)
    setDraft({ subject: doc.email_subject || '', header: doc.email_header || '', body: doc.email_body || '', footer: doc.email_footer || '' })
    setAttachments((doc.email_attachments || []).map((a) => ({ id: a.url, file: null, filename: a.filename, url: a.url, uploading: false })))
    setSchedule({ enabled: true, at: isoToIstInput(doc.scheduled_at) })
    setExcluded(await loadUsers((doc.email_excluded_user_ids || []).map(String)))
  })
  useUnsavedChanges(!!(draft.subject || draft.body || draft.header || draft.footer || attachments.length) && !edit.loading)

  const excludedIds = useExcludedIds(excluded)
  const count = useAudienceCount(audience, 'email', excludedIds)
  const errors = { subject: draft.subject.trim() ? undefined : 'Enter a subject', body: draft.body.trim() ? undefined : 'Enter the email body' }
  const when = scheduleProblem(schedule)
  const problem = audienceProblem(audience) ?? errors.subject ?? errors.body ?? when
  const uploading = attachments.some((a) => a.uploading)

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = '' // so the same file can be chosen again after removal
    if (!files.length) return
    if (attachments.length + files.length > 5) { toast.error('Maximum 5 attachments allowed'); return }
    const tooBig = files.find((f) => f.size > 25 * 1024 * 1024)
    if (tooBig) { toast.error(`"${tooBig.name}" exceeds the 25 MB limit`); return }
    setAttachments((prev) => [...prev, ...files.map((file, i) => ({ id: `${file.name}-${file.size}-${prev.length + i}`, file, filename: file.name, url: null, uploading: false }))])
  }

  const uploadAll = async (): Promise<EmailAttachment[]> => {
    const done: EmailAttachment[] = []
    for (const item of attachments) {
      if (item.url || !item.file) { if (item.url) done.push({ url: item.url, filename: item.filename }); continue }
      setAttachments((prev) => prev.map((a) => (a.id === item.id ? { ...a, uploading: true } : a)))
      try {
        const { uploadUrl, fileUrl } = unwrap(await notificationsService.getAttachmentUploadUrl(item.file.type, item.filename), `"${item.filename}" could not be uploaded.`)
        const res = await fetch(uploadUrl, { method: 'PUT', body: item.file, headers: { 'Content-Type': item.file.type } })
        if (!res.ok) throw new Error(`"${item.filename}" could not be uploaded. Try again or remove it.`)
        setAttachments((prev) => prev.map((a) => (a.id === item.id ? { ...a, url: fileUrl, uploading: false } : a)))
        done.push({ url: fileUrl, filename: item.filename })
      } catch (err) {
        setAttachments((prev) => prev.map((a) => (a.id === item.id ? { ...a, uploading: false } : a)))
        throw new Error(errText(err, `"${item.filename}" could not be uploaded.`))
      }
    }
    return done
  }

  const openReview = () => {
    if (problem) { setShowProblems(true); toast.error(problem); return }
    setReview(true)
  }

  const send = async () => {
    const files = await uploadAll()
    const payload = {
      subject: draft.subject.trim(), body: draft.body.trim(),
      ...(draft.header.trim() && { header: draft.header.trim() }),
      ...(draft.footer.trim() && { footer: draft.footer.trim() }),
      ...(files.length > 0 && { attachments: files }),
      ...(excludedIds.length > 0 && { excluded_user_ids: excludedIds }),
    }
    if (schedule.enabled) {
      const at = istInputToISO(schedule.at)
      if (edit.doc) unwrap(await notificationsService.cancelScheduledNotification(edit.doc._id), 'The old schedule could not be cancelled, so nothing was changed.')
      unwrap(await notificationsService.scheduleNotification({
        channel: 'email', ...scheduleTarget(audience), scheduled_at: at,
        email_subject: payload.subject, email_body: payload.body, email_header: payload.header, email_footer: payload.footer, email_attachments: payload.attachments,
        ...(excludedIds.length > 0 && { email_excluded_user_ids: excludedIds }),
      }), 'Failed to schedule email')
      toast.success(`Email scheduled for ${dayTimeIST(at)}`)
      reset(); onSent(true)
      return
    }
    if (edit.doc) unwrap(await notificationsService.cancelScheduledNotification(edit.doc._id), 'The old schedule could not be cancelled, so nothing was sent.')
    const res = audience.target === 'all' ? await notificationsService.sendEmailToAll(payload)
      : audience.target === 'session' ? await notificationsService.sendEmailToSession({ ...payload, session_id: audience.sessionId })
        : audience.target === 'specific' ? await notificationsService.sendEmailToUsers({ ...payload, user_ids: audience.users.map((u) => u._id) })
          : audience.subjectScope === 'package' ? await notificationsService.sendEmailToPackage({ ...payload, package_id: audience.packageId })
            : audience.subjectScope === 'series' ? await notificationsService.sendEmailToSeries({ ...payload, series_id: audience.seriesId })
              : await notificationsService.sendEmailToSubject({ ...payload, subject_id: audience.subjectId })
    const { sent, failed, total, failedEmails, account } = unwrap(res, 'Failed to send email')
    const note = account === 'fallback' ? ' (via fallback account)' : ''
    if (sent === 0 && total > 0) throw new Error(`All ${total} emails failed${note}. Reason: ${failedEmails?.[0]?.error || 'not given'}`)
    if (failed === 0) toast.success(`All ${sent} emails delivered successfully!${note}`)
    else toast.warning(`${sent}/${total} delivered, ${failed} failed${note}.${failedEmails?.[0]?.error ? ` Common error: ${failedEmails[0].error}` : ''}`, { duration: 10000 })
    reset(); onSent(false)
  }
  const sendSafely = async () => {
    try { await send() } catch (err) {
      const status = errStatus(err)
      if (!schedule.enabled && (status === 504 || status === 408)) {
        // The server is probably still sending; sending again would email people twice
        toast.warning('The server took too long to answer, but the emails are probably still being sent. Check History in a few minutes before sending again.', { duration: 15000 })
        setReview(false)
        return
      }
      throw new Error(errText(err, 'Failed to send email'))
    }
  }

  return (
    <>
      <ComposeFrame
        title="Send Email"
        editing={editId ? { loading: edit.loading, error: edit.error, scheduledFor: edit.doc?.scheduled_at ?? null, onStop: () => { reset(); onStopEdit() } } : null}
        preview={(
          <Section title="Preview" description="What the recipient sees.">
            <p className="mb-3 break-words rounded-lg border border-border bg-muted/40 px-3.5 py-2 text-[13px]"><span className="text-muted-foreground">Subject: </span>{draft.subject || <span className="text-muted-foreground">No subject</span>}</p>
            <EmailFrame draft={draft} height={420} />
            {attachments.length > 0 && <ul className="mt-3 flex flex-wrap gap-1.5">{attachments.map((a) => <li key={a.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs"><Paperclip aria-hidden="true" className="h-3 w-3 shrink-0" /><span className="truncate">{a.filename}</span></li>)}</ul>}
          </Section>
        )}
        status={`${describeAudience(audience, 'email')}${countText(count) ? ` · ${countText(count)}` : ''}`}
        problem={showProblems ? problem : audienceProblem(audience)}
        primaryLabel={schedule.enabled ? (edit.doc ? 'Save Schedule' : 'Schedule Email') : 'Send Email'}
        busyLabel={uploading && !review ? 'Uploading attachments…' : null}
        onPrimary={openReview}
        extraAction={<Button type="button" variant="outline" className="bg-card" onClick={() => setPreviewOpen(true)} disabled={!draft.body.trim()}><Eye aria-hidden="true" />Preview</Button>}
      >
        <Section title="Target Audience"><AudiencePicker idPrefix="email" value={audience} onChange={setAudience} /></Section>

        <Section title={<>Exclude these users from this send <span className="text-[13px] font-normal text-muted-foreground">(optional)</span></>} description="Skip specific users for this send only. Their persistent email preference is not changed.">
          <StudentPicker id="email-exclude" label="Users to exclude" value={excluded} onChange={setExcluded} placeholder="Search users to exclude..." />
        </Section>

        <Section title="Email Template">
          <div className="space-y-5">
            <Field id="email-subject" label="Subject" required error={showProblems ? errors.subject : undefined} aside={`${draft.subject.length}/200`}>
              <Input placeholder="e.g. New Live Session Available. Don't Miss It!" value={draft.subject} onChange={(e) => set({ subject: e.target.value })} maxLength={200} />
            </Field>
            <Field id="email-header" label="Header" optional hint="Displayed at the top of the email in a highlighted banner. Supports HTML." aside={`${draft.header.length}/2000`}>
              <Textarea placeholder="e.g. <strong>PGME</strong> · Your Medical Education Partner" value={draft.header} onChange={(e) => set({ header: e.target.value })} maxLength={2000} rows={2} />
            </Field>
            <Field id="email-body" label="Body" required error={showProblems ? errors.body : undefined} hint="Main email content. Supports HTML tags for formatting." aside={`${draft.body.length.toLocaleString('en-IN')}/50,000`}>
              <Textarea
                placeholder={'e.g. <p>Dear Student,</p>\n<p>Dr. Sharma is going live on <strong>Anatomy</strong> at 5 PM today. Join now to ask questions in real time!</p>\n<p>Best,<br>The PGME Team</p>'}
                value={draft.body} onChange={(e) => set({ body: e.target.value })} maxLength={50000} rows={10} className="font-mono text-sm"
              />
            </Field>
            <Field id="email-footer" label="Footer" optional hint="Shown at the bottom of the email in a muted footer strip. Supports HTML." aside={`${draft.footer.length}/2000`}>
              <Textarea placeholder="e.g. © 2025 PGME. All rights reserved. · You are receiving this because you are enrolled in PGME." value={draft.footer} onChange={(e) => set({ footer: e.target.value })} maxLength={2000} rows={2} />
            </Field>
            <div className="space-y-2.5">
              <p className="text-[13px] font-medium">Attachments <span className="font-normal text-muted-foreground">(optional, max 5 × 25 MB)</span></p>
              {attachments.length > 0 && (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {attachments.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 px-3.5 py-2 text-sm">
                      <Paperclip aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate" title={a.filename}>{a.filename}</span>
                      {a.file && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{(a.file.size / 1024 / 1024).toFixed(1)} MB</span>}
                      {a.uploading ? <Loader2 aria-label="Uploading" className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" /> : <span className={a.url ? 'shrink-0 text-xs text-success' : 'shrink-0 text-xs text-muted-foreground'}>{a.url ? 'Uploaded' : 'Pending'}</span>}
                      <button type="button" onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))} disabled={a.uploading} aria-label={`Remove ${a.filename}`} className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Trash2 aria-hidden="true" className="h-3.5 w-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}
              {attachments.length < 5 && (
                <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-2 rounded-lg border-2 border-dashed border-input px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
                  <Paperclip aria-hidden="true" className="h-4 w-4" />Attach file
                </button>
              )}
              <input ref={fileInput} type="file" multiple onChange={addFiles} className="sr-only" tabIndex={-1} aria-label="Attachments" />
            </div>
          </div>
        </Section>

        <ScheduleSection id="email-schedule-at" noun="Email" value={schedule} onChange={setSchedule} problem={showProblems ? when : null} />
      </ComposeFrame>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen} guardUnsaved={false}>
        <DialogContent size="default" backLabel="Back to the email">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription className="break-words">Subject: {draft.subject || 'No subject'}</DialogDescription>
          </DialogHeader>
          <EmailFrame draft={draft} height={640} />
          {attachments.length > 0 && <ul className="flex flex-wrap gap-2">{attachments.map((a) => <li key={a.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"><Paperclip aria-hidden="true" className="h-3 w-3 shrink-0" /><span className="truncate">{a.filename}</span></li>)}</ul>}
        </DialogContent>
      </Dialog>

      <ReviewDock
        open={review} onClose={() => setReview(false)} onConfirm={sendSafely} noun="email" audience={describeAudience(audience, 'email')} count={count}
        scheduledAt={schedule.enabled && schedule.at ? istInputToISO(schedule.at) : null} replacing={!!edit.doc}
        rows={[
          { label: 'Subject', value: <span className="font-medium">{draft.subject}</span> },
          ...(attachments.length ? [{ label: 'Attachments', value: attachments.map((a) => a.filename).join(', ') }] : []),
          ...(excluded.length ? [{ label: 'Left out', value: excluded.length <= 5 ? excluded.map(personName).join(', ') : plural(excluded.length, 'user') }] : []),
          { label: 'Unsubscribed', value: 'People who unsubscribed or were excluded are skipped.' },
        ]}
      />
    </>
  )
}
