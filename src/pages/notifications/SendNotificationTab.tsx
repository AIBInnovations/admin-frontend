import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, ImagePlus, Loader2, MousePointerClick, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Section } from '@/components/common/detail'
import { useUnsavedChanges } from '@/components/layouts/workspaceStore'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field, SearchSelect, type SelectOption } from '@/components/users/kit'
import { dayTimeIST, errText, istInputToISO, isoToIstInput, unwrap, useResource } from '@/components/users/lib'
import { booksService } from '@/services/books.service'
import { liveSessionsService } from '@/services/liveSessions.service'
import { notificationsService, type PushPayload } from '@/services/notifications.service'
import { packagesService, type Package as PackageType } from '@/services/packages.service'
import { packageTypesService } from '@/services/packageTypes.service'
import { AudiencePicker, audienceProblem, describeAudience, EMPTY_AUDIENCE, scheduleTarget, useAudienceCount, useScheduledDraft, countText, type Audience } from './compose/audience'
import { ComposeFrame, NO_SCHEDULE, ReviewDock, ScheduleSection, scheduleProblem, type Schedule } from './compose/frame'

type ClickAction = 'none' | 'external_url' | 'theory_package' | 'practical_package' | 'ebook' | 'live_session'

const ACTION_HINT: Record<ClickAction, string> = {
  none: 'No navigation when the notification is tapped.',
  external_url: 'Opens an external URL in the browser.',
  theory_package: 'Navigates to the selected theory package screen in the app.',
  practical_package: 'Navigates to the selected practical package screen in the app.',
  ebook: 'Opens the ebook store in the app.',
  live_session: 'Opens the selected live session details in the app.',
}

interface PushDraft { title: string; message: string; action: ClickAction; externalUrl: string; targetId: string; targetName: string }
const EMPTY: PushDraft = { title: '', message: '', action: 'none', externalUrl: '', targetId: '', targetName: '' }

const typeName = (pkg: PackageType) => (pkg.package_type_id && typeof pkg.package_type_id === 'object' ? (pkg.package_type_id.name || '').toLowerCase() : '')
const typeId = (pkg: PackageType) => (pkg.package_type_id && typeof pkg.package_type_id === 'object' ? pkg.package_type_id._id : String(pkg.package_type_id ?? ''))

async function loadTargets(action: ClickAction): Promise<SelectOption[]> {
  if (action === 'theory_package' || action === 'practical_package') {
    const wanted = action === 'theory_package' ? 'theory' : 'practical'
    const [pkgs, types] = await Promise.all([packagesService.getAll({ is_active: true, limit: 100 }), packageTypesService.getAllPublic()])
    const wantedId = (types.data || []).find((t) => t.name.toLowerCase() === wanted)?._id
    return unwrap(pkgs).entities.filter((p) => (typeName(p) ? typeName(p) === wanted : !!wantedId && typeId(p) === wantedId)).map((p) => ({ value: p._id, label: p.name }))
  }
  if (action === 'ebook') return unwrap(await booksService.getAll({ limit: 100, is_available: true })).entities.filter((b) => b.ebook).map((b) => ({ value: b._id, label: b.title, hint: b.author || undefined }))
  if (action === 'live_session') {
    return unwrap(await liveSessionsService.getAll({ limit: 100, publish_status: 'published' })).entities
      .filter((s) => s.status === 'scheduled' || s.status === 'live')
      .map((s) => ({ value: s._id, label: s.title, hint: s.status === 'live' ? 'Live now' : s.scheduled_start_time ? dayTimeIST(s.scheduled_start_time) : undefined }))
  }
  return []
}

export function SendNotificationTab({ editId, onStopEdit, onSent }: { editId: string | null; onStopEdit: () => void; onSent: (scheduled: boolean) => void }) {
  const [audience, setAudience] = useState<Audience>(EMPTY_AUDIENCE)
  const [draft, setDraft] = useState<PushDraft>(EMPTY)
  const [schedule, setSchedule] = useState<Schedule>(NO_SCHEDULE)
  const [image, setImage] = useState<{ file: File | null; preview: string | null; url: string | null }>({ file: null, preview: null, url: null })
  const [uploading, setUploading] = useState(false)
  const [review, setReview] = useState(false)
  const [showProblems, setShowProblems] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const set = (patch: Partial<PushDraft>) => setDraft((d) => ({ ...d, ...patch }))
  const clearImage = () => setImage((prev) => { if (prev.file && prev.preview) URL.revokeObjectURL(prev.preview); return { file: null, preview: null, url: null } })
  const reset = () => { setAudience(EMPTY_AUDIENCE); setDraft(EMPTY); setSchedule(NO_SCHEDULE); clearImage(); setShowProblems(false); if (fileInput.current) fileInput.current.value = '' }

  const edit = useScheduledDraft(editId, 'push', async (id) => unwrap(await notificationsService.getScheduledNotification(id)), (doc, aud) => {
    setAudience(aud)
    const route = doc.internal_route || ''
    const params = doc.internal_params || {}
    const action: ClickAction = doc.link_type === 'external' ? 'external_url'
      : route === '/revision-series' ? 'theory_package' : route === '/practical-series' ? 'practical_package' : route === '/ebook-store' ? 'ebook' : route.startsWith('/session/') ? 'live_session' : 'none'
    setDraft({ title: doc.title || '', message: doc.message || '', action, externalUrl: doc.external_url || '', targetId: params.packageId || params.bookId || params.id || '', targetName: '' })
    setSchedule({ enabled: true, at: isoToIstInput(doc.scheduled_at) })
    setImage({ file: null, preview: doc.image_url, url: doc.image_url })
  })

  const needsTarget = draft.action !== 'none' && draft.action !== 'external_url'
  const targets = useResource<SelectOption[]>(() => loadTargets(draft.action), [draft.action])
  const targetName = targets.data?.find((t) => t.value === draft.targetId)?.label || draft.targetName

  const dirty = !!(draft.title || draft.message || image.file || draft.externalUrl) && !edit.loading
  useUnsavedChanges(dirty)
  // Free the preview when the tab goes away
  const previewRef = useRef<string | null>(null)
  previewRef.current = image.file ? image.preview : null
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current) }, [])

  const errors = useMemo(() => ({
    title: draft.title.trim() ? undefined : 'Enter a title',
    message: draft.message.trim() ? undefined : 'Enter a message',
    url: draft.action === 'external_url' ? (!draft.externalUrl.trim() ? 'Enter the link' : /^https?:\/\/\S+$/i.test(draft.externalUrl.trim()) ? undefined : 'Must be a full link starting with https://') : undefined,
    target: needsTarget && !draft.targetId ? 'Choose what to open' : undefined,
  }), [draft, needsTarget])
  const when = scheduleProblem(schedule)
  const problem = audienceProblem(audience) ?? errors.title ?? errors.message ?? errors.url ?? errors.target ?? when
  const shown = <T,>(v: T) => (showProblems ? v : undefined)
  const count = useAudienceCount(audience, 'push')

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) { toast.error('Only JPEG and PNG images are supported'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return }
    clearImage()
    setImage({ file, preview: URL.createObjectURL(file), url: null })
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!image.file) return image.url
    if (image.url) return image.url
    setUploading(true)
    try {
      const { uploadUrl, imageUrl } = unwrap(await notificationsService.getImageUploadUrl(image.file.type), 'The image could not be uploaded.')
      const res = await fetch(uploadUrl, { method: 'PUT', body: image.file, headers: { 'Content-Type': image.file.type } })
      if (!res.ok) throw new Error('The image could not be uploaded. Try again or remove it.')
      setImage((prev) => ({ ...prev, url: imageUrl }))
      return imageUrl
    } finally {
      setUploading(false)
    }
  }

  const linkData = (): Partial<PushPayload> => {
    switch (draft.action) {
      case 'theory_package': return { link_type: 'internal', internal_route: '/revision-series', internal_params: { packageId: draft.targetId } }
      case 'practical_package': return { link_type: 'internal', internal_route: '/practical-series', internal_params: { packageId: draft.targetId } }
      case 'ebook': return { link_type: 'internal', internal_route: '/ebook-store', internal_params: { bookId: draft.targetId } }
      case 'live_session': return { link_type: 'internal', internal_route: '/session/:id', internal_params: { id: draft.targetId } }
      case 'external_url': return { link_type: 'external', external_url: draft.externalUrl.trim() }
      default: return { link_type: 'none' }
    }
  }

  const openReview = () => {
    if (problem) { setShowProblems(true); toast.error(problem); return }
    setReview(true)
  }

  // Throws on failure, so the review stays open and the draft is kept
  const send = async () => {
    const imageUrl = await uploadImage()
    const payload: PushPayload = { title: draft.title.trim(), message: draft.message.trim(), ...linkData(), ...(imageUrl ? { image_url: imageUrl } : {}) }
    if (schedule.enabled) {
      const at = istInputToISO(schedule.at)
      if (edit.doc) unwrap(await notificationsService.cancelScheduledNotification(edit.doc._id), 'The old schedule could not be cancelled, so nothing was changed.')
      unwrap(await notificationsService.scheduleNotification({ channel: 'push', ...scheduleTarget(audience), scheduled_at: at, ...payload }), 'Failed to schedule notification')
      toast.success(`Notification scheduled for ${dayTimeIST(at)}`)
      reset(); onSent(true)
      return
    }
    if (edit.doc) unwrap(await notificationsService.cancelScheduledNotification(edit.doc._id), 'The old schedule could not be cancelled, so nothing was sent.')
    const res = audience.target === 'all' ? await notificationsService.sendToAll(payload)
      : audience.target === 'session' ? await notificationsService.sendToSession({ ...payload, session_id: audience.sessionId })
        : audience.target === 'specific' ? await notificationsService.sendToUsers({ ...payload, user_ids: audience.users.map((u) => u._id) })
          : audience.subjectScope === 'package' ? await notificationsService.sendToPackage({ ...payload, package_id: audience.packageId })
            : audience.subjectScope === 'series' ? await notificationsService.sendToSeries({ ...payload, series_id: audience.seriesId })
              : await notificationsService.sendToSubject({ ...payload, subject_id: audience.subjectId })
    const { sent, failed, total } = unwrap(res, 'Failed to send notification')
    toast.success(`Notification sent! ${sent}/${total} delivered${failed > 0 ? `, ${failed} failed` : ''}`)
    reset(); onSent(false)
  }
  const sendSafely = async () => { try { await send() } catch (err) { throw new Error(errText(err, 'Failed to send notification')) } }

  return (
    <>
      <ComposeFrame
        title="Send Push Notification"
        editing={editId ? { loading: edit.loading, error: edit.error, scheduledFor: edit.doc?.scheduled_at ?? null, onStop: () => { reset(); onStopEdit() } } : null}
        preview={<PushPreview title={draft.title} message={draft.message} image={image.preview} action={draft.action === 'none' ? null : draft.action === 'external_url' ? draft.externalUrl || 'A link' : targetName || 'A screen in the app'} />}
        status={`${describeAudience(audience, 'push')}${countText(count) ? ` · ${countText(count)}` : ''}`}
        problem={showProblems ? problem : audienceProblem(audience)}
        primaryLabel={schedule.enabled ? (edit.doc ? 'Save Schedule' : 'Schedule Notification') : 'Send Notification'}
        busyLabel={uploading ? 'Uploading image…' : null}
        onPrimary={openReview}
      >
        <Section title="Target Audience"><AudiencePicker idPrefix="push" value={audience} onChange={setAudience} /></Section>

        <Section title="Message">
          <div className="space-y-5">
            <Field id="notif-title" label="Title" required error={shown(errors.title)} aside={`${draft.title.length}/200`}>
              <Input placeholder="e.g. New Live Session Available!" value={draft.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} />
            </Field>
            <Field id="notif-message" label="Message" required error={shown(errors.message)} aside={`${draft.message.length}/1000`} hint={draft.message.length > 150 ? 'Phones usually cut a notification after about 150 characters.' : undefined}>
              <Textarea placeholder="e.g. Dr. Sharma is going live on Anatomy at 5 PM today. Don't miss it!" value={draft.message} onChange={(e) => set({ message: e.target.value })} maxLength={1000} rows={4} />
            </Field>

            <div>
              <p className="mb-1.5 text-[13px] font-medium">Image <span className="font-normal text-muted-foreground">(optional)</span></p>
              {image.preview ? (
                <div className="relative w-fit">
                  <img src={image.preview} alt="Chosen notification" className="h-32 w-auto max-w-full rounded-lg border border-border object-cover" />
                  <button type="button" onClick={clearImage} disabled={uploading} aria-label="Remove image" className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"><Trash2 aria-hidden="true" className="h-3 w-3" /></button>
                  {uploading && <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-ink/50"><Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-white" /></div>}
                </div>
              ) : (
                <button type="button" onClick={() => fileInput.current?.click()} className="flex h-28 w-48 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
                  <ImagePlus aria-hidden="true" className="h-7 w-7" /><span className="text-xs">Click to upload</span>
                </button>
              )}
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/jpg" onChange={pickImage} className="sr-only" tabIndex={-1} aria-label="Notification image" />
              <p className="mt-1.5 text-xs text-muted-foreground">Shown as a rich image in the push notification. Max 5MB, JPEG or PNG.</p>
            </div>

            <Field id="notif-action" label={<span className="inline-flex items-center gap-1.5"><MousePointerClick aria-hidden="true" className="h-3.5 w-3.5" />Click Action</span>} optional hint={ACTION_HINT[draft.action]}>
              <ActionSelect value={draft.action} onChange={(action) => set({ action, targetId: '', targetName: '', externalUrl: '' })} />
            </Field>
            {draft.action === 'external_url' && (
              <Field id="notif-external-url" label="External URL" required error={shown(errors.url)}><Input type="url" placeholder="https://..." value={draft.externalUrl} onChange={(e) => set({ externalUrl: e.target.value })} /></Field>
            )}
            {needsTarget && (
              <Field id="notif-target" label={draft.action === 'theory_package' ? 'Select Theory Package' : draft.action === 'practical_package' ? 'Select Practical Package' : draft.action === 'ebook' ? 'Select Book' : 'Select Live Session'} required error={shown(errors.target)}>
                <SearchSelect
                  value={draft.targetId} options={targets.data || []} loading={targets.loading} error={targets.error} onRetry={() => targets.reload()}
                  placeholder={draft.action === 'ebook' ? 'Select a book' : draft.action === 'live_session' ? 'Select a live session' : 'Select a package'}
                  emptyText={draft.action === 'ebook' ? 'No ebooks found' : draft.action === 'live_session' ? 'No upcoming or live sessions found' : 'No packages found'}
                  onChange={(id) => set({ targetId: id, targetName: targets.data?.find((t) => t.value === id)?.label ?? '' })}
                />
              </Field>
            )}
          </div>
        </Section>

        <ScheduleSection id="schedule-at" noun="Notification" value={schedule} onChange={setSchedule} problem={shown(when)} />
      </ComposeFrame>

      <ReviewDock
        open={review} onClose={() => setReview(false)} onConfirm={sendSafely} noun="notification" audience={describeAudience(audience, 'push')} count={count}
        scheduledAt={schedule.enabled && schedule.at ? istInputToISO(schedule.at) : null} replacing={!!edit.doc}
        rows={[
          { label: 'Title', value: <span className="font-medium">{draft.title}</span> },
          { label: 'Message', value: <span className="whitespace-pre-wrap">{draft.message}</span> },
          ...(image.preview ? [{ label: 'Image', value: 'Included' }] : []),
          { label: 'When tapped', value: draft.action === 'none' ? 'Opens the app' : draft.action === 'external_url' ? draft.externalUrl : targetName || 'A screen in the app' },
        ]}
      />
    </>
  )
}

function ActionSelect({ value, onChange, ...aria }: { value: ClickAction; onChange: (v: ClickAction) => void; id?: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ClickAction)}>
      <SelectTrigger {...aria}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No Action</SelectItem>
        <SelectItem value="external_url">External URL</SelectItem>
        <SelectItem value="theory_package">Open Theory Package</SelectItem>
        <SelectItem value="practical_package">Open Practical Package</SelectItem>
        <SelectItem value="ebook">Open Ebook Store</SelectItem>
        <SelectItem value="live_session">Open Live Session</SelectItem>
      </SelectContent>
    </Select>
  )
}

function PushPreview({ title, message, image, action }: { title: string; message: string; image: string | null; action: string | null }) {
  return (
    <Section title="Preview" description="How it looks on a phone.">
      <div className="rounded-2xl bg-rail p-4">
        <div className="rounded-xl bg-card p-3.5 shadow-raised">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span aria-hidden="true" className="flex h-4 w-4 items-center justify-center rounded bg-primary"><Bell className="h-2.5 w-2.5 text-primary-foreground" /></span>PGME<span className="ml-auto">now</span></p>
          <p className="mt-1.5 line-clamp-2 break-words text-sm font-semibold">{title || <span className="font-normal text-muted-foreground">Title</span>}</p>
          <p className="line-clamp-4 whitespace-pre-wrap break-words text-[13px]">{message || <span className="text-muted-foreground">Message</span>}</p>
          {image && <img src={image} alt="" className="mt-2.5 max-h-44 w-full rounded-lg object-cover" />}
        </div>
      </div>
      <p className="mt-3 break-words text-[13px] text-muted-foreground">{action ? <>When tapped it opens: <span className="font-medium text-foreground">{action}</span></> : 'When tapped it opens the app.'}</p>
    </Section>
  )
}
